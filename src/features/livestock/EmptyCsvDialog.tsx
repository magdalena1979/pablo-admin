import { useEffect, useRef } from "react"
import { FileWarning, X } from "lucide-react"
import "./empty-csv-dialog.css"

export function EmptyCsvDialog({names,hasOtherFiles,onClose,onChoose}:{names:string[];hasOtherFiles:boolean;onClose():void;onChoose():void}) {
  const ref=useRef<HTMLDialogElement>(null)
  useEffect(()=>{
    const previous=document.activeElement as HTMLElement|null
    const dialog=ref.current
    dialog?.showModal()
    return()=>{dialog?.close();previous?.focus()}
  },[])
  return <dialog ref={ref} className="empty-csv-dialog" aria-labelledby="empty-csv-title" aria-describedby="empty-csv-description" onCancel={event=>{event.preventDefault();onClose()}}>
    <div className="empty-csv-top"><div className="empty-csv-icon"><FileWarning size={24}/></div><button type="button" className="empty-csv-close" aria-label="Cerrar aviso" onClick={onClose}><X size={18}/></button></div>
    <h2 id="empty-csv-title">{names.length===1?"Archivo sin animales":"Archivos sin animales"}</h2>
    <p id="empty-csv-description">{hasOtherFiles?"Omitimos los archivos vacíos. Los demás están listos para revisar.":"Este CSV está vacío. Seleccioná otro archivo para importar la sesión."}</p>
    <ul>{names.map((name,index)=><li key={`${name}:${index}`}>{name}</li>)}</ul>
    <div className="empty-csv-actions"><button type="button" className="empty-csv-cancel" onClick={onClose}>Cancelar</button><button type="button" className="primary-button" autoFocus onClick={hasOtherFiles?onClose:onChoose}>{hasOtherFiles?"Continuar":"Elegir otro CSV"}</button></div>
  </dialog>
}
