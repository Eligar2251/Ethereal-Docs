import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  Table,
  TableRow,
  TableCell,
  WidthType,
  LevelFormat,
  convertInchesToTwip,
  convertMillimetersToTwip,
  UnderlineType,
  ExternalHyperlink,
  TabStopPosition,
  TabStopType,
} from 'docx'
import { saveAs } from 'file-saver'

// ── Константы шрифтов и размеров ─────────────────────────────
const FONT_MAIN = 'Times New Roman'
const FONT_MONO = 'Courier New'

// Размеры в half-points (1pt = 2 half-points)
const SIZE_BODY = 28       // 14pt
const SIZE_BODY_SMALL = 24 // 12pt
const SIZE_H1 = 32         // 16pt
const SIZE_H2 = 30         // 15pt
const SIZE_H3 = 28         // 14pt
const SIZE_H4 = 28         // 14pt
const SIZE_CODE = 24       // 12pt

// ГОСТ отступы (в mm → twip)
const MARGIN_TOP    = convertMillimetersToTwip(20)
const MARGIN_BOTTOM = convertMillimetersToTwip(20)
const MARGIN_LEFT   = convertMillimetersToTwip(30)
const MARGIN_RIGHT  = convertMillimetersToTwip(15)

// Отступ первой строки абзаца — 1.25 см
const FIRST_LINE_INDENT = convertMillimetersToTwip(12.5)

// Межстрочный интервал 1.5 = 360 twip (240 * 1.5)
const LINE_SPACING = 360

// Интервал до/после абзаца — 0
const SPACING_BEFORE = 0
const SPACING_AFTER = 0

// ── Типы токенов ──────────────────────────────────────────────
type InlineToken =
  | { type: 'text';       text: string }
  | { type: 'bold';       text: string }
  | { type: 'italic';     text: string }
  | { type: 'boldItalic'; text: string }
  | { type: 'strike';     text: string }
  | { type: 'code';       text: string }
  | { type: 'link';       text: string; href: string }

type BlockToken =
  | { type: 'heading';    level: 1 | 2 | 3 | 4 | 5 | 6; text: string }
  | { type: 'paragraph';  inlines: InlineToken[] }
  | { type: 'blockquote'; inlines: InlineToken[] }
  | { type: 'code_block'; code: string; lang: string }
  | { type: 'hr' }
  | { type: 'bullet';     text: string; depth: number }
  | { type: 'ordered';    text: string; depth: number; num: number }
  | { type: 'task';       text: string; checked: boolean }
  | { type: 'table';      headers: string[]; rows: string[][] }

type DocxHeadingLevel = (typeof HeadingLevel)[keyof typeof HeadingLevel]
type Child = TextRun | ExternalHyperlink

// ── Утилиты ───────────────────────────────────────────────────

