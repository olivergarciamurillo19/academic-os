/**
 * Formats a date-ISO in Spanish with relative hints:
 *   "Hoy · 09:00", "Mañana · 11:00", "Vie 24 abr · 12:00"
 */
export function formatSubjectEvent(
  whenISO: string,
  now: Date = new Date(),
): { label: string; dateTime: string } {
  const date = new Date(whenISO);
  const sameDay = isSameDay(date, now);
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const isTomorrow = isSameDay(date, tomorrow);

  const time = new Intl.DateTimeFormat("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);

  const day = new Intl.DateTimeFormat("es-ES", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(date);

  const prefix = sameDay ? "Hoy" : isTomorrow ? "Mañana" : day;
  return { label: `${prefix} · ${time}`, dateTime: date.toISOString() };
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
