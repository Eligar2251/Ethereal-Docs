import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  ShadingType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  LevelFormat,
  convertInchesToTwip,
  UnderlineType,
} from 'docx'
import { saveAs } from 'file-saver'

// ── Типы токенов парсера ───────────────────────────────────────
type InlineToken =
  | { type: 'text'; text: string }
  | { type: 'bold'; text: string }
  | { type: 'italic'; text: string }
  | { type: 'boldItalic'; text: string }
  | { type: 'strike'; text: string }
  | { type: 'code'; text: string }
  | { type: 'link'; text: string; href: string }

type BlockToken =
  | { type: 'heading'; level: 1 | 2 | 3 | 4 | 5 | 6; text: string }
  | { type: 'paragraph'; inlines: InlineToken[] }
  | { type: 'blockquote'; text: string }
  | { type: 'code_block'; code: string; lang: string }
  | { type: 'hr' }
  | { type: 'blank' }
  | { type: 'bullet'; text: string; depth: number }
  | { type: 'ordered'; text: string; depth: number; num: number }
  | { type: 'task'; text: string; checked: boolean }
  | { type: 'table'; headers: string[]; rows: string[][] }

// ── Тип heading level из docx ─────────────────────────────────
type DocxHeadingLevel = (typeof HeadingLevel)[keyof typeof HeadingLevel]

// ── Парсер inline-разметки ────────────────────────────────────
function parseInline(text: string): InlineToken[] {
  const tokens: InlineToken[] = []

  // Убран флаг `s`, т.к. он требует ES2018+.
  // Для inline-парсинга по одной строке он здесь не нужен.
  const pattern =
    /(\*\*\*|___)(.*?)\1|(\*\*|__)(.*?)\3|(\*|_)(.*?)\5|(~~)(.*?)\7|(`)(.*?)\9|\[([^\]]+)\]\(([^)]+)\)/g

  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ type: 'text', text: text.slice(lastIndex, match.index) })
    }

    if (match[1]) {
      tokens.push({ type: 'boldItalic', text: match[2] })
    } else if (match[3]) {
      tokens.push({ type: 'bold', text: match[4] })
    } else if (match[5]) {
      tokens.push({ type: 'italic', text: match[6] })
    } else if (match[7]) {
      tokens.push({ type: 'strike', text: match[8] })
    } else if (match[9]) {
      tokens.push({ type: 'code', text: match[10] })
    } else if (match[11] !== undefined) {
      tokens.push({
        type: 'link',
        text: match[11],
        href: match[12],
      })
    }

    lastIndex = pattern.lastIndex
  }

  if (lastIndex < text.length) {
    tokens.push({ type: 'text', text: text.slice(lastIndex) })
  }

  return tokens.length ? tokens : [{ type: 'text', text }]
}

// ── Inline token → TextRun ────────────────────────────────────
function tokenToRun(token: InlineToken): TextRun {
  const base = {
    font: 'Calibri',
    size: 24,
  }

  switch (token.type) {
    case 'bold':
      return new TextRun({ ...base, text: token.text, bold: true })

    case 'italic':
      return new TextRun({ ...base, text: token.text, italics: true })

    case 'boldItalic':
      return new TextRun({
        ...base,
        text: token.text,
        bold: true,
        italics: true,
      })

    case 'strike':
      return new TextRun({ ...base, text: token.text, strike: true })

    case 'code':
      return new TextRun({
        text: token.text,
        font: 'Courier New',
        size: 20,
        shading: {
          type: ShadingType.SOLID,
          color: 'F0F0F0',
          fill: 'F0F0F0',
        },
      })

    case 'link':
      return new TextRun({
        ...base,
        text: token.text,
        color: '0563C1',
        underline: { type: UnderlineType.SINGLE },
      })

    default:
      return new TextRun({ ...base, text: token.text })
  }
}

// ── Парсер блоков Markdown ────────────────────────────────────
function parseBlocks(markdown: string): BlockToken[] {
  const lines = markdown.split('\n')
  const blocks: BlockToken[] = []
  let i = 0

  function tryParseTable(
    startIdx: number
  ): { token: BlockToken; consumed: number } | null {
    const headerLine = lines[startIdx]
    if (!headerLine?.includes('|')) return null

    const sepLine = lines[startIdx + 1] ?? ''
    if (!/^\|?[\s\-:|]+\|/.test(sepLine)) return null

    const parseRow = (line: string) =>
      line.replace(/^\||\|$/g, '').split('|').map(c => c.trim())

    const headers = parseRow(headerLine)
    const rows: string[][] = []
    let j = startIdx + 2

    while (j < lines.length && lines[j].includes('|')) {
      rows.push(parseRow(lines[j]))
      j++
    }

    return {
      token: { type: 'table', headers, rows },
      consumed: j - startIdx,
    }
  }

  while (i < lines.length) {
    const line = lines[i]

    if (line.trim() === '') {
      blocks.push({ type: 'blank' })
      i++
      continue
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/)
    if (headingMatch) {
      blocks.push({
        type: 'heading',
        level: headingMatch[1].length as 1 | 2 | 3 | 4 | 5 | 6,
        text: headingMatch[2],
      })
      i++
      continue
    }

    if (/^[-*_]{3,}\s*$/.test(line.trim())) {
      blocks.push({ type: 'hr' })
      i++
      continue
    }

    if (line.startsWith('>')) {
      const text = line.replace(/^>\s?/, '')
      blocks.push({ type: 'blockquote', text })
      i++
      continue
    }

    if (line.startsWith('```')) {
      const lang = line.slice(3).trim()
      const codeLines: string[] = []
      i++

      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }

      i++
      blocks.push({
        type: 'code_block',
        code: codeLines.join('\n'),
        lang,
      })
      continue
    }

    const taskMatch = line.match(/^[-*]\s+\[(x| )\]\s+(.+)$/i)
    if (taskMatch) {
      blocks.push({
        type: 'task',
        checked: taskMatch[1].toLowerCase() === 'x',
        text: taskMatch[2],
      })
      i++
      continue
    }

    const bulletMatch = line.match(/^(\s*)[-*+]\s+(.+)$/)
    if (bulletMatch) {
      const depth = Math.floor(bulletMatch[1].length / 2)
      blocks.push({
        type: 'bullet',
        text: bulletMatch[2],
        depth,
      })
      i++
      continue
    }

    const orderedMatch = line.match(/^(\s*)(\d+)\.\s+(.+)$/)
    if (orderedMatch) {
      const depth = Math.floor(orderedMatch[1].length / 2)
      blocks.push({
        type: 'ordered',
        text: orderedMatch[3],
        depth,
        num: parseInt(orderedMatch[2], 10),
      })
      i++
      continue
    }

    const tableResult = tryParseTable(i)
    if (tableResult) {
      blocks.push(tableResult.token)
      i += tableResult.consumed
      continue
    }

    const inlines = parseInline(line)
    blocks.push({ type: 'paragraph', inlines })
    i++
  }

  return blocks
}

