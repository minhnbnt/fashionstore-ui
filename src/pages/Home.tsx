import { useState } from 'react'

import FlashSale from '../components/FlashSale'
import Hero from '../components/Hero'
import QuickServices from '../components/QuickServices'
import {
  CategoryBento,
  DealMarquee,
  Editorial,
  LogoStrip,
  ProductGrid,
  Testimonials,
} from '../components/Sections'

import type { CategoryResponse } from '@generated/model/categoryResponse'

export default function Home() {
  const [category, setCategory] = useState<CategoryResponse | null>(null)

  return (
    <main>
      <Hero />
      <QuickServices />
      <FlashSale />
      <LogoStrip />
      <CategoryBento
        onSelect={function (c) {
          setCategory(c)
          document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth' })
        }}
      />
      <ProductGrid category={category} />
      <DealMarquee />
      <Editorial />
      <Testimonials />
    </main>
  )
}
