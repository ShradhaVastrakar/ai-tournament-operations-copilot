import type { JSX } from 'react';

// Small markdown renderer for assistant answers: paragraphs, lists, headings, tables,
// **bold** and `code`. Intentionally minimal; no HTML is ever injected.

const LIST_ITEM = /^\s*(?:[-*•]|\d+[.)])\s+/;
const HEADING = /^#{1,4}\s+/;
const TABLE_SEPARATOR = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/;

function inline(text: string): JSX.Element[] {
  return text
    .split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
    .filter(Boolean)
    .map((part, i) => {
      if (part.length > 4 && part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} className="font-semibold text-white">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.length > 2 && part.startsWith('`') && part.endsWith('`')) {
        return (
          <code key={i} className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[0.85em] text-emerald-200">
            {part.slice(1, -1)}
          </code>
        );
      }
      return <span key={i}>{part}</span>;
    });
}

function cells(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((c) => c.trim());
}

function startsTable(lines: string[], i: number): boolean {
  return lines[i].includes('|') && i + 1 < lines.length && TABLE_SEPARATOR.test(lines[i + 1]);
}

export default function Markdown({ text }: { text: string }) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const blocks: JSX.Element[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i++;
      continue;
    }

    if (startsTable(lines, i)) {
      const header = cells(line);
      const rows: string[][] = [];
      i += 2;
      while (i < lines.length && lines[i].trim() && lines[i].includes('|')) {
        rows.push(cells(lines[i]));
        i++;
      }
      blocks.push(
        <div key={blocks.length} className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-white/5 text-xs uppercase tracking-wide text-zinc-400">
              <tr>
                {header.map((h, c) => (
                  <th key={c} className="px-3 py-2 font-medium">
                    {inline(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, r) => (
                <tr key={r} className="border-t border-white/5">
                  {row.map((cell, c) => (
                    <td key={c} className="px-3 py-2 text-zinc-200">
                      {inline(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    if (LIST_ITEM.test(line)) {
      const ordered = /^\s*\d/.test(line);
      const items: string[] = [];
      while (i < lines.length && LIST_ITEM.test(lines[i])) {
        items.push(lines[i].replace(LIST_ITEM, ''));
        i++;
      }
      const List = ordered ? 'ol' : 'ul';
      blocks.push(
        <List key={blocks.length} className={`space-y-1 pl-5 marker:text-emerald-400 ${ordered ? 'list-decimal' : 'list-disc'}`}>
          {items.map((item, k) => (
            <li key={k}>{inline(item)}</li>
          ))}
        </List>,
      );
      continue;
    }

    if (HEADING.test(line)) {
      blocks.push(<p key={blocks.length} className="font-semibold text-white">{inline(line.replace(HEADING, ''))}</p>);
      i++;
      continue;
    }

    const paragraph: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !LIST_ITEM.test(lines[i]) &&
      !HEADING.test(lines[i]) &&
      !startsTable(lines, i)
    ) {
      paragraph.push(lines[i]);
      i++;
    }
    if (paragraph.length === 0) {
      i++;
      continue;
    }
    blocks.push(
      <p key={blocks.length}>
        {paragraph.map((l, k) => (
          <span key={k} className="block">
            {inline(l)}
          </span>
        ))}
      </p>,
    );
  }

  return <div className="space-y-3">{blocks}</div>;
}
