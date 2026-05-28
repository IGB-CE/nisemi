import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <section className="section">
      <div className="container narrow text-center">
        <h1 className="page-h1">Faqja nuk u gjet</h1>
        <p className="lead">Faqja që po kërkon nuk ekziston ose është zhvendosur.</p>
        <Link to="/" className="btn btn-primary">
          Kthehu në ballinë
        </Link>
      </div>
    </section>
  );
}
