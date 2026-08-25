import CtaSection from "../../components/landing-page/cta-section.jsx";
import FaqSection from "../../components/landing-page/faq-section.jsx";
import Footer from "../../components/landing-page/footer.jsx";
import MainSection from "../../components/landing-page/main-section.jsx";
import ProblemSection from "../../components/landing-page/problem-section.jsx";
import SolutionSection from "../../components/landing-page/solution-section.jsx";
import { useDocumentTitle } from './../../hooks/use-document-title';

export default function HomePage() {
    useDocumentTitle("Maxsten");
  
  return (
    <main className="cursor-none">
      {/* Z-0: Paling bawah, diam ditimpa Problem */}
      <section id="beranda" className="relative z-0">
        <MainSection />
      </section>

      {/* Z-10: Naik nimpa Main, lalu diam ditimpa Solusi */}
      {/* Gue tambahin shadow & border transparan di atasnya biar ada efek 3D pas naik */}
      <section id="masalah" className="relative z-10">
        <ProblemSection />
      </section>
      {/* Z-30: Paling atas */}
      <section id="solusi" className="relative z-30">
        <SolutionSection />
      </section>
      <section className="relative z-30">
        <CtaSection />
      </section>

      <section id="faq" className="relative z-50">
        <FaqSection />
      </section>

      <section className="relative z-50">
        <Footer />
      </section>
    </main>
  );
}
