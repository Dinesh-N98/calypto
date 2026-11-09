import type { ReactNode } from "react";

function safeMarkdownHref(value: string): string | null {
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  try {
    const url = new URL(value);
    return ["https:", "http:", "mailto:"].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

function renderInlineMarkdown(value: string, keyPrefix: string): ReactNode[] {
  const tokenPattern = /\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`/gu;
  const nodes: ReactNode[] = [];
  let cursor = 0;
  let tokenIndex = 0;

  for (const match of value.matchAll(tokenPattern)) {
    const start = match.index ?? 0;
    if (start > cursor) nodes.push(value.slice(cursor, start));
    const key = `${keyPrefix}-${tokenIndex++}`;
    if (match[1] !== undefined && match[2] !== undefined) {
      const href = safeMarkdownHref(match[2]);
      nodes.push(
        href ? (
          <a
            className="font-semibold underline underline-offset-2"
            href={href}
            key={key}
            rel={href.startsWith("http") ? "noreferrer" : undefined}
            target={href.startsWith("http") ? "_blank" : undefined}
          >
            {match[1]}
          </a>
        ) : (
          match[1]
        ),
      );
    } else if (match[3] !== undefined) {
      nodes.push(<strong key={key}>{match[3]}</strong>);
    } else if (match[4] !== undefined) {
      nodes.push(<em key={key}>{match[4]}</em>);
    } else if (match[5] !== undefined) {
      nodes.push(
        <code className="rounded bg-black/5 px-1 py-0.5 font-mono text-[.9em]" key={key}>
          {match[5]}
        </code>,
      );
    }
    cursor = start + match[0].length;
  }

  if (cursor < value.length) nodes.push(value.slice(cursor));
  return nodes;
}

function renderParagraph(lines: string[], key: string): ReactNode {
  return (
    <p className="mb-3 last:mb-0" key={key}>
      {lines.map((line, index) => (
        <span key={`${key}-${index}`}>
          {index > 0 && <br />}
          {renderInlineMarkdown(line, `${key}-${index}`)}
        </span>
      ))}
    </p>
  );
}

export function MarkdownDescription({
  description,
  className = "",
}: {
  description: string;
  className?: string;
}) {
  const lines = description.split(/\r?\n/u);
  const blocks: ReactNode[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) {
      index += 1;
      continue;
    }

    const heading = /^(#{1,3})\s+(.+)$/u.exec(line);
    if (heading) {
      const Heading = heading[1].length === 1 ? "h2" : heading[1].length === 2 ? "h3" : "h4";
      blocks.push(
        <Heading className="mb-2 mt-4 font-bold first:mt-0" key={`heading-${index}`}>
          {renderInlineMarkdown(heading[2], `heading-${index}`)}
        </Heading>,
      );
      index += 1;
      continue;
    }

    if (/^\s*[-*]\s+/u.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\s*[-*]\s+/u.test(lines[index])) {
        items.push(lines[index].replace(/^\s*[-*]\s+/u, ""));
        index += 1;
      }
      blocks.push(
        <ul className="mb-3 list-disc space-y-1 pl-5 last:mb-0" key={`list-${index}`}>
          {items.map((item, itemIndex) => (
            <li key={`list-${index}-${itemIndex}`}>
              {renderInlineMarkdown(item, `list-${index}-${itemIndex}`)}
            </li>
          ))}
        </ul>,
      );
      continue;
    }

    const paragraph: string[] = [];
    while (
      index < lines.length &&
      lines[index].trim() &&
      !/^(#{1,3})\s+/u.test(lines[index]) &&
      !/^\s*[-*]\s+/u.test(lines[index])
    ) {
      paragraph.push(lines[index]);
      index += 1;
    }
    blocks.push(renderParagraph(paragraph, `paragraph-${index}`));
  }

  return <div className={className}>{blocks}</div>;
}
