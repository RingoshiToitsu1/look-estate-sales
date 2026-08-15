import Nav from './components/Nav.jsx'
import Hero from './components/Hero.jsx'
import Footer from './components/Footer.jsx'
import { Intro, Stats, Services, Auctions, Process, Reviews, Articles } from './components/Sections.jsx'
import './styles/components.css'

export default function App() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
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