function sanitizeFileName(name: string): string {
  return (
    name
      .replace(/[<>:"/\\|?*]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 100) || 'document'
  )
}

function sanitizeHref(href: string): string | null {
  const trimmed = href.trim()
  if (/^(https?:|mailto:)/i.test(trimmed)) return trimmed
  return null
}

function isTableSeparator(line: string): boolean {
  return /^\|?[\s:-|]+\|?$/.test(line.trim())
}

function parseTableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map(c => c.trim())
}

// ── Inline парсер ─────────────────────────────────────────────

function parseInline(text: string): InlineToken[] {
  const tokens: InlineToken[] = []
  const pattern =
    /(\*\*\*|___)(.*?)\1|(\*\*|__)(.*?)\3|(\*|_)(.*?)\5|(~~)(.*?)\7|(`)(.*?)\9|\[([^\]]+)\]\(([^)]+)\)/g

  let last = 0
  let m: RegExpExecArray | null

  while ((m = pattern.exec(text)) !== null) {
    if (m.index > last) {
      tokens.push({ type: 'text', text: text.slice(last, m.index) })
    }

    if      (m[1])                tokens.push({ type: 'boldItalic', text: m[2] })
    else if (m[3])                tokens.push({ type: 'bold',       text: m[4] })
    else if (m[5])                tokens.push({ type: 'italic',     text: m[6] })
    else if (m[7])                tokens.push({ type: 'strike',     text: m[8] })
    else if (m[9])                tokens.push({ type: 'code',       text: m[10] })
    else if (m[11] !== undefined) tokens.push({ type: 'link',       text: m[11], href: m[12] })

    last = pattern.lastIndex
  }

  if (last < text.length) {
    tokens.push({ type: 'text', text: text.slice(last) })
  }

  return tokens.length ? tokens : [{ type: 'text', text }]
}

// ── Block парсер ──────────────────────────────────────────────

function parseBlocks(markdown: string): BlockToken[] {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n')
  const blocks: BlockToken[] = []
  let i = 0
  let buffer: string[] = []

  function flush() {
    if (!buffer.length) return
    const text = buffer.join(' ').trim()
    if (text) blocks.push({ type: 'paragraph', inlines: parseInline(text) })
    buffer = []
  }

  while (i < lines.length) {
    const raw = lines[i]
    const trimmed = raw.trim()

    // Пустая строка — конец абзаца
    if (trimmed === '') {
      flush()
      i++
      continue
    }

    // Заголовки
    const hMatch = raw.match(/^(#{1,6})\s+(.+)$/)
    if (hMatch) {
      flush()
      blocks.push({
        type: 'heading',
        level: hMatch[1].length as 1 | 2 | 3 | 4 | 5 | 6,
        text: hMatch[2].trim(),
      })
      i++
      continue
    }

    // Горизонтальная черта
    if (/^[-*_]{3,}\s*$/.test(trimmed)) {
      flush()
      blocks.push({ type: 'hr' })
      i++
      continue
    }

    // Блок кода
    if (raw.startsWith('```')) {
      flush()
      const lang = raw.slice(3).trim()
      const code: string[] = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) {
        code.push(lines[i])
        i++
      }
      if (i < lines.length) i++ // закрывающий ```
      blocks.push({ type: 'code_block', code: code.join('\n'), lang })
      continue
    }

    // Цитата
    if (trimmed.startsWith('>')) {
      flush()
      const quoteLines: string[] = []
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].replace(/^>\s?/, '').trim())
        i++
      }
      blocks.push({
        type: 'blockquote',
        inlines: parseInline(quoteLines.join(' ')),
      })
      continue
    }

    // Task list
    const taskMatch = raw.match(/^[-*]\s+\[(x| )\]\s+(.+)$/i)
    if (taskMatch) {
      flush()
      blocks.push({
        type: 'task',
        checked: taskMatch[1].toLowerCase() === 'x',
        text: taskMatch[2],
      })
      i++
      continue
    }

    // Bullet list
    const bulletMatch = raw.match(/^(\s*)[-*+]\s+(.+)$/)
    if (bulletMatch) {
      flush()
      blocks.push({
        type: 'bullet',
        text: bulletMatch[2],
        depth: Math.min(3, Math.floor(bulletMatch[1].length / 2)),
      })
      i++
      continue
    }

    // Ordered list
    const ordMatch = raw.match(/^(\s*)(\d+)\.\s+(.+)$/)
    if (ordMatch) {
      flush()
      blocks.push({
        type: 'ordered',
        text: ordMatch[3],
        depth: Math.min(3, Math.floor(ordMatch[1].length / 2)),
        num: parseInt(ordMatch[2], 10),
      })
      i++
      continue
    }

    // Таблица
    if (
      raw.includes('|') &&
      i + 1 < lines.length &&
      isTableSeparator(lines[i + 1])
    ) {
      flush()
      const headers = parseTableRow(raw)
      const rows: string[][] = []
      i += 2
      while (i < lines.length && lines[i].includes('|') && lines[i].trim() !== '') {
        rows.push(parseTableRow(lines[i]))
        i++
      }
      blocks.push({ type: 'table', headers, rows })
      continue
    }

    buffer.push(trimmed)
    i++
  }

  flush()
  return blocks
}

// ── Базовые настройки абзаца (ГОСТ) ──────────────────────────

