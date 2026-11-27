const argentinaDay = new Intl.DateTimeFormat("es-AR", {
  timeZone: "America/Argentina/Buenos_Aires",
})

export function formatLivestockDate(value: string | null | undefined): string {
  const calendarDate = value?.match(/^(\d{4}-\d{2}-\d{2})(?:$|T| )/)?.[1]
  if (!calendarDate) return "Fecha sin registrar"
  const date = new Date(calendarDate + "T12:00:00Z")
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== calendarDate) {
    return "Fecha sin registrar"
  }
  return argentinaDay.format(date)
}
