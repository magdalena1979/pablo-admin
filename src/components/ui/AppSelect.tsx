import { useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type SelectHTMLAttributes } from "react"
import { Check, ChevronDown } from "lucide-react"
import "./app-select.css"

type Option = { index: number; label: string; disabled: boolean }

export function AppSelect({ children, className, id, disabled, required, value, defaultValue, onChange, "aria-label": ariaLabel, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  const select = useRef<HTMLSelectElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const popup = useRef<HTMLDialogElement>(null)
  const list = useRef<HTMLDivElement>(null)
  const popupId = useId()
  const typed = useRef({ value: "", at: 0 })
  const backdropPress = useRef(false)
  const [label, setLabel] = useState("")
  const [selection, setSelection] = useState({ index: -1, text: "" })
  const [options, setOptions] = useState<Option[]>([])
  const [open, setOpen] = useState(false)
  const [invalid, setInvalid] = useState(false)

  function syncSelection() {
    const current = select.current
    if (!current) return
    const index = current.selectedIndex
    const text = current.options[index]?.label ?? ""
    setSelection(previous => previous.index === index && previous.text === text ? previous : { index, text })
    if (current.validity.valid) setInvalid(false)
  }

  useLayoutEffect(() => {
    syncSelection()
    if (ariaLabel) return
    const explicit = trigger.current?.labels?.[0]
    const fieldLabel = explicit && Array.from(explicit.childNodes)
      .filter(node => node !== trigger.current?.parentElement)
      .map(node => node.textContent).join("").trim()
    setLabel(fieldLabel || "")
  }, [children, value, defaultValue, ariaLabel])

  useLayoutEffect(() => {
    const dialog = popup.current
    if (!open || !dialog || !trigger.current) return
    const bounds = trigger.current.getBoundingClientRect()
    const width = Math.min(Math.max(bounds.width, 220), window.innerWidth - 16)
    const left = Math.min(bounds.left, window.innerWidth - width - 8)
    dialog.style.setProperty("--select-width", `${width}px`)
    dialog.style.setProperty("--select-left", `${Math.max(8, left)}px`)
    const roomBelow = window.innerHeight - bounds.bottom - 12
    const roomAbove = bounds.top - 12
    const above = roomBelow < 240 && roomAbove > roomBelow
    dialog.style.setProperty("--select-top", above ? "auto" : `${bounds.bottom + 4}px`)
    dialog.style.setProperty("--select-bottom", above ? `${window.innerHeight - bounds.top + 4}px` : "auto")
    dialog.style.setProperty("--select-max-height", `${Math.max(100, Math.min(360, above ? roomAbove : roomBelow))}px`)
    dialog.showModal()
    const initial = list.current?.querySelector<HTMLButtonElement>('button[aria-selected="true"]:not(:disabled)')
      ?? list.current?.querySelector<HTMLButtonElement>("button:not(:disabled)")
    initial?.focus()
    return () => {
      dialog.close()
      if (trigger.current?.isConnected) trigger.current.focus({ preventScroll: true })
    }
  }, [open])

  function openOptions() {
    if (!select.current || trigger.current?.matches(":disabled")) return
    setOptions(Array.from(select.current.options, (item, index) => ({
      index, label: item.label, disabled: item.disabled || Boolean(item.closest("optgroup:disabled")),
    })))
    typed.current = { value: "", at: 0 }
    backdropPress.current = false
    setOpen(true)
  }

  function choose(index: number) {
    const current = select.current
    if (current && current.selectedIndex !== index) {
      current.selectedIndex = index
      current.dispatchEvent(new Event("change", { bubbles: true }))
      syncSelection()
    }
    setOpen(false)
  }

  function navigate(event: KeyboardEvent<HTMLDialogElement>) {
    const buttons = Array.from(list.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? [])
    if (!buttons.length) return
    const current = buttons.indexOf(document.activeElement as HTMLButtonElement)
    if (["ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) {
      event.preventDefault()
      const index = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 :
        Math.max(0, Math.min(buttons.length - 1, current + (event.key === "ArrowDown" ? 1 : -1)))
      buttons[index]?.focus()
    } else if (event.key.length === 1 && event.key !== " " && !event.altKey && !event.ctrlKey && !event.metaKey) {
      const now = Date.now()
      const value = (now - typed.current.at < 700 ? typed.current.value : "") + event.key.toLocaleLowerCase("es-AR")
      typed.current = { value, at: now }
      buttons.find(button => button.textContent?.trim().toLocaleLowerCase("es-AR").startsWith(value))?.focus()
    }
  }

  const fieldName = ariaLabel || label || "Seleccionar opción"
  function isBackdropClick(dialog: HTMLDialogElement, x: number, y: number) {
    const bounds = dialog.getBoundingClientRect()
    return x < bounds.left || x > bounds.right || y < bounds.top || y > bounds.bottom
  }

  return <span className="app-select">
    <button ref={trigger} id={id} type="button" className={`app-select-trigger${className ? ` ${className}` : ""}`}
      disabled={disabled} aria-label={`${fieldName}: ${selection.text || "Sin selección"}`}
      aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? popupId : undefined}
      aria-invalid={invalid || undefined} aria-describedby={invalid ? `${popupId}-error` : undefined} onClick={openOptions}
      onKeyDown={event => { if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); openOptions() } }}>
      <span>{selection.text || "Seleccionar"}</span><ChevronDown size={15} aria-hidden="true"/>
    </button>
    <select {...props} ref={select} hidden tabIndex={-1} aria-hidden="true" disabled={disabled}
      required={required} value={value} defaultValue={defaultValue} onChange={onChange}
      onInvalid={event => { event.preventDefault(); setInvalid(true); trigger.current?.focus() }}>{children}</select>
    {invalid && <small className="app-select-error" id={`${popupId}-error`}>Elegí una opción.</small>}
    {open && <dialog ref={popup} className="app-select-popup" aria-label={fieldName}
      onCancel={event => { event.preventDefault(); event.stopPropagation(); setOpen(false) }} onKeyDown={navigate}
      onPointerDown={event => {
        backdropPress.current = event.target === event.currentTarget &&
          isBackdropClick(event.currentTarget, event.clientX, event.clientY)
      }}
      onClick={event => {
        if (backdropPress.current && event.target === event.currentTarget &&
          isBackdropClick(event.currentTarget, event.clientX, event.clientY)) setOpen(false)
        backdropPress.current = false
      }}>
      <div className="app-select-popup-inner">
        <div id={popupId} ref={list} className="app-select-options" role="listbox" aria-label={fieldName}>
          {options.map(option => <button type="button" key={option.index} role="option" disabled={option.disabled}
            aria-selected={option.index === selection.index} onClick={() => choose(option.index)}>
            <span>{option.label}</span>{option.index === selection.index && <Check size={16} aria-hidden="true"/>}
          </button>)}
        </div>
      </div>
    </dialog>}
  </span>
}