function baseParaProps(opts: {
  firstLine?: boolean
  align?: (typeof AlignmentType)[keyof typeof AlignmentType]
  spacingBefore?: number
  spacingAfter?: number
} = {}) {
  return {
    alignment: opts.align ?? AlignmentType.BOTH,
    indent: opts.firstLine !== false
      ? { firstLine: FIRST_LINE_INDENT }
      : undefined,
    spacing: {
      before: opts.spacingBefore ?? SPACING_BEFORE,
      after:  opts.spacingAfter  ?? SPACING_AFTER,
      line:   LINE_SPACING,
      lineRule: 'auto' as const,
    },
  }
}

// ── Run-фабрика ───────────────────────────────────────────────

interface RunOpts {
  bold?:    boolean
  italics?: boolean
  strike?:  boolean
  color?:   string
  font?:    string
  size?:    number
  underline?: boolean
}

function run(text: string, opts: RunOpts = {}): TextRun {
  return new TextRun({
    text,
    font:    opts.font    ?? FONT_MAIN,
    size:    opts.size    ?? SIZE_BODY,
    bold:    opts.bold    ?? false,
    italics: opts.italics ?? false,
    strike:  opts.strike  ?? false,
    color:   opts.color   ?? '000000',
    underline: opts.underline ? { type: UnderlineType.SINGLE } : undefined,
  })
}

// ── Inline → docx Children ────────────────────────────────────

function toChildren(inlines: InlineToken[], base: RunOpts = {}): Child[] {
  return inlines.map(token => {
    switch (token.type) {
      case 'bold':
        return run(token.text, { ...base, bold: true })

      case 'italic':
        return run(token.text, { ...base, italics: true })

      case 'boldItalic':
        return run(token.text, { ...base, bold: true, italics: true })

      case 'strike':
        return run(token.text, { ...base, strike: true })

      case 'code':
        return run(token.text, {
          font:  FONT_MONO,
          size:  SIZE_CODE,
          color: '444444',
        })

      case 'link': {
        const href = sanitizeHref(token.href)
        const linkRun = run(token.text, {
          ...base,
          color:     '1155CC',
          underline: true,
        })
        if (!href) return linkRun
        return new ExternalHyperlink({ link: href, children: [linkRun] })
      }

      default:
        return run((token as { text: string }).text, base)
    }
  })
}

// ── Heading level map ─────────────────────────────────────────

const H_LEVEL: Record<1 | 2 | 3 | 4 | 5 | 6, DocxHeadingLevel> = {
  1: HeadingLevel.HEADING_1,
  2: HeadingLevel.HEADING_2,
  3: HeadingLevel.HEADING_3,
  4: HeadingLevel.HEADING_4,
  5: HeadingLevel.HEADING_5,
  6: HeadingLevel.HEADING_6,
}

const H_SIZE: Record<1 | 2 | 3 | 4 | 5 | 6, number> = {
  1: SIZE_H1,
  2: SIZE_H2,
  3: SIZE_H3,
  4: SIZE_H4,
  5: SIZE_BODY,
  6: SIZE_BODY,
}

// ── Block → docx elements ─────────────────────────────────────

