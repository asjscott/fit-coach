// The local date (YYYY-MM-DD) in a timezone, so many days before today
export const localDate = (timeZone: string, daysBefore = 0) =>
  new Intl.DateTimeFormat("en-CA", { timeZone, dateStyle: "short" }).format(
    new Date(Date.now() - daysBefore * 24 * 60 * 60 * 1000),
  );
