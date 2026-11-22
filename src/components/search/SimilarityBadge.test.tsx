// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vite-plus/test'

import SimilarityBadge from './SimilarityBadge'

afterEach(cleanup)

describe('SimilarityBadge', () => {
  it('lam tron thanh phan tram', () => {
    render(<SimilarityBadge similarity={0.937} />)
    expect(screen.getByText('94% giống')).toBeTruthy()
  })

  it('clamp similarity am ve 0 phan tram', () => {
    render(<SimilarityBadge similarity={-0.5} />)
    expect(screen.getByText('0% giống')).toBeTruthy()
  })
})