// ── Heading level map ─────────────────────────────────────────
const HEADING_LEVEL_MAP: Record<1 | 2 | 3 | 4 | 5 | 6, DocxHeadingLevel> = {
  1: HeadingLevel.HEADING_1,
  2: HeadingLevel.HEADING_2,
  3: HeadingLevel.HEADING_3,
  4: HeadingLevel.HEADING_4,
  5: HeadingLevel.HEADING_5,
  6: HeadingLevel.HEADING_6,
}

// ── Heading font sizes (half-points) ─────────────────────────
const HEADING_SIZE_MAP: Record<1 | 2 | 3 | 4 | 5 | 6, number> = {
  1: 52,
  2: 40,
  3: 32,
  4: 28,
  5: 24,
  6: 22,
}

// ── Block token → docx Paragraph(s) ──────────────────────────
function blockToParagraphs(token: BlockToken): (Paragraph | Table)[] {
  switch (token.type) {
    case 'heading':
      return [
        new Paragraph({
          heading: HEADING_LEVEL_MAP[token.level],
          children: [
            new TextRun({
              text: token.text,
              bold: token.level <= 3,
              size: HEADING_SIZE_MAP[token.level],
              font: 'Garamond',
              color: '1A1A1A',
            }),
          ],
          spacing: { before: 240, after: 120 },
        }),
      ]

    case 'paragraph':
      return [
        new Paragraph({
          children: token.inlines.map(tokenToRun),
          spacing: { after: 160 },
        }),
      ]

    case 'blockquote':
      return [
        new Paragraph({
          children: [
            new TextRun({
              text: token.text,
              italics: true,
              color: '555555',
              font: 'Garamond',
              size: 26,
            }),
          ],
          indent: { left: convertInchesToTwip(0.5) },
          border: {
            left: {
              style: BorderStyle.THICK,
              size: 12,
              color: '1A1A1A',
              space: 12,
            },
          },
          shading: {
            type: ShadingType.SOLID,
            color: 'F7F7F5',
            fill: 'F7F7F5',
          },
          spacing: { before: 160, after: 160 },
        }),
      ]

    case 'code_block':
      return [
        new Paragraph({
          children: [
            new TextRun({
              text: token.code,
              font: 'Courier New',
              size: 18,
              color: '1A1A1A',
            }),
          ],
          shading: {
            type: ShadingType.SOLID,
            color: 'F0F0EE',
            fill: 'F0F0EE',
          },
          border: {
            top: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' },
            bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' },
            left: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' },
            right: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' },
          },
          indent: {
            left: convertInchesToTwip(0.25),
            right: convertInchesToTwip(0.25),
          },
          spacing: { before: 160, after: 160, line: 276 },
        }),
      ]

    case 'hr':
      return [
        new Paragraph({
          children: [],
          border: {
            bottom: {
              style: BorderStyle.SINGLE,
              size: 6,
              color: 'CCCCCC',
            },
          },
          spacing: { before: 240, after: 240 },
        }),
      ]

    case 'blank':
      return [new Paragraph({ children: [], spacing: { after: 80 } })]

    case 'bullet':
      return [
        new Paragraph({
          children: parseInline(token.text).map(tokenToRun),
          bullet: { level: token.depth },
          spacing: { after: 80 },
        }),
      ]

    case 'ordered':
      return [
        new Paragraph({
          children: parseInline(token.text).map(tokenToRun),
          numbering: { reference: 'ordered-list', level: token.depth },
          spacing: { after: 80 },
        }),
      ]

    case 'task':
      return [
        new Paragraph({
          children: [
            new TextRun({
              text: token.checked ? '☑ ' : '☐ ',
              font: 'Segoe UI Symbol',
              size: 22,
              color: token.checked ? '16A34A' : '6B6B6B',
            }),
            ...parseInline(token.text).map(tokenToRun),
          ],
          spacing: { after: 80 },
        }),
      ]

    case 'table': {
      const tableRows: TableRow[] = []

      tableRows.push(
        new TableRow({
          children: token.headers.map(
            h =>
              new TableCell({
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: h,
                        bold: true,
                        font: 'Calibri',
                        size: 20,
                        color: '444444',
                      }),
                    ],
                  }),
                ],
                shading: {
                  type: ShadingType.SOLID,
                  color: 'F0F0EE',
                  fill: 'F0F0EE',
                },
                margins: { top: 80, bottom: 80, left: 120, right: 120 },
              })
          ),
          tableHeader: true,
        })
      )

      for (const row of token.rows) {
        tableRows.push(
          new TableRow({
            children: row.map(
              cell =>
                new TableCell({
                  children: [
                    new Paragraph({
                      children: parseInline(cell).map(tokenToRun),
                    }),
                  ],
                  margins: { top: 80, bottom: 80, left: 120, right: 120 },
                })
            ),
          })
        )
      }

      return [
        new Table({
          rows: tableRows,
          width: { size: 100, type: WidthType.PERCENTAGE },
        }),
      ]
    }

    default:
      return []
  }
}

