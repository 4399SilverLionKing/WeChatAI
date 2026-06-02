import type { ReactNode } from 'react'

type MarkdownProps = {
  content: string
}

type Block =
  | { type: 'heading'; level: number; text: string }
  | { type: 'paragraph'; lines: string[] }
  | { type: 'unordered-list'; items: string[] }
  | { type: 'ordered-list'; items: string[] }
  | { type: 'blockquote'; lines: string[] }
  | { type: 'code'; code: string }
  | { type: 'rule' }
  | { type: 'table'; rows: string[][] }

function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g)

  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index}>{part.slice(2, -2)}</strong>
    }

    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={index} className="rounded bg-muted px-1 py-0.5 text-[0.85em]">
          {part.slice(1, -1)}
        </code>
      )
    }

    return part
  })
}

function isTableDivider(line: string) {
  return /^\s*\|?[\s:-]+\|[\s|:-]+\|?\s*$/.test(line)
}

function parseTableRow(line: string) {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map(cell => cell.trim())
}

function parseMarkdown(content: string): Block[] {
  const lines = content.replace(/\r\n/g, '\n').split('\n')
  const blocks: Block[] = []
  let index = 0

  while (index < lines.length) {
    const line = lines[index]
    const trimmed = line.trim()

    if (!trimmed) {
      index += 1
      continue
    }

    if (trimmed.startsWith('```')) {
      const code: string[] = []
      index += 1
      while (index < lines.length && !lines[index].trim().startsWith('```')) {
        code.push(lines[index])
        index += 1
      }
      blocks.push({ type: 'code', code: code.join('\n') })
      index += 1
      continue
    }

    if (/^---+$/.test(trimmed)) {
      blocks.push({ type: 'rule' })
      index += 1
      continue
    }

    const heading = /^(#{1,4})\s+(.+)$/.exec(trimmed)
    if (heading) {
      blocks.push({
        type: 'heading',
        level: heading[1].length,
        text: heading[2],
      })
      index += 1
      continue
    }

    if (trimmed.includes('|') && index + 1 < lines.length && isTableDivider(lines[index + 1])) {
      const rows = [parseTableRow(trimmed)]
      index += 2
      while (index < lines.length && lines[index].trim().includes('|')) {
        rows.push(parseTableRow(lines[index]))
        index += 1
      }
      blocks.push({ type: 'table', rows })
      continue
    }

    if (/^[-*]\s+/.test(trimmed)) {
      const items: string[] = []
      while (index < lines.length && /^[-*]\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^[-*]\s+/, ''))
        index += 1
      }
      blocks.push({ type: 'unordered-list', items })
      continue
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = []
      while (index < lines.length && /^\d+\.\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^\d+\.\s+/, ''))
        index += 1
      }
      blocks.push({ type: 'ordered-list', items })
      continue
    }

    if (trimmed.startsWith('>')) {
      const quote: string[] = []
      while (index < lines.length && lines[index].trim().startsWith('>')) {
        quote.push(lines[index].trim().replace(/^>\s?/, ''))
        index += 1
      }
      blocks.push({ type: 'blockquote', lines: quote })
      continue
    }

    const paragraph: string[] = []
    while (
      index < lines.length &&
      lines[index].trim() &&
      !lines[index].trim().startsWith('```') &&
      !/^(#{1,4})\s+/.test(lines[index].trim()) &&
      !/^[-*]\s+/.test(lines[index].trim()) &&
      !/^\d+\.\s+/.test(lines[index].trim()) &&
      !lines[index].trim().startsWith('>') &&
      !/^---+$/.test(lines[index].trim())
    ) {
      paragraph.push(lines[index].trim())
      index += 1
    }
    blocks.push({ type: 'paragraph', lines: paragraph })
  }

  return blocks
}

function Heading({ level, children }: { level: number; children: ReactNode }) {
  const className = 'font-semibold tracking-normal text-foreground'

  if (level === 1) return <h1 className={`${className} mt-1 text-xl`}>{children}</h1>
  if (level === 2) return <h2 className={`${className} mt-5 text-base`}>{children}</h2>
  if (level === 3) return <h3 className={`${className} mt-4 text-sm`}>{children}</h3>
  return <h4 className={`${className} mt-3 text-sm`}>{children}</h4>
}

export function Markdown({ content }: MarkdownProps) {
  const blocks = parseMarkdown(content)

  return (
    <div className="space-y-3 text-sm leading-6 text-foreground">
      {blocks.map((block, index) => {
        if (block.type === 'heading') {
          return (
            <Heading key={index} level={block.level}>
              {renderInline(block.text)}
            </Heading>
          )
        }

        if (block.type === 'paragraph') {
          return (
            <p key={index} className="text-foreground/90">
              {renderInline(block.lines.join(' '))}
            </p>
          )
        }

        if (block.type === 'unordered-list') {
          return (
            <ul key={index} className="space-y-1 pl-5">
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex} className="list-disc text-foreground/90">
                  {renderInline(item)}
                </li>
              ))}
            </ul>
          )
        }

        if (block.type === 'ordered-list') {
          return (
            <ol key={index} className="space-y-1 pl-5">
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex} className="list-decimal text-foreground/90">
                  {renderInline(item)}
                </li>
              ))}
            </ol>
          )
        }

        if (block.type === 'blockquote') {
          return (
            <blockquote key={index} className="border-l-2 pl-3 text-muted-foreground">
              {block.lines.map((quote, quoteIndex) => (
                <p key={quoteIndex}>{renderInline(quote)}</p>
              ))}
            </blockquote>
          )
        }

        if (block.type === 'code') {
          return (
            <pre key={index} className="overflow-x-auto rounded-md bg-muted p-3 text-xs leading-5">
              <code>{block.code}</code>
            </pre>
          )
        }

        if (block.type === 'rule') {
          return <hr key={index} className="border-border" />
        }

        return (
          <div key={index} className="overflow-x-auto rounded-md border">
            <table className="w-full text-left text-xs">
              <tbody>
                {block.rows.map((row, rowIndex) => (
                  <tr key={rowIndex} className="border-b last:border-b-0">
                    {row.map((cell, cellIndex) => {
                      const Cell = rowIndex === 0 ? 'th' : 'td'
                      return (
                        <Cell key={cellIndex} className="px-2 py-1.5 align-top">
                          {renderInline(cell)}
                        </Cell>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      })}
    </div>
  )
}
