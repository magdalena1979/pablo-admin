import type { ParsedCsv } from "@/features/livestock/import-engine/parser"
import { normalizeEid, parseEventDate } from "@/features/livestock/import-engine/validator"

export type ExternalEventStatus="NUEVO"|"EXISTENTE"|"NO_INTERPRETADO"|"ERROR"
export interface GallagherExternalEvent{eventType:string;value:string|null;eventDate:string;fingerprint:string;notes:string|null;externalSessionName:string|null;metadata:Record<string,unknown>;status:ExternalEventStatus}
export interface AnimalHistoryRecord{rowNumber:number;tagNumber:string;electronicIdRaw:string;electronicId:string;eventDate:string;draftGroup:string;notes:string;raw:Record<string,unknown>;detectedEventTypes:string[];externalEvents:GallagherExternalEvent[];uninterpretedValues:Array<{field:string;value:string}>}

const pregnancyValues:Record<string,string>={CABEZA:"preñada",VACIA:"vacia"}
const pregnancyDateHeaders=["When GESTACION Recorded","GESTACION Date","GESTACION Date Recorded"]
const standardHeaders=new Set(["Tag Number","Electronic ID","NLIS","Global ID","PIC","Date of Birth","Sex","Breed","Colour","Sire VID","Sire EID","Dam VID","Dam EID","Donor Dam VID","Donor Dam EID","Group","Overall ADG","Trait Name","Trait Value","Trait ADG","When Trait Recorded","Trait In Session","Trait Scanned In Session","Activity Name","When Activity Measured","Activity In Session","Activity Scanned In Session","Treatment Name","Treatment Dosage","Treatment Batch","Treatment Expiry","Treatment Treated","Treatment Value","When Treatment Measured","Treatment In Session","Treatment Scanned In Session","Note","When Note Measured","Note In Session","Note Scanned In Session","Animal Scanned In Sessions","When Animal Scanned In Session","Event Type","When Event Created","Event In Session","Event Notes","Event Gross Amount","Event Net Amount","Farm","Property","Area","PIC Date Updated","Date of Birth Date Updated","Sex Date Updated","Breed Date Updated","Colour Date Updated","Sire Date Updated","Dam Date Updated","Group Date Updated","Donor Dam Date Updated","Farm Date Updated","Property Date Updated","Area Date Updated","Full RFID","Full RFID Date Updated"])

export function isGallagherAnimalHistory(document:ParsedCsv){return document.headers.includes("Animal Scanned In Sessions")&&document.headers.includes("When Animal Scanned In Session")&&document.headers.includes("Note In Session")}
function canonical(value:string){return value.trim().normalize("NFD").replace(/[\u0300-\u036f]/g,"").toUpperCase().replace(/\s+/g," ")}
function fingerprint(eid:string,type:string,date:string,session:string,value:string){return["gallagher",eid,type,date,canonical(session),canonical(value)].join("|")}

export function adaptGallagherAnimalHistory(document:ParsedCsv):AnimalHistoryRecord[]{
 const grouped=new Map<string,Array<{raw:Record<string,string>;rowNumber:number}>>()
 document.rows.forEach((raw,index)=>{const eid=normalizeEid(raw["Electronic ID"]??""),tag=(raw["Tag Number"]??"").trim(),key=eid||`TAG:${tag}`;if(!key)return;grouped.set(key,[...(grouped.get(key)??[]),{raw,rowNumber:index+2}] )})
 return [...grouped.values()].map(entries=>{
  const scanned=entries.find(({raw})=>Boolean(raw["When Animal Scanned In Session"]?.trim())),representative=scanned??entries[0]
  const eidRaw=representative.raw["Electronic ID"]??"",eid=normalizeEid(eidRaw),tag=(representative.raw["Tag Number"]??"").trim(),events:GallagherExternalEvent[]=[],uninterpreted:Array<{field:string;value:string}>=[]
  for(const{raw}of entries){
   const scanDate=parseEventDate(raw["When Animal Scanned In Session"]??""),scanSession=(raw["Animal Scanned In Sessions"]??"").trim()
   if(scanDate)events.push({eventType:"lectura",value:null,eventDate:scanDate,fingerprint:fingerprint(eid||`TAG:${tag}`,"lectura",scanDate,scanSession,"scan"),notes:null,externalSessionName:scanSession||null,metadata:{gallagher_field:"Animal Scanned In Sessions",date_source:"When Animal Scanned In Session",external_session_name:scanSession||null},status:"NUEVO"})
   const note=(raw.Note??"").trim(),noteDate=parseEventDate(raw["When Note Measured"]??""),noteSession=(raw["Note In Session"]??"").trim()
   if(note&&noteDate)events.push({eventType:"nota",value:note,eventDate:noteDate,fingerprint:fingerprint(eid||`TAG:${tag}`,"nota",noteDate,noteSession,note),notes:note,externalSessionName:noteSession||null,metadata:{gallagher_field:"Note",gallagher_value:note,date_source:"When Note Measured",external_session_name:noteSession||null},status:"NUEVO"})
   const gestation=(raw.GESTACION??"").trim(),session=(raw["Animal Scanned In Sessions"]??raw["Note In Session"]??"").trim(),normalized=pregnancyValues[canonical(gestation)],explicitDateHeader=pregnancyDateHeaders.find(header=>parseEventDate(raw[header]??"")),gestationDate=explicitDateHeader?parseEventDate(raw[explicitDateHeader]??""):scanDate,dateSource=explicitDateHeader??"When Animal Scanned In Session"
   if(gestation&&gestationDate&&normalized)events.push({eventType:"estado_reproductivo",value:normalized,eventDate:gestationDate,fingerprint:fingerprint(eid||`TAG:${tag}`,"estado_reproductivo",gestationDate,session,normalized),notes:null,externalSessionName:session||null,metadata:{gallagher_field:"GESTACION",gallagher_value:gestation,date_source:dateSource,external_session_name:session||null},status:"NUEVO"})
   else if(gestation&&!normalized)uninterpreted.push({field:"GESTACION",value:gestation})
   for(const header of document.headers){const value=(raw[header]??"").trim();if(value&&!standardHeaders.has(header)&&header!=="GESTACION"&&!pregnancyDateHeaders.includes(header))uninterpreted.push({field:header,value})}
  }
  const uniqueEvents=[...new Map(events.map(event=>[event.fingerprint,event])).values()],uniqueUninterpreted=[...new Map(uninterpreted.map(item=>[`${item.field}|${item.value}`,item])).values()],eventDate=parseEventDate(representative.raw["When Animal Scanned In Session"]??"")
  return{rowNumber:representative.rowNumber,tagNumber:tag,electronicIdRaw:eidRaw,electronicId:eid,eventDate,draftGroup:(representative.raw.Group??"").trim(),notes:"",raw:{...representative.raw,externalEvents:uniqueEvents,uninterpretedValues:uniqueUninterpreted,gallagherExportType:"animal_history"},detectedEventTypes:["lectura",...new Set(uniqueEvents.map(event=>event.eventType))],externalEvents:uniqueEvents,uninterpretedValues:uniqueUninterpreted}
 })
}
