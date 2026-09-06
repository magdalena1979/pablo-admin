import type { ParsedCsv } from "@/features/livestock/import-engine/parser"
import { normalizeEid, parseEventDate } from "@/features/livestock/import-engine/validator"
import type { AnimalHistoryRecord, GallagherExternalEvent } from "@/features/livestock/import-engine/gallagher-animal-history"

const pregnancyValues:Record<string,string>={CABEZA:"preñada",VACIA:"vacia"}
const baseHeaders=new Set(["VID","EID","Date","Time","Draft","Notes","Live Weight (kg)","Average Daily Gain (kg/d)","Overall Daily Gain (kg/d)","Condition","Dam Vid","Dam Eid","Status"])
const summaryLabels=new Set(["TOTAL HEAD","TOTAL WEIGHT","AVERAGE WEIGHT","MINIMUM WEIGHT","MAXIMUM WEIGHT","ADG"])
function canonical(value:string){return value.trim().normalize("NFD").replace(/[\u0300-\u036f]/g,"").toUpperCase().replace(/\s+/g," ")}
function number(value:string){if(!value.trim()||value.trim()==="--.--")return null;const parsed=Number(value.replace(",","."));return Number.isFinite(parsed)?parsed:null}
function fingerprint(eid:string,type:string,date:string,session:string,value:string){return["gallagher",eid,type,date,canonical(session),canonical(value)].join("|")}

export function isGallagherSessionExport(document:ParsedCsv){return document.headers.includes("EID")&&document.headers.includes("Date")&&document.headers.includes("Time")&&document.headers.includes("VID")}
export function isSessionSummaryRow(raw:Record<string,string>){const eid=normalizeEid(raw.EID??"");return summaryLabels.has(canonical(raw.EID??""))||(!(raw.VID??"").trim()&&!/^\d{10,}$/.test(eid))}

export function adaptGallagherSessionExport(document:ParsedCsv):AnimalHistoryRecord[]{
 const sessionName=document.filename.replace(/\.csv$/i,"").trim()
 return document.rows.flatMap((raw,index)=>{
  if(isSessionSummaryRow(raw))return[]
  const eidRaw=(raw.EID??"").trim(),eid=normalizeEid(eidRaw),tag=(raw.VID??"").trim(),eventDate=parseEventDate(`${raw.Date??""} ${raw.Time??""}`.trim()),events:GallagherExternalEvent[]=[],uninterpreted:Array<{field:string;value:string}>=[]
  if(!eid&&!tag)return[]
  if(eventDate)events.push({eventType:"lectura",value:null,eventDate,fingerprint:fingerprint(eid||`TAG:${tag}`,"lectura",eventDate,sessionName,"scan"),notes:null,externalSessionName:sessionName,metadata:{gallagher_field:"Date + Time",date_source:"Date + Time",external_session_name:sessionName},status:"NUEVO"})
  const note=(raw.Notes??"").trim();if(note&&eventDate)events.push({eventType:"nota",value:note,eventDate,fingerprint:fingerprint(eid||`TAG:${tag}`,"nota",eventDate,sessionName,note),notes:note,externalSessionName:sessionName,metadata:{gallagher_field:"Notes",gallagher_value:note,date_source:"Date + Time",external_session_name:sessionName},status:"NUEVO"})
  const weight=number(raw["Live Weight (kg)"]??"");if(weight!==null&&eventDate)events.push({eventType:"pesaje",value:String(weight),eventDate,fingerprint:fingerprint(eid||`TAG:${tag}`,"pesaje",eventDate,sessionName,String(weight)),notes:null,externalSessionName:sessionName,metadata:{gallagher_field:"Live Weight (kg)",gallagher_value:raw["Live Weight (kg)"],weight_kg:weight,date_source:"Date + Time",external_session_name:sessionName},status:"NUEVO"})
  const condition=number(raw.Condition??"");if(condition!==null&&eventDate)events.push({eventType:"condicion_corporal",value:String(condition),eventDate,fingerprint:fingerprint(eid||`TAG:${tag}`,"condicion_corporal",eventDate,sessionName,String(condition)),notes:null,externalSessionName:sessionName,metadata:{gallagher_field:"Condition",gallagher_value:raw.Condition,score:condition,date_source:"Date + Time",external_session_name:sessionName},status:"NUEVO"})
  const gestation=(raw.GESTACION??"").trim(),normalized=pregnancyValues[canonical(gestation)];if(gestation&&normalized&&eventDate)events.push({eventType:"estado_reproductivo",value:normalized,eventDate,fingerprint:fingerprint(eid||`TAG:${tag}`,"estado_reproductivo",eventDate,sessionName,normalized),notes:null,externalSessionName:sessionName,metadata:{gallagher_field:"GESTACION",gallagher_value:gestation,date_source:"Date + Time",external_session_name:sessionName},status:"NUEVO"});else if(gestation&&!normalized)uninterpreted.push({field:"GESTACION",value:gestation})
  for(const header of document.headers){const value=(raw[header]??"").trim();if(value&&!baseHeaders.has(header)&&header!=="GESTACION")uninterpreted.push({field:header,value})}
  const uniqueEvents=[...new Map(events.map(event=>[event.fingerprint,event])).values()],uniqueUninterpreted=[...new Map(uninterpreted.map(item=>[`${item.field}|${item.value}`,item])).values()]
  return[{rowNumber:index+2,tagNumber:tag,electronicIdRaw:eidRaw,electronicId:eid,eventDate,draftGroup:(raw.Draft??"").trim(),notes:note,raw:{...raw,externalEvents:uniqueEvents,uninterpretedValues:uniqueUninterpreted,gallagherExportType:"session_export"},detectedEventTypes:[...new Set(uniqueEvents.map(event=>event.eventType))],externalEvents:uniqueEvents,uninterpretedValues:uniqueUninterpreted}]
 })
}
