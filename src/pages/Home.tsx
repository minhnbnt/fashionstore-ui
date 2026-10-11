import { useState } from 'react'

import Hero from '../components/Hero'
import {
  CategoryBento,
  DealMarquee,
  DEFAULT_SEARCH_KEYWORD,
  Editorial,
  LogoStrip,
  ProductGrid,
  Testimonials,
} from '../components/Sections'

export default function Home() {
  const [keyword, setKeyword] = useState(DEFAULT_SEARCH_KEYWORD)
  return (
    <main>
      <Hero />
      <LogoStrip />
      <CategoryBento onSelect={setKeyword} />
      <ProductGrid keyword={keyword} />
      <DealMarquee />
      <Editorial />
      <Testimonials />
    </main>
  )
}
