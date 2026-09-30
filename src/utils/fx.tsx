import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { setSoundEnabled } from './sound'

type Fx = {
  /** heavy effects: moving grain, pinned scroll scenes, parallax */
  full: boolean
  /** true when OS asks for reduced motion */
  reduced: boolean
  /** fine pointer + wide screen: custom cursor & mouse parallax allowed */
  desktop: boolean
  sound: boolean
  toggleFx: () => void
  toggleSound: () => void
}

const FxContext = createContext<Fx | null>(null)

const safeGet = (k: string) => {
  try { return localStorage.getItem(k) } catch { return null }
}
const safeSet = (k: string, v: string) => {
  try { localStorage.setItem(k, v) } catch { /* private mode */ }
}

function detectLowPower() {
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } }
  if (nav.connection?.saveData) return true
  if (nav.deviceMemory !== undefined && nav.deviceMemory <= 2) return true
  if (nav.hardwareConcurrency !== undefined && nav.hardwareConcurrency <= 2) return true
  return false
}

const mq = (q: string) => window.matchMedia(q)

export function FxProvider({ children }: { children: ReactNode }) {
  const [reduced, setReduced] = useState(() => mq('(prefers-reduced-motion: reduce)').matches)
  const [desktop, setDesktop] = useState(() => mq('(pointer: fine) and (min-width: 1024px)').matches)
  const [userFx, setUserFx] = useState<string | null>(() => safeGet('cc-fx'))
  const [sound, setSound] = useState(true)

  useEffect(() => {
    setSoundEnabled(true)
  }, [])

  useEffect(() => {
    const a = mq('(prefers-reduced-motion: reduce)')
    const b = mq('(pointer: fine) and (min-width: 1024px)')
    const onA = () => setReduced(a.matches)
    const onB = () => setDesktop(b.matches)
    a.addEventListener('change', onA)
    b.addEventListener('change', onB)
    return () => {
      a.removeEventListener('change', onA)
      b.removeEventListener('change', onB)
    }
  }, [])

  const full = userFx ? userFx === 'full' : !reduced && !detectLowPower()

  useEffect(() => {
    document.documentElement.classList.toggle('fx-full', full)
    document.documentElement.classList.toggle('fx-lite', !full)
  }, [full])

  const toggleFx = useCallback(() => {
    const next = full ? 'lite' : 'full'
    safeSet('cc-fx', next)
    setUserFx(next)
  }, [full])

  const toggleSound = useCallback(() => {
    setSound((s) => {
      setSoundEnabled(!s)
      return !s
    })
  }, [])

  const value = useMemo(
    () => ({ full, reduced, desktop, sound, toggleFx, toggleSound }),
    [full, reduced, desktop, sound, toggleFx, toggleSound],
  )
  return <FxContext.Provider value={value}>{children}</FxContext.Provider>
}

export function useFx() {
  const v = useContext(FxContext)
  if (!v) throw new Error('useFx must be used inside <FxProvider>')
  return v
}
