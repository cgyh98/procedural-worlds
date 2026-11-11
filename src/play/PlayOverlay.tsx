import { useEffect } from 'react'
import { reefsNeeded, usePlay } from './usePlay'
import { MoonPhaseIcon } from './MoonPhaseIcon'
import './play.css'

// The HTML layer of play mode: title card, subtitles, a fade curtain, the controls
// hint, the moon-phase reef counter and the closing card. Esc leaves play mode at any time.
export function PlayOverlay() {
  const { stage, subtitle, fade, reefsAwake, reefsTotal, stop, setStage, start } = usePlay()

  const needed = reefsNeeded(reefsTotal)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') stop()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [stop])

  return (
    <div className="play">
      <div className={fade ? 'play-curtain on' : 'play-curtain'} />

      {stage === 'title' && (
        <div className="play-title" onClick={() => setStage('diving')}>
          <h1>The night the moon fell into the sea</h1>
          <p className="play-sub">a bioluminescent ocean</p>
          <button className="play-button">Dive</button>
        </div>
      )}

      {stage === 'swim' && (
        <>
          {/* key = text, so each new line fades in */}
          <p key={subtitle} className={subtitle ? 'play-subtitle on' : 'play-subtitle'}>{subtitle}</p>
          <div className="play-hint">W/S swim · A/D turn · E/Q rise/sink · Shift burst · Esc exit</div>
          {/* One moon per reef needed: moon i is the phase the night reaches when the
              i-th reef wakes (crescent → full). Unwoken moons are faint outlines. */}
          <div className="play-moons" title="Each reef you wake brings the full moon closer">
            {Array.from({ length: needed }, (_, i) => (
              <MoonPhaseIcon key={i} lit={(i + 1) / needed} awake={i < reefsAwake} />
            ))}
          </div>
        </>
      )}

      {stage === 'end' && (
        <div className="play-end">
          <h1>You were the disturbance.</h1>
          <p className="play-sub">Under the full moon, the glow you made fades back to black.</p>
          <div className="play-actions">
            <button className="play-button" onClick={start}>Play again</button>
            <button className="play-button ghost" onClick={stop}>Back to the atlas</button>
          </div>
        </div>
      )}
    </div>
  )
}