// ── Главная функция экспорта ──────────────────────────────────
export async function exportToWord(
  title: string,
  markdownContent: string
): Promise<void> {
  const blocks = parseBlocks(markdownContent)
  const children: (Paragraph | Table)[] = []

  children.push(
    new Paragraph({
      heading: HeadingLevel.TITLE,
      children: [
        new TextRun({
          text: title,
          font: 'Garamond',
          size: 64,
          bold: false,
          color: '1A1A1A',
        }),
      ],
      spacing: { after: 400 },
    })
  )

  for (const block of blocks) {
    const paragraphs = blockToParagraphs(block)
    children.push(...paragraphs)
  }

  const doc = new Document({
    numbering: {
      config: [
        {
          reference: 'ordered-list',
          levels: [0, 1, 2].map(level => ({
            level,
            format: LevelFormat.DECIMAL,
            text: `%${level + 1}.`,
            alignment: AlignmentType.LEFT,
            style: {
              paragraph: {
                indent: {
                  left: convertInchesToTwip(0.25 + level * 0.25),
                  hanging: convertInchesToTwip(0.25),
                },
              },
              run: {
                font: 'Calibri',
                size: 24,
              },
            },
          })),
        },
      ],
    },

    styles: {
      default: {
        document: {
          run: { font: 'Calibri', size: 24, color: '1A1A1A' },
          paragraph: { spacing: { line: 276 } },
        },
      },
      paragraphStyles: [
        {
          id: 'Title',
          name: 'Title',
          basedOn: 'Normal',
          run: { font: 'Garamond', size: 64, color: '1A1A1A' },
        },
        {
          id: 'Heading1',
          name: 'Heading 1',
          basedOn: 'Normal',
          run: { font: 'Garamond', size: 52, bold: true, color: '1A1A1A' },
          paragraph: { spacing: { before: 480, after: 160 } },
        },
        {
          id: 'Heading2',
          name: 'Heading 2',
          basedOn: 'Normal',
          run: { font: 'Garamond', size: 40, bold: true, color: '1A1A1A' },
          paragraph: { spacing: { before: 360, after: 120 } },
        },
        {
          id: 'Heading3',
          name: 'Heading 3',
          basedOn: 'Normal',
          run: { font: 'Garamond', size: 32, bold: false, color: '1A1A1A' },
          paragraph: { spacing: { before: 280, after: 100 } },
        },
      ],
    },

    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1.25),
              right: convertInchesToTwip(1.25),
            },
          },
        },
        children,
      },
    ],
  })

  const blob = await Packer.toBlob(doc)
  const safeTitle =
    title.replace(/[^a-zA-Zа-яА-Я0-9\s-]/g, '').trim() || 'document'

  saveAs(blob, `${safeTitle}.docx`)
}