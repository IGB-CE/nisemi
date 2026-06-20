import { Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import About from './pages/About';
import HowItWorks from './pages/HowItWorks';
import Faq from './pages/Faq';
import Contact from './pages/Contact';
import Policy from './pages/Policy';
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <div className="site">
      <Header />
      <main className="site-main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/rreth" element={<About />} />
          <Route path="/si-funksionon" element={<HowItWorks />} />
          <Route path="/pyetje" element={<Faq />} />
          <Route path="/kontakt" element={<Contact />} />
          <Route path="/privacy" element={<Policy slug="privacy" />} />
          <Route path="/terms" element={<Policy slug="terms" />} />
          <Route path="/data-deletion" element={<Policy slug="data-deletion" />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