function blockToElements(token: BlockToken): (Paragraph | Table)[] {
  switch (token.type) {

    // ── Заголовки ─────────────────────────────────────────────
    case 'heading':
      return [
        new Paragraph({
          heading: H_LEVEL[token.level],
          children: [
            run(token.text, {
              bold:  true,
              size:  H_SIZE[token.level],
              color: '000000',
            }),
          ],
          alignment: AlignmentType.CENTER,
          indent: undefined,
          spacing: {
            before: LINE_SPACING,
            after:  LINE_SPACING,
            line:   LINE_SPACING,
            lineRule: 'auto',
          },
        }),
      ]

    // ── Обычный абзац ─────────────────────────────────────────
    case 'paragraph':
      return [
        new Paragraph({
          children: toChildren(token.inlines),
          ...baseParaProps(),
        }),
      ]

    // ── Цитата ────────────────────────────────────────────────
    case 'blockquote':
      return [
        new Paragraph({
          children: toChildren(token.inlines, { italics: true, color: '444444' }),
          ...baseParaProps({ firstLine: false }),
          indent: {
            left:  convertMillimetersToTwip(12.5),
            right: convertMillimetersToTwip(12.5),
          },
          border: {
            left: {
              style: BorderStyle.SINGLE,
              size:  9,
              color: 'AAAAAA',
              space: 5,
            },
          },
        }),
      ]

    // ── Блок кода ─────────────────────────────────────────────
    case 'code_block': {
      const result: Paragraph[] = []
      const codeLines = token.code.split('\n')

      codeLines.forEach((line, idx) => {
        result.push(
          new Paragraph({
            children: [
              run(
                // Сохраняем отступы неразрывными пробелами
                line.replace(/ /g, '\u00A0').replace(/\t/g, '\u00A0\u00A0\u00A0\u00A0') || '\u00A0',
                {
                  font:  FONT_MONO,
                  size:  SIZE_CODE,
                  color: '1A1A1A',
                }
              ),
            ],
            alignment: AlignmentType.LEFT,
            indent: {
              left: convertMillimetersToTwip(12.5),
            },
            spacing: {
              before: idx === 0               ? LINE_SPACING / 2 : 0,
              after:  idx === codeLines.length - 1 ? LINE_SPACING / 2 : 0,
              line:   240,
              lineRule: 'auto',
            },
          })
        )
      })

      return result
    }

    // ── Горизонтальная черта ──────────────────────────────────
    case 'hr':
      return [
        new Paragraph({
          children: [],
          border: {
            bottom: {
              style: BorderStyle.SINGLE,
              size:  4,
              color: 'AAAAAA',
            },
          },
          spacing: {
            before: LINE_SPACING,
            after:  LINE_SPACING,
            line:   LINE_SPACING,
            lineRule: 'auto',
          },
        }),
      ]

    // ── Маркированный список ──────────────────────────────────
    case 'bullet':
      return [
        new Paragraph({
          children: toChildren(parseInline(token.text)),
          bullet: { level: token.depth },
          alignment: AlignmentType.BOTH,
          indent: {
            left:    convertMillimetersToTwip(12.5 + token.depth * 12.5),
            hanging: convertMillimetersToTwip(6.25),
          },
          spacing: {
            before: 0,
            after:  0,
            line:   LINE_SPACING,
            lineRule: 'auto',
          },
        }),
      ]

    // ── Нумерованный список ───────────────────────────────────
    case 'ordered':
      return [
        new Paragraph({
          children: toChildren(parseInline(token.text)),
          numbering: {
            reference: 'ordered-list',
            level: token.depth,
          },
          alignment: AlignmentType.BOTH,
          indent: {
            left:    convertMillimetersToTwip(12.5 + token.depth * 12.5),
            hanging: convertMillimetersToTwip(6.25),
          },
          spacing: {
            before: 0,
            after:  0,
            line:   LINE_SPACING,
            lineRule: 'auto',
          },
        }),
      ]

    // ── Task list ─────────────────────────────────────────────
    case 'task':
      return [
        new Paragraph({
          children: [
            run(token.checked ? '[x] ' : '[ ] ', {
              font:  FONT_MONO,
              size:  SIZE_BODY_SMALL,
            }),
            ...toChildren(parseInline(token.text)),
          ],
          ...baseParaProps({ firstLine: false }),
          indent: {
            left: convertMillimetersToTwip(12.5),
          },
        }),
      ]

    // ── Таблица ───────────────────────────────────────────────
    case 'table': {
      const border = {
        style: BorderStyle.SINGLE,
        size:  4,
        color: '000000',
      }

      const headerRow = new TableRow({
        tableHeader: true,
        children: token.headers.map(cell =>
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  run(cell, { bold: true, size: SIZE_BODY_SMALL }),
                ],
                alignment: AlignmentType.CENTER,
                spacing: { before: 60, after: 60, line: 240, lineRule: 'auto' },
              }),
            ],
            margins: { top: 60, bottom: 60, left: 80, right: 80 },
          })
        ),
      })

      const bodyRows = token.rows.map(row =>
        new TableRow({
          children: row.map(cell =>
            new TableCell({
              children: [
                new Paragraph({
                  children: toChildren(parseInline(cell), { size: SIZE_BODY_SMALL }),
                  alignment: AlignmentType.BOTH,
                  spacing: { before: 60, after: 60, line: 240, lineRule: 'auto' },
                }),
              ],
              margins: { top: 60, bottom: 60, left: 80, right: 80 },
            })
          ),
        })
      )

      return [
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [headerRow, ...bodyRows],
          borders: {
            top:              border,
            bottom:           border,
            left:             border,
            right:            border,
            insideHorizontal: border,
            insideVertical:   border,
          },
        }),
      ]
    }

    default:
      return []
  }
}

