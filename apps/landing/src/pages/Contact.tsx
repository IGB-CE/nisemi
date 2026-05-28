import { BUSINESS, FORMATTED_ADDRESS } from '../config';

export default function Contact() {
  return (
    <section className="section">
      <div className="container narrow">
        <h1 className="page-h1">Kontakt</h1>
        <p className="lead">
          Për pyetje, partneritete, propozime ose çështje ligjore, na kontakto nëpërmjet kanaleve të
          mëposhtme. Përgjigjemi zakonisht brenda 1–2 ditëve të punës.
        </p>

        <div className="contact-grid">
          <div className="contact-card">
            <div className="contact-icon">✉️</div>
            <h3>Email</h3>
            <p>
              <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a>
            </p>
            <p className="contact-note">Mënyra më e shpejtë për të na arritur.</p>
          </div>

          <div className="contact-card">
            <div className="contact-icon">📞</div>
            <h3>Telefon</h3>
            <p>
              <a href={`tel:${BUSINESS.phone.replace(/\s/g, '')}`}>{BUSINESS.phone}</a>
            </p>
            <p className="contact-note">E hënë–E premte, 09:00–18:00.</p>
          </div>

          <div className="contact-card">
            <div className="contact-icon">📍</div>
            <h3>Adresa</h3>
            <p>
              {BUSINESS.legalName}
              <br />
              {FORMATTED_ADDRESS}
            </p>
            <p className="contact-note">NIPT: {BUSINESS.nipt}</p>
          </div>
        </div>

        <div className="contact-legal">
          <h2 className="page-h2">Të dhëna ligjore</h2>
          <p>
            <strong>Emri ligjor:</strong> {BUSINESS.legalName}
            <br />
            <strong>NIPT:</strong> {BUSINESS.nipt}
            <br />
            <strong>Adresa e regjistruar:</strong> {FORMATTED_ADDRESS}
            <br />
            <strong>Email zyrtar:</strong>{' '}
            <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a>
            <br />
            <strong>Faqja zyrtare:</strong>{' '}
            <a href={`https://${BUSINESS.domain}`}>{BUSINESS.domain}</a>
          </p>
        </div>
      </div>
    </section>
  );
}
