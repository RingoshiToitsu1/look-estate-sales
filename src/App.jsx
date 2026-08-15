import Nav from './components/Nav.jsx'
import CineHero from './components/CineHero.jsx'
import Footer from './components/Footer.jsx'
import { Intro, Stats, Services, Auctions, Process, Reviews, Articles } from './components/Sections.jsx'
import './styles/components.css'

export default function App() {
  return (
    <>
      <Nav />
      <main>
        <CineHero />
        <Intro />
        <Stats />
        <Services />
        <Auctions />
        <Process />
        <Reviews />
        <Articles />
      </main>
      <Footer />
    </>
  )
}
