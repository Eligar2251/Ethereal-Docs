import { useEffect, useRef, useCallback } from 'react'
import { EditorState } from '@codemirror/state'
import { EditorView, keymap, placeholder } from '@codemirror/view'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { languages } from '@codemirror/language-data'
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language'

interface UseCodeMirrorOptions {
  initialValue: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
}

export function useCodeMirror({
  initialValue,
  onChange,
  placeholder: placeholderText = 'Start writing in Markdown…',
  disabled = false,
}: UseCodeMirrorOptions) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const onChangeRef = useRef(onChange)

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    if (!containerRef.current) return

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        onChangeRef.current(update.state.doc.toString())
      }
    })

    const baseTheme = EditorView.theme({
      '&': {
        height: '100%',
        fontSize: '14px',
      },
      '&.cm-focused': {
        outline: 'none',
      },
    })

    const state = EditorState.create({
      doc: initialValue,
      extensions: [
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        markdown({
          base: markdownLanguage,
          codeLanguages: languages,
        }),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        placeholder(placeholderText),
        updateListener,
        baseTheme,
        EditorView.lineWrapping,
        EditorState.readOnly.of(disabled),
      ],
    })

    const view = new EditorView({
      state,
      parent: containerRef.current,
    })

    viewRef.current = view

    return () => {
      view.destroy()
      viewRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const setContent = useCallback((newContent: string) => {
    const view = viewRef.current
    if (!view) return
    const current = view.state.doc.toString()
    if (current === newContent) return
    view.dispatch({
      changes: { from: 0, to: current.length, insert: newContent },
    })
  }, [])

  const focus = useCallback(() => {
    viewRef.current?.focus()
  }, [])

  return { containerRef, viewRef, setContent, focus }
}