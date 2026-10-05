import Header from './components/Header'
import Hero from './components/Hero'
import {
  CategoryBento,
  DealMarquee,
  Editorial,
  Footer,
  LogoStrip,
  ProductGrid,
  Testimonials,
} from './components/Sections'

function App() {
  return (
    <div className="grain min-h-[100dvh]">
      <Header />
      <main>
        <Hero />
        <LogoStrip />
        <CategoryBento />
        <ProductGrid />
        <DealMarquee />
        <Editorial />
        <Testimonials />
      </main>
      <Footer />
    </div>
  )
}

export default App
