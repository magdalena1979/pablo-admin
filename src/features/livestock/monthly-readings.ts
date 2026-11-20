export interface MonthlyReading {id:string;animalId:string;date:string;month:string;filename:string;fields:Record<string,string>}
export function readingMonth(value:string):string{
 const parts=new Intl.DateTimeFormat("en",{timeZone:"America/Argentina/Buenos_Aires",year:"numeric",month:"2-digit"}).formatToParts(new Date(value))
 return `${parts.find(part=>part.type==="year")!.value}-${parts.find(part=>part.type==="month")!.value}`
}
export function groupMonthlyReadings(readings:MonthlyReading[]){
 const grouped:Record<string,Record<string,MonthlyReading[]>>={}
 for(const reading of [...readings].sort((a,b)=>a.date.localeCompare(b.date))){
  const animal=grouped[reading.animalId]??={}
  ;(animal[reading.month]??=[]).push(reading)
 }
 return grouped
}
