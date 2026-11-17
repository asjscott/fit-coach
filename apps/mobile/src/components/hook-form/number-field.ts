// Text-like characters a number field can pass through while the user is still typing
const isPartialNumber = (text: string) => text.endsWith(".") || text === "-";

// A number field's typed text as the form's value: a number, text while a number is still being typed, or null
// once emptied. Not undefined: react-hook-form reads that as unset and shows the field's default value again (#154)
export function numberFieldValue(text: string) {
  if (text === "") return null;
  const parsed = Number(text);
  return Number.isFinite(parsed) && !isPartialNumber(text) ? parsed : text;
}
