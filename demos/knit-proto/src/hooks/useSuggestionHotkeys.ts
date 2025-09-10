import { useEffect } from 'react'

interface DiffStateLike {
  accept: () => void
  reject: () => void
}

export function useSuggestionHotkeys(options: {
  diffState: DiffStateLike | null
  menuOpen: boolean
  onCloseMenu: () => void
}) {
  const { diffState, menuOpen, onCloseMenu } = options

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (menuOpen && e.key === 'Escape') { onCloseMenu(); return }
      if (!diffState) return
      if (e.key === 'Tab') {
        e.preventDefault()
        diffState.accept()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        diffState.reject()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [diffState, menuOpen, onCloseMenu])
}

export default useSuggestionHotkeys

