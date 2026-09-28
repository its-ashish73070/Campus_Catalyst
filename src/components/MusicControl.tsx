import { useEffect, useSyncExternalStore } from 'react'
import { VolumeX } from 'lucide-react'
import { getState, initMusic, subscribe, toggleMusic } from '../utils/music'

/** Floating background-music switch, styled like a camera's audio-meter tab.
 *  Hidden entirely if the track file isn't present. */
export function MusicControl() {
  const { status } = useSyncExternalStore(subscribe, getState, getState)

  useEffect(() => {
    initMusic()
  }, [])

  if (status === 'checking' || status === 'unavailable') return null
  const on = status === 'playing'

  return (
    <button
      type="button"
      className={`music ${on ? 'is-on' : ''}`}
      data-music-toggle
      onClick={toggleMusic}
      aria-pressed={on}
      aria-label={on ? 'Background music on. Turn music off' : 'Background music off. Turn music on'}
      title={on ? 'Music on' : 'Music off'}
    >
      <span className="music__meter" aria-hidden="true">
        {on ? (
          <>
            <i /> <i /> <i /> <i />
          </>
        ) : (
          <VolumeX size={14} strokeWidth={2.2} />
        )}
      </span>
      <span className="music__label" aria-hidden="true">
        <span className="music__rec" />
        {on ? 'Music on' : 'Music off'}
      </span>
    </button>
  )
}
