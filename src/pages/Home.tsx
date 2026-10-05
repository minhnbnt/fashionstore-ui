import Hero from '../components/Hero'
import {
  CategoryBento,
  DealMarquee,
  Editorial,
  LogoStrip,
  ProductGrid,
  Testimonials,
} from '../components/Sections'

export default function Home() {
  return (
    <main>
      <Hero />
      <LogoStrip />
      <CategoryBento />
      <ProductGrid />
      <DealMarquee />
      <Editorial />
      <Testimonials />
    </main>
  )
}
