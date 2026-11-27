import { useEffect, useId, useRef } from "react"

export function CsvReviewProgressDialog({ progress, cancelling, onCancel }: {
  progress: string
  cancelling: boolean
  onCancel(): void
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    dialog?.showModal()
    return () => dialog?.close()
  }, [])

  return <dialog ref={dialogRef} className="dialog-card csv-review-dialog" aria-labelledby={titleId}
    onCancel={event => { event.preventDefault(); if (!cancelling) onCancel() }}>
    <div className="dialog-header">
      <h2 id={titleId}>Revisando archivos CSV</h2>
    </div>
    <progress aria-label="Revisión de archivos en curso"/>
    <p role="status">{cancelling ? "Cancelando la revisión…" : progress}</p>
    <div className="dialog-actions">
      <button type="button" className="secondary-button" disabled={cancelling} onClick={onCancel}>
        Cancelar revisión
      </button>
    </div>
  </dialog>
}
