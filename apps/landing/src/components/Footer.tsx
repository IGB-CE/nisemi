import { Link } from 'react-router-dom';
import { BUSINESS, FORMATTED_ADDRESS } from '../config';

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div>
          <div className="footer-brand">
            <span className="brand-mark sm">N</span>
            <span>Nisemi</span>
          </div>
          <p className="footer-tag">
            Udhëtimet me ndarje kostosh në Shqipëri. Lidh udhëtarët me shoferët që po nisen për të njëjtin destinacion.
          </p>
        </div>

        <div>
          <h4 className="footer-h">Faqet</h4>
          <ul className="footer-list">
            <li>
              <Link to="/rreth">Rreth nesh</Link>
            </li>
            <li>
              <Link to="/si-funksionon">Si funksionon</Link>
            </li>
            <li>
              <Link to="/pyetje">Pyetje të shpeshta</Link>
            </li>
            <li>
              <Link to="/kontakt">Kontakt</Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="footer-h">Ligjore</h4>
          <ul className="footer-list">
            <li>
              <Link to={BUSINESS.privacyUrl}>Politika e Privatësisë</Link>
            </li>
            <li>
              <Link to={BUSINESS.termsUrl}>Kushtet e Përdorimit</Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="footer-h">Kontakt</h4>
          <address className="footer-address">
            {BUSINESS.legalName}
            <br />
            {FORMATTED_ADDRESS}
            <br />
            NIPT: {BUSINESS.nipt}
            <br />
            <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a>
            <br />
            <a href={`tel:${BUSINESS.phone.replace(/\s/g, '')}`}>{BUSINESS.phone}</a>
          </address>
        </div>
      </div>

      <div className="container footer-bottom">
        <span>
          © {year} {BUSINESS.legalName}. Të gjitha të drejtat e rezervuara.
        </span>
      </div>
    </footer>
  );
}