// ── Главная функция ───────────────────────────────────────────

export async function exportToWord(
  title: string,
  markdownContent: string
): Promise<void> {
  const blocks   = parseBlocks(markdownContent)
  const children: (Paragraph | Table)[] = []

  // Титульный заголовок
  if (title.trim()) {
    children.push(
      new Paragraph({
        children: [
          run(title.trim(), {
            bold:  true,
            size:  SIZE_H1,
          }),
        ],
        alignment: AlignmentType.CENTER,
        indent: undefined,
        spacing: {
          before: 0,
          after:  LINE_SPACING,
          line:   LINE_SPACING,
          lineRule: 'auto',
        },
      })
    )
  }

  for (const block of blocks) {
    children.push(...blockToElements(block))
  }

  const doc = new Document({
    numbering: {
      config: [
        {
          reference: 'ordered-list',
          levels: [0, 1, 2, 3].map(level => ({
            level,
            format: LevelFormat.DECIMAL,
            text:   `%${level + 1}.`,
            alignment: AlignmentType.LEFT,
            style: {
              paragraph: {
                indent: {
                  left:    convertMillimetersToTwip(12.5 + level * 12.5),
                  hanging: convertMillimetersToTwip(6.25),
                },
              },
              run: {
                font: FONT_MAIN,
                size: SIZE_BODY,
              },
            },
          })),
        },
      ],
    },

    styles: {
      default: {
        document: {
          run: {
            font:  FONT_MAIN,
            size:  SIZE_BODY,
            color: '000000',
          },
          paragraph: {
            spacing: {
              line:     LINE_SPACING,
              lineRule: 'auto',
              before:   SPACING_BEFORE,
              after:    SPACING_AFTER,
            },
          },
        },
      },

      paragraphStyles: [
        {
          id:       'Normal',
          name:     'Normal',
          basedOn:  'Normal',
          run: {
            font:  FONT_MAIN,
            size:  SIZE_BODY,
            color: '000000',
          },
        },
        {
          id:      'Heading1',
          name:    'Heading 1',
          basedOn: 'Normal',
          run: {
            font:  FONT_MAIN,
            size:  SIZE_H1,
            bold:  true,
            color: '000000',
          },
          paragraph: {
            alignment: AlignmentType.CENTER,
            spacing: {
              before: LINE_SPACING,
              after:  LINE_SPACING,
              line:   LINE_SPACING,
              lineRule: 'auto',
            },
          },
        },
        {
          id:      'Heading2',
          name:    'Heading 2',
          basedOn: 'Normal',
          run: {
            font:  FONT_MAIN,
            size:  SIZE_H2,
            bold:  true,
            color: '000000',
          },
          paragraph: {
            alignment: AlignmentType.CENTER,
            spacing: {
              before: LINE_SPACING,
              after:  LINE_SPACING,
              line:   LINE_SPACING,
              lineRule: 'auto',
            },
          },
        },
        {
          id:      'Heading3',
          name:    'Heading 3',
          basedOn: 'Normal',
          run: {
            font:  FONT_MAIN,
            size:  SIZE_H3,
            bold:  true,
            color: '000000',
          },
          paragraph: {
            alignment: AlignmentType.CENTER,
            spacing: {
              before: LINE_SPACING,
              after:  LINE_SPACING,
              line:   LINE_SPACING,
              lineRule: 'auto',
            },
          },
        },
      ],
    },

    sections: [
      {
        properties: {
          page: {
            margin: {
              top:    MARGIN_TOP,
              bottom: MARGIN_BOTTOM,
              left:   MARGIN_LEFT,
              right:  MARGIN_RIGHT,
            },
          },
        },
        children,
      },
    ],
  })

  const blob = await Packer.toBlob(doc)
  saveAs(blob, `${sanitizeFileName(title)}.docx`)
}