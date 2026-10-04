import {spokenTerm, type Word} from './vocabulary';

export type MatchDeck = {seen: string[]; current: string[]; matched: string[]; attempts: number};
export function shuffle<T>(items: T[]): T[] {
 const result = [...items];
 for (let i = result.length - 1; i > 0; i--) {
  const j = Math.floor(Math.random() * (i + 1));
  [result[i], result[j]] = [result[j], result[i]];
 }
 return result;
}
const normalize = (text: string) => text.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();

// Duplicate terms/meanings belong in separate rounds, never silently omitted.
export function nextMatchRound(words: Word[], previous?: MatchDeck): MatchDeck {
 const valid = new Set(words.map(w => w.id));
 let seen = new Set(previous?.seen.filter(id => valid.has(id)) ?? []);
 let available = words.filter(w => !seen.has(w.id));
 if (!available.length) { seen = new Set(); available = words; }
 const terms = new Set<string>(), meanings = new Set<string>(), current: string[] = [];
 for (const word of shuffle(available)) {
  const term = normalize(spokenTerm(word.term)), meaning = normalize(word.meaning);
  if (terms.has(term) || meanings.has(meaning)) continue;
  current.push(word.id); seen.add(word.id); terms.add(term); meanings.add(meaning);
  if (current.length === 5) break;
 }
 return {seen: [...seen], current, matched: [], attempts: 0};
}

export function restoreMatchDeck(words: Word[], saved: unknown): MatchDeck {
 const valid = new Set(words.map(w => w.id));
 const record = saved && typeof saved === 'object' ? saved as Partial<MatchDeck> : {};
 const ids = (value: unknown) => Array.isArray(value) ? [...new Set(value.filter((id): id is string => typeof id === 'string' && valid.has(id)))] : [];
 const current = ids(record.current).slice(0, 5);
 const seen = [...new Set([...ids(record.seen), ...current])];
 if (!current.length) return nextMatchRound(words, {seen, current: [], matched: [], attempts: 0});
 return {seen, current, matched: ids(record.matched).filter(id => current.includes(id)), attempts: Number.isSafeInteger(record.attempts) && record.attempts! >= 0 ? record.attempts! : 0};
}
