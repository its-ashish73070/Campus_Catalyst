import { RegisterButton } from '../components/Button'
import { EVENT } from '../data/event'

export function Register() {
  return (
    <section id="register" className="register" aria-labelledby="register-title">
      <div className="register__burn" aria-hidden="true">
        <span className="burn burn--l" />
        <span className="burn burn--r" />
        <span className="burn burn--t" />
      </div>
      <div className="register__inner">
        <p className="eyebrow text-stamp">Last frame on the roll</p>
        <h2 id="register-title" className="register__title t-display misreg">
          Ready to build
          <br />
          something real?
        </h2>
        <RegisterButton size="xl" className="register__btn">
          Register on Unstop
        </RegisterButton>
        <p className="register__when t-type">
          <span>{EVENT.dateLabel}</span>
          <span aria-hidden="true">✶</span>
          <span>{EVENT.timeLabel}</span>
          <span aria-hidden="true">✶</span>
          <span>AIT, Pune</span>
        </p>
        <p className="register__fine">
          Teams of 2–4 · FE &amp; SE students of AIT, Pune · Offline event
        </p>
      </div>
    </section>
  )
}
