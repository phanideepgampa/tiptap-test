import { useEffect, useState } from 'react'

export type SelectionKind = 'selection' | 'document' | 'none'

export function useSelectionPreview(editor: any, applyDoc: boolean) {
  const [state, setState] = useState<{ text: string; kind: SelectionKind }>({ text: '', kind: 'none' })

  useEffect(() => {
    if (!editor) return
    const compute = () => {
      try {
        const st = editor.state
        if (applyDoc) {
          const full = st.doc.textBetween(0, st.doc.content.size, '\n')
          setState({ text: full, kind: 'document' })
        } else {
          const { from, to } = st.selection
          const sel = st.doc.textBetween(from, to, ' ')
          setState(sel ? { text: sel, kind: 'selection' } : { text: '', kind: 'none' })
        }
      } catch {}
    }
    compute()
    editor.on('selectionUpdate', compute)
    editor.on('update', compute)
    return () => {
      editor.off('selectionUpdate', compute)
      editor.off('update', compute)
    }
  }, [editor, applyDoc])

  return state
}

export default useSelectionPreview

