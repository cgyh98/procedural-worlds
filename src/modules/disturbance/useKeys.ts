import { useEffect, useRef } from 'react'

// Tracks which keys are held down, as a Set of key codes ("KeyW", "ShiftLeft"…).
// Kept in a ref, not state: the player reads it every frame, and key presses
// shouldn't re-render anything.
//
// Uses `code` (physical key position) rather than `key` (the typed character),
// so WASD works on any keyboard layout.
export function useKeys() {
  const keys = useRef(new Set<string>())

  useEffect(() => {
    const held = keys.current
    // Don't steer while typing a number into a slider's text box.
    const isTyping = (e: KeyboardEvent) => e.target instanceof HTMLInputElement
    const down = (e: KeyboardEvent) => {
      if (!isTyping(e)) held.add(e.code)
    }
    const up = (e: KeyboardEvent) => held.delete(e.code)
    // If the window loses focus mid-press we never get the keyup: forget everything.
    const clear = () => held.clear()

    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', clear)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', clear)
    }
  }, [])

  return keys
}
