import { Link } from 'react-router-dom';
import { BUSINESS } from '../config';

export default function Home() {
  return (
    <>
      <section className="hero">
        <div className="container hero-inner">
          <h1 className="hero-title">
            Udhëto më lirë.
            <br />
            <span className="hl">Bashkë me të tjerët.</span>
          </h1>
          <p className="hero-sub">
            Nisemi është platforma shqiptare që lidh udhëtarët me shoferët që po nisen për të
            njëjtin destinacion. Ndani koston, kurseni kohë dhe ulni shpenzimet.
          </p>
          <div className="hero-cta">
            <Link to="/si-funksionon" className="btn btn-primary">
              Si funksionon
            </Link>
            <Link to="/kontakt" className="btn btn-outline">
              Na kontaktoni
            </Link>
          </div>
          <div className="store-links">
            <a
              href={BUSINESS.playStoreUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="store-link"
            >
              <span className="store-link-icon">▶</span>
              <span className="store-link-text">
                <small>Shkarkoje nga</small>
                Google Play
              </span>
            </a>
            <a
              href={BUSINESS.appStoreUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="store-link"
            >
              <span className="store-link-icon"></span>
              <span className="store-link-text">
                <small>Shkarkoje nga</small>
                App Store
              </span>
            </a>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <h2 className="section-title">Pse Nisemi?</h2>
          <div className="cards">
            <div className="card">
              <div className="card-icon">🚗</div>
              <h3>Gjej udhëtimin tënd</h3>
              <p>
                Kërko nga qyteti yt për në çdo destinacion brenda Shqipërisë. Shiko shoferin,
                makinën dhe çmimin përpara se të rezervosh.
              </p>
            </div>
            <div className="card">
              <div className="card-icon">💸</div>
              <h3>Ndani koston</h3>
              <p>
                Çmimi i udhëtimit ndahet midis udhëtarëve. Më lirë se taksia, më rehat se autobusi
                dhe pa stres për karburant.
              </p>
            </div>
            <div className="card">
              <div className="card-icon">⭐</div>
              <h3>Vlerësime të vërteta</h3>
              <p>
                Çdo udhëtim mund të vlerësohet. Shofer me reputacion të mirë = besim më i madh për
                udhëtarin tjetër.
              </p>
            </div>
            <div className="card">
              <div className="card-icon">📱</div>
              <h3>Krejt nga celulari</h3>
              <p>
                Postuoj një udhëtim ose rezervo vendin tënd direkt nga aplikacioni. Pa telefonata,
                pa pritje.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="section section-alt">
        <div className="container cta-band">
          <div>
            <h2 className="section-title">Gati për të udhëtuar?</h2>
            <p className="cta-sub">Aplikacioni Nisemi tashmë është në Google Play dhe App Store.</p>
          </div>
          <div className="hero-cta">
            <a href={BUSINESS.playStoreUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
              Google Play
            </a>
            <a href={BUSINESS.appStoreUrl} target="_blank" rel="noopener noreferrer" className="btn btn-outline">
              App Store
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
