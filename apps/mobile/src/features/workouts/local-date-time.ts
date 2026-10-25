// A moment as the web's date and time inputs show and return it, in local time: "2026-10-24" and "09:30"

const pad = (n: number) => String(n).padStart(2, "0");

export const localDateText = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export const localTimeText = (date: Date) => `${pad(date.getHours())}:${pad(date.getMinutes())}`;

// The same time of day on another date, or null when the text isn't a real date (a cleared input gives "")
export function withLocalDate(moment: Date, text: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (!match) return null;
  const [year, month, day] = match.slice(1).map(Number);
  const moved = new Date(moment);
  moved.setFullYear(year, month - 1, day);
  const isReal = moved.getFullYear() === year && moved.getMonth() === month - 1 && moved.getDate() === day;
  return isReal ? moved : null;
}

// Another time on the same date, to the minute, or null when the text isn't a real time
export function withLocalTime(moment: Date, text: string): Date | null {
  const match = /^(\d{2}):(\d{2})$/.exec(text);
  if (!match) return null;
  const [hours, minutes] = match.slice(1).map(Number);
  if (hours > 23 || minutes > 59) return null;
  const moved = new Date(moment);
  moved.setHours(hours, minutes, 0, 0);
  return moved;
}
