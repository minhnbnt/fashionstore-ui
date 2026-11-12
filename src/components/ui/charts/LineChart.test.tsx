import { createElement } from 'react'
import { renderToString } from 'react-dom/server'

import { describe, expect, it } from 'vite-plus/test'

import { LineChart, type LineChartPoint } from './LineChart'

describe('LineChart', () => {
  it('render trạng thái rỗng khi không có dữ liệu', () => {
    const html = renderToString(createElement(LineChart, { data: [] }))
    expect(html).toContain('Không có dữ liệu biểu đồ')
  })

  it('render SVG biểu đồ khi có dữ liệu điểm và nhãn', () => {
    const points: LineChartPoint[] = [
      { label: '2026-10-19', value: 1000000 },
      { label: '2026-10-20', value: 2500000 },
      { label: '2026-10-21', value: 1800000 },
    ]

    const html = renderToString(
      createElement(LineChart, {
        data: points,
        currentLabel: 'Doanh thu (VND)',
        height: 240,
      }),
    )

    expect(html).toContain('Doanh thu (VND)')
    expect(html).toContain('<svg')
    expect(html).toContain('viewBox=')
    expect(html).toContain('overflow-hidden')
    expect(html).toContain('19/10')
    expect(html).toContain('20/10')
    expect(html).toContain('21/10')
  })

  it('render đường so sánh khi có comparisonData', () => {
    const points: LineChartPoint[] = [
      { label: '2026-10-19', value: 1000000 },
      { label: '2026-10-20', value: 2500000 },
    ]
    const comparisonPoints: LineChartPoint[] = [
      { label: '2026-10-12', value: 800000 },
      { label: '2026-10-13', value: 1200000 },
    ]

    const html = renderToString(
      createElement(LineChart, {
        data: points,
        comparisonData: comparisonPoints,
        currentLabel: 'Hiện tại',
        comparisonLabel: 'Kỳ trước',
      }),
    )

    expect(html).toContain('Hiện tại')
    expect(html).toContain('Kỳ trước')
    expect(html).toContain('stroke-dasharray="4 4"')
  })

  it('cho phep tuy bien formatAxisValue va maxY ma khong gan mac dinh ky hieu VND', () => {
    const html = renderToString(
      createElement(LineChart, {
        data: [
          { label: '2026-10-19', value: 4.5 },
          { label: '2026-10-20', value: 3.2 },
        ],
        maxY: 5,
        formatAxisValue: (val) => `${val}★`,
        formatValue: (val) => `${val.toFixed(2)}★`,
      }),
    )

    expect(html).toContain('5★')
    expect(html).toContain('2.5★')
    expect(html).toContain('0★')
    expect(html).not.toContain('₫')
  })
})
