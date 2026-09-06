export type SystemField = "ignore"|"tagNumber"|"electronicId"|"eventDate"|"weight"|"previousWeight"|"bodyConditionScore"|"notes"|"draftGroup"|"pregnancyStatus"|"breed"|"sex"|"treatment"|"dose"|"doseUnit"|"eventType"|"operator"|"days"|"weightGain"|"adg"
export interface FieldDefinition { key:SystemField; label:string; kind:"text"|"number"|"date"|"identifier"; aliases:string[] }
export const FIELD_CATALOG:FieldDefinition[]=[
 {key:"ignore",label:"Ignorar esta columna",kind:"text",aliases:[]},
 {key:"electronicId",label:"Caravana electrónica (EID)",kind:"identifier",aliases:["electronic id","eid","rfid","electronicid","full rfid"]},
 {key:"tagNumber",label:"Caravana visual",kind:"identifier",aliases:["tag number","visual id","tag","caravana","visualid","vid"]},
 {key:"eventDate",label:"Fecha del registro",kind:"date",aliases:["date","event date","datetime","fecha","fecha evento"]},
 {key:"weight",label:"Peso actual (kg)",kind:"number",aliases:["weight","weight (kg)","live weight (kg)","peso","peso (kg)"]},
 {key:"previousWeight",label:"Peso anterior (kg)",kind:"number",aliases:["previous weight","previous weight (kg)","peso anterior","peso anterior (kg)"]},
 {key:"bodyConditionScore",label:"Condición corporal",kind:"number",aliases:["condition score","body condition score","bcs","condición corporal","condicion corporal"]},
 {key:"notes",label:"Observaciones",kind:"text",aliases:["notes","note","observaciones","comentarios"]},
 {key:"draftGroup",label:"Rodeo / grupo",kind:"text",aliases:["draft group","group","herd","rodeo","grupo"]},
 {key:"pregnancyStatus",label:"Estado reproductivo",kind:"text",aliases:["pregnancy status","pregnancy","estado reproductivo","preñez","prenez"]},
 {key:"breed",label:"Raza",kind:"text",aliases:["breed","raza"]},
 {key:"sex",label:"Sexo",kind:"text",aliases:["sex","sexo","gender"]},
 {key:"treatment",label:"Tratamiento / producto",kind:"text",aliases:["treatment","tratamiento","product","producto"]},
 {key:"dose",label:"Dosis",kind:"number",aliases:["dose","dosis"]},
 {key:"doseUnit",label:"Unidad de dosis",kind:"text",aliases:["dose unit","unidad dosis","dose uom"]},
 {key:"eventType",label:"Tipo de evento",kind:"text",aliases:["event type","tipo de evento","action","acción","accion"]},
 {key:"operator",label:"Responsable / operador",kind:"text",aliases:["operator","operador","responsable"]},
 {key:"days",label:"Días",kind:"number",aliases:["days","dias","días"]},
 {key:"weightGain",label:"Ganancia de peso",kind:"number",aliases:["weight gain","weight gain (kg)","ganancia","ganancia (kg)"]},
 {key:"adg",label:"Ganancia diaria",kind:"number",aliases:["adg","adg (kg/day)","average daily gain (kg/d)","overall daily gain (kg/d)","gdp","gdp (kg/día)"]},
]
export const IMPORTABLE_FIELDS=FIELD_CATALOG.filter(field=>field.key!=="ignore")
export function normalizeHeader(value:string){return value.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[_-]+/g," ").replace(/\s+/g," ")}
export function suggestField(header:string):SystemField{const normalized=normalizeHeader(header);return FIELD_CATALOG.find(field=>field.aliases.some(alias=>normalizeHeader(alias)===normalized))?.key??"ignore"}
