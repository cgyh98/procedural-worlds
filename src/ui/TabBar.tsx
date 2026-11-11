import { modules } from '../modules/registry'
import { useWorld } from '../store/useWorld'
import { usePlay } from '../play/usePlay'

// The row of tabs across the top. Plain HTML buttons, styled in ui.css.
// The labels come straight from the registry, so a new module appears here automatically.
export function TabBar({ activeId }: { activeId: string }) {
  const setActiveModule = useWorld((s) => s.setActiveModule)
  const startPlay = usePlay((s) => s.start)

  return (
    <nav className="tabbar">
      <span className="tabbar-logo" title="You are the disturbance.">☾</span>
      {modules.map((m) => (
        <button
          key={m.id}
          className={m.id === activeId ? 'tab active' : 'tab'}
          onClick={() => setActiveModule(m.id)}
        >
          {/* Syllabus numbers as a small prefix, e.g. "12–14" */}
          {m.syllabus.length > 0 && (
            <span className="tab-num">{formatSyllabus(m.syllabus)}</span>
          )}
          {m.title}
        </button>
      ))}
      {/* Play mode: the atlas as one night, full screen */}
      <button className="tab tab-play" onClick={startPlay} title="Play the night: planet → dive → wake the reefs → moonrise">
        ▶ Play
      </button>
    </nav>
  )
}

// [12, 13, 14] → "12–14", [5] → "05"
function formatSyllabus(nums: number[]) {
  const pad = (n: number) => String(n).padStart(2, '0')
  const first = Math.min(...nums)
  const last = Math.max(...nums)
  return first === last ? pad(first) : `${pad(first)}–${pad(last)}`
}
