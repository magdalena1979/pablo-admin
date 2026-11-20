import type { CsvFileReview } from "../../services/gallagher-csv-preview.service"
import type { CsvConfirmationResult } from "../../services/gallagher-csv-confirm.service"
export interface CsvBatchReport { saved:number; alreadyImported:number; failed:number; pending:number; stopped:boolean }
export async function runCsvBatch(files:CsvFileReview[],options:{
  confirm(file:CsvFileReview):Promise<CsvConfirmationResult>
  progress(file:CsvFileReview,index:number,total:number):void
  success(file:CsvFileReview,result:CsvConfirmationResult):void
  failure(file:CsvFileReview,message:string):void
  shouldStop():boolean
}):Promise<CsvBatchReport>{
  const report:CsvBatchReport={saved:0,alreadyImported:0,failed:0,pending:files.length,stopped:false}
  for(const [index,file] of files.entries()){
    if(options.shouldStop()){report.stopped=true;break}
    options.progress(file,index+1,files.length)
    let result:CsvConfirmationResult
    try{result=await options.confirm(file)}
    catch(cause){
      const message=cause&&typeof cause==="object"&&"message" in cause?String(cause.message):"No pudimos confirmar el archivo."
      options.failure(file,message);report.failed++;report.pending--
      // Business conflicts belong to one file. A connection, permission or
      // missing-function failure stops new requests; committed files are kept.
      const code=cause&&typeof cause==="object"&&"code" in cause?String(cause.code):""
      if(!["P0001","23505","23514","22007","22008"].includes(code)){report.stopped=true;break}
      continue
    }
    options.success(file,result)
    if(result.already_imported)report.alreadyImported++;else report.saved++
    report.pending--
  }
  return report
}
