import { useState } from 'react'
import type { WorldModule } from '../modules/types'

// Small panel in the bottom-left corner explaining the active tab's concept.
// Doubles as speaker notes during the presentation. Click the title to collapse it.
export function ConceptCard({ module }: { module: WorldModule }) {
  const [open, setOpen] = useState(true)

  return (
    <aside className="concept-card">
      <button className="concept-title" onClick={() => setOpen(!open)}>
        {module.title} <span className="concept-toggle">{open ? '–' : '+'}</span>
      </button>
      {open && <p>{module.about}</p>}
    </aside>
  )
}
