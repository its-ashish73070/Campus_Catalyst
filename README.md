# Campus Catalyst 2K26

Event website for **Campus Catalyst 2K26**, a 9-hour live innovation showdown by the College Innovation & Development Club (CIDC), Army Institute of Technology, Pune. 17 October 2026, 09:00–18:00.

The visual idea: a forgotten 1980s Indian college photo album that has become an interactive website.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build → dist/
npm run preview    # serve the production build locally
```

Requires Node 20+.

## Deploy

`npm run build` outputs a static site in `dist/`. Any static host works:

- **Vercel / Netlify**: import the repo. Build command `npm run build`, output directory `dist`.
- **GitHub Pages**: build, then publish `dist/`. If it is served from a sub-path (`/repo-name/`), set `base: '/repo-name/'` in `vite.config.ts`.

## Where to change things

All event content lives in **`src/data/event.ts`**.

| What | Where in `src/data/event.ts` |
|---|---|
| Registration link | `REGISTRATION_URL` at the top. Until it's set, Register buttons show a "opens soon" notice instead of a dead link. |
| Instagram / LinkedIn / CIDC site | `LINKS` |
| Date, time, venue, team size, eligibility | `EVENT` (`startISO` drives the countdown in the hero) |
| Prize amounts | `PRIZES` and `EVENT.prizePool` / `prizePoolLabel` |
| Problem statements | `PROBLEMS` (title, one-liner, full description, tags, photo) |
| Open-innovation text | `OPEN_INNOVATION` |
| Timeline | `TIMELINE`. Set `TIMELINE_IS_OFFICIAL = true` once CIDC publishes the official schedule; this removes the "suggested flow" disclaimer. |
| Rules / judging / CIDC blurb | `RULES`, `JUDGING`, `CIDC` |
| Photos, captions, alt text | `IMAGES`, `ARCHIVE` |

## Images

Real photographs go in **`src/assets/photos/`**. See `src/assets/photos/README.md` for the full list of filenames and a generation prompt for each.
Until a file is added, that slot shows an illustrated vintage placeholder (`src/components/Scene.tsx`).

## Background music

The track at **`public/audio/campus-catalyst-theme.mp3`** is an original 65-second 80s Indian disco loop composed for this site, so there are no licensing issues. It runs at 118 BPM in A minor, with a disco octave bass, a synth arpeggio, a synth lead with slides, brass stabs and a tabla break, finished with tape saturation and vinyl crackle. The generator script is `tools/music/compose_theme.py` (needs numpy); the reverb and mastering are done afterwards with ffmpeg. To use a different track, replace the file and keep the same name. If the file is missing, the floating music button hides itself.

- It plays at volume 0.15, fading in over about 2.4s and out over about 0.9s. To change these, edit `src/utils/music.ts`.
- It tries to start as soon as the page opens. Browsers often block sound for first-time visitors; in that case it starts on the first click, tap or key press, including one made during the intro. It won't start if they turned it off earlier; that choice is saved in `localStorage` as `cc-music`.
- The music pauses while the tab is hidden and resumes when the visitor comes back.
- For a seamless loop, export the MP3 with no silence at the start or end. A 1–3 minute track at 96–128 kbps keeps the file small.

## Project structure

```
src/
  animations/   GSAP + ScrollTrigger setup, useGsap hook
  assets/photos Real photographs (optional, auto-detected)
  components/   Photo, Scene, Nav, Cursor, Intro, AlbumInterlude, dialogs, buttons…
  data/         event.ts — every date, link, prize, rule and problem
  hooks/        Lenis smooth scroll, magnetic buttons, active section
  sections/     Hero, Story, Challenge, Problems, Timeline, FilmRoll, Rules,
                Prizes, Judging, Archive, Cidc, Register, Footer
  styles/       base.css (theme tokens), components.css, sections.css
  utils/        FX/low-power detection, synthesized sound, toast, scrolling
```

## Motion, accessibility and performance

- The intro (shutter → flash → photo develops) runs once per session, can be skipped, and never runs with reduced motion.
- **FX / LITE toggle** in the nav. LITE turns off pinned album transitions, scrubbed parallax, moving grain and the custom cursor. It is chosen automatically for `prefers-reduced-motion`, Save-Data, or very low-power devices.
- Smooth scrolling (Lenis), the camera-focus cursor and mouse parallax only run on desktop with a fine pointer.
- Sound is **off** by default. When switched on it plays synthesized shutter and film-advance clicks; there are no audio files.
- Semantic landmarks, a skip link, keyboard-reachable problem cards, native `<dialog>` modals (focus trap and Esc), a focus-trapped mobile menu, and alt text on every photo.
- Fonts are self-hosted with `@fontsource`. The problem dialog and lightbox are code-split, and images are lazy-loaded.
