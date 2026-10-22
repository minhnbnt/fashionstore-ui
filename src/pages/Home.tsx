import { useState } from 'react'

import FlashSale from '../components/FlashSale'
import Hero from '../components/Hero'
import { BannerCarousel, BannerStrip } from '../components/HomeBanners'
import {
  CategoryBento,
  DealMarquee,
  Editorial,
  LogoStrip,
  ProductGrid,
  Testimonials,
} from '../components/Sections'
import SitePopup from '../components/SitePopup'

import type { CategoryResponse } from '@generated/model/categoryResponse'

export default function Home() {
  const [category, setCategory] = useState<CategoryResponse | null>(null)

  return (
    <main>
      <Hero />
      <BannerCarousel />
      <FlashSale />
      <LogoStrip />
      <CategoryBento
        onSelect={function (c) {
          setCategory(c)
          document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth' })
        }}
      />
      <ProductGrid category={category} />
      <BannerStrip />
      <DealMarquee />
      <Editorial />
      <Testimonials />
      <SitePopup />
    </main>
  )
}
