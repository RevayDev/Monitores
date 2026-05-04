export const splitHighlightedText = (text = '', query = '') => {
  const source = String(text || '');
  const q = String(query || '').trim();
  if (!q) return [{ text: source, match: false }];
  const lower = source.toLowerCase();
  const needle = q.toLowerCase();
  const parts = [];
  let index = 0;
  while (index < source.length) {
    const found = lower.indexOf(needle, index);
    if (found === -1) {
      parts.push({ text: source.slice(index), match: false });
      break;
    }
    if (found > index) parts.push({ text: source.slice(index, found), match: false });
    parts.push({ text: source.slice(found, found + q.length), match: true });
    index = found + q.length;
  }
  return parts.filter((part) => part.text.length > 0);
};
