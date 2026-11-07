import { useState } from 'react'

import Hero from '../components/home/Hero'
import { BannerCarousel, BannerStrip } from '../components/home/HomeBanners'
import {
  CategoryBento,
  DealMarquee,
  Editorial,
  LogoStrip,
  ProductGrid,
  Testimonials,
} from '../components/home/Sections'
import SitePopup from '../components/SitePopup'

import type { CategoryResponse } from '@generated/model/categoryResponse'

export default function Home() {
  const [category, setCategory] = useState<CategoryResponse | null>(null)
  return (
    <main>
      <Hero />
      <BannerCarousel />
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
