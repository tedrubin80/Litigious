/**
 * Minimal RFC4180-ish CSV parser for vendor export files.
 */
const parseCsv = (buffer, { delimiter = ',', headers = true } = {}) => {
  const text = Buffer.isBuffer(buffer) ? buffer.toString('utf8') : String(buffer);
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter((l) => l.trim());
  if (lines.length === 0) return [];

  const splitLine = (line) => {
    const out = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === delimiter && !inQuotes) {
        out.push(cur.trim());
        cur = '';
      } else {
        cur += ch;
      }
    }
    out.push(cur.trim());
    return out;
  };

  const headerRow = headers ? splitLine(lines[0]) : null;
  const dataLines = headers ? lines.slice(1) : lines;

  return dataLines.map((line) => {
    const cols = splitLine(line);
    if (!headerRow) return cols;
    const row = {};
    headerRow.forEach((key, idx) => {
      row[key.trim()] = cols[idx] ?? '';
    });
    return row;
  });
};

module.exports = { parseCsv };
