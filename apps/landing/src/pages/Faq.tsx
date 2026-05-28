interface QA {
  q: string;
  a: string;
}

const FAQS: QA[] = [
  {
    q: 'Sa kushton përdorimi i aplikacionit Nisemi?',
    a: 'Aplikacioni është falas për t\'u shkarkuar dhe përdorur. Pagesa midis shoferit dhe udhëtarit caktohet kur postuhet udhëtimi — Nisemi nuk mban komision nga pagesa.',
  },
  {
    q: 'A duhet të jem shofer profesionist për të postuar një udhëtim?',
    a: 'Jo. Nisemi është për të gjithë ata që udhëtojnë me makinë private dhe duan të ndajnë koston me udhëtarë të tjerë. Nuk është një shërbim taksie.',
  },
  {
    q: 'Si caktohet çmimi i udhëtimit?',
    a: 'Çmimin për person e cakton vetë shoferi kur postuohet udhëtimi. Aplikacioni jep një sugjerim bazuar në distancën dhe rrugën, por shoferi ka fjalën e fundit.',
  },
  {
    q: 'Çfarë ndodh nëse anuloj rezervimin?',
    a: 'Mund të anulosh rezervimin përpara nisjes së udhëtimit. Rekomandojmë gjithmonë të njoftosh shoferin sa më herët që mundesh, që të mos lësh vende të zëna pa nevojë.',
  },
  {
    q: 'A janë të verifikuar shoferët?',
    a: 'Çdo shofer kalon nëpër një proces verifikimi përpara se të aktivizohet në platformë. Përveç kësaj, sistemi i vlerësimeve publike e bën komunitetin vetërregullues.',
  },
  {
    q: 'A funksionon Nisemi jashtë Shqipërisë?',
    a: 'Aktualisht jemi të fokusuar vetëm në Shqipëri. Mbulojmë qytete të vogla dhe të mëdha brenda vendit.',
  },
  {
    q: 'Si i raportoj një problem ose përdorues të papërshtatshëm?',
    a: 'Brenda aplikacionit ka një opsion "Raporto" për çdo udhëtim dhe profil. Mund të na shkruash edhe direkt në info@nisemi.al.',
  },
];

export default function Faq() {
  return (
    <section className="section">
      <div className="container narrow">
        <h1 className="page-h1">Pyetje të shpeshta</h1>
        <p className="lead">
          Përgjigjet për gjërat që na pyesin më shpesh. Nëse pyetja jote s'është këtu,
          <a href="/kontakt"> na shkruaj</a>.
        </p>

        <div className="faq-list">
          {FAQS.map((item, i) => (
            <details key={i} className="faq-item">
              <summary>{item.q}</summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
