import { useEffect, useState } from 'react'
import { ScrollTrigger } from './animations/gsap'
import { Cursor } from './components/Cursor'
import { Intro } from './components/Intro'
import { Marquee } from './components/Marquee'
import { MusicControl } from './components/MusicControl'
import { Nav } from './components/Nav'
import { Toast } from './components/Toast'
import { EVENT } from './data/event'
import { useLenis } from './hooks/useLenis'
import { Archive } from './sections/Archive'
import { Challenge } from './sections/Challenge'
import { Cidc } from './sections/Cidc'
import { FilmRoll } from './sections/FilmRoll'
import { Footer } from './sections/Footer'
import { Hero } from './sections/Hero'
import { Judging } from './sections/Judging'
import { Prizes } from './sections/Prizes'
import { Problems } from './sections/Problems'
import { Register } from './sections/Register'
import { Rules } from './sections/Rules'
import { Story } from './sections/Story'
import { Timeline } from './sections/Timeline'
import { useFx } from './utils/fx'

const TICKER = ['9 hours', 'One campus', 'Infinite ideas', EVENT.dateShort, 'AIT, Pune', 'Build what matters', `${EVENT.prizePoolLabel} prize pool`]
const TICKER_2 = ['Idea portal', 'Campus navigation', 'Mess crowd', 'Digital library', 'Smart leave', 'Open innovation']

export default function App() {
  const { full, desktop } = useFx()
  const [ready, setReady] = useState(false)
  useLenis(full && desktop)

  // pinned sections change layout height when FX mode flips; recalc triggers
  useEffect(() => {
    const id = requestAnimationFrame(() => ScrollTrigger.refresh())
    return () => cancelAnimationFrame(id)
  }, [full, desktop])

  // images / fonts arriving late also shift layout
  useEffect(() => {
    const onLoad = () => ScrollTrigger.refresh()
    window.addEventListener('load', onLoad)
    document.fonts?.ready.then(onLoad)
    return () => window.removeEventListener('load', onLoad)
  }, [])

  // honour deep links like /#prizes after first layout
  useEffect(() => {
    if (!ready || !location.hash) return
    const el = document.getElementById(location.hash.slice(1))
    if (el) setTimeout(() => el.scrollIntoView(), 50)
  }, [ready])

  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <Intro onDone={() => setReady(true)} />
      <Nav />
      <main id="main">
        <Hero ready={ready} />
        <Marquee items={TICKER} className="marquee--red" />
        <Story />
        <Challenge />
        <Problems />
        <Timeline />
        <FilmRoll />
        <Rules />
        <Prizes />
        <Judging />
        <Marquee items={TICKER_2} className="marquee--ink" reverse />
        <Archive />
        <Cidc />
        <Register />
      </main>
      <Footer />
      <div className="grain-layer" aria-hidden="true" />
      <div className="vignette-layer" aria-hidden="true" />
      <Cursor />
      <MusicControl />
      <Toast />
    </>
  )
}
