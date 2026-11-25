// How the user's Saved Foods and Saved Meals are listed and searched by name

// The order of a list: a MongoDB collation, and the same for what's already read
export const BY_NAME = { locale: "en", strength: 2 };
export const byName = (a: { name: string }, b: { name: string }) =>
  a.name.localeCompare(b.name, "en", { sensitivity: "accent" });

export const SEARCH_LIMIT = 10;
const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// A name with every word of the search in it, whatever the case
export function nameMatches(query: string) {
  const words = query.trim().split(/\s+/).filter(Boolean);
  return { $and: words.map((word) => ({ name: { $regex: escapeRegExp(word), $options: "i" } })) };
}
