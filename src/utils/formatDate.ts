export function formatEventDate(dateInput: string | Date) {
  const date = typeof dateInput === 'string'
    ? new Date(dateInput)
    : dateInput;

  const formatter = new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });

  return formatter.format(date);
}