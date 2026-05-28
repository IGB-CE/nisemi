import { useEffect, useState } from 'react';
import { marked } from 'marked';

interface Props {
  slug: 'privacy' | 'terms';
}

const TITLES: Record<Props['slug'], string> = {
  privacy: 'Politika e Privatësisë',
  terms: 'Kushtet e Përdorimit',
};

export default function Policy({ slug }: Props) {
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = `${TITLES[slug]} — Nisemi`;
    fetch(`/${slug}.md`)
      .then((r) => {
        if (!r.ok) throw new Error('Nuk u arrit të ngarkohej politika');
        return r.text();
      })
      .then((md) => marked.parse(md))
      .then((parsed) => setHtml(parsed as string))
      .catch((e) => setError(e.message));
  }, [slug]);

  return (
    <section className="section">
      <div className="container narrow">
        {error && <p className="lead">{error}</p>}
        {!error && !html && <p className="lead">Po ngarkohet…</p>}
        {!error && html && <article className="policy" dangerouslySetInnerHTML={{ __html: html }} />}
      </div>
    </section>
  );
}
