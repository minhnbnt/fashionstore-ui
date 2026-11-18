import { describe, expect, it } from 'vite-plus/test'

import {
  CARD_CLASS,
  INPUT_CLASS,
  LABEL_CLASS,
  PANEL_CLASS,
  TEXTAREA_CLASS,
  cardClass,
  cn,
  dangerButtonClass,
  filterChipClass,
  filterRowClass,
  iconButtonClass,
  iconChipClass,
  optionPillClass,
  secondaryButtonClass,
  segmentedItemClass,
  segmentedTrackClass,
  sidebarItemClass,
  switchKnobClass,
  switchTrackClass,
} from './styles'

describe('cn', () => {
  it('gộp class tuừ nhiều nguồn', function () {
    expect(cn('px-2 py-1', 'text-sm')).toBe('px-2 py-1 text-sm')
  })

  it('bỏ qua class rỗng và false', function () {
    expect(cn('px-2', false, undefined, null, 'text-sm')).toBe('px-2 text-sm')
  })

  it('class sau ghi đè class trước cùng nhóm (twMerge)', function () {
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4')
  })
})

describe('style helpers', () => {
  it('segmented track là pill nền xám, item active dùng gradient brand', function () {
    expect(segmentedTrackClass()).toContain('rounded-full')
    expect(segmentedItemClass(true)).toContain('btn-primary')
    expect(segmentedItemClass(false)).not.toContain('btn-primary')
  })

  it('icon chip có nền gradient nhạt và bo góc vừa', function () {
    expect(iconChipClass()).toContain('rounded-xl')
    expect(iconChipClass()).toContain('from-indigo-50')
  })

  it('card có viền đủ thấy ở light mode', function () {
    expect(cardClass()).toContain('border-zinc-300/70')
  })

  it('filter chip dùng họ màu sky', function () {
    expect(filterChipClass()).toContain('sky')
  })

  it('switch track đổi màu theo trạng thái, knob luôn trắng', function () {
    expect(switchTrackClass(true)).toContain('bg-blue-600')
    expect(switchTrackClass(false)).toContain('bg-indigo-100')
    expect(switchKnobClass()).toContain('bg-white')
  })

  it('option trong sidebar dùng gradient brand khi đang chọn', function () {
    expect(optionPillClass(true)).toContain('btn-primary')
    expect(optionPillClass(false)).not.toContain('btn-primary')
    expect(filterRowClass(true)).toContain('btn-primary')
    expect(filterRowClass(false)).not.toContain('btn-primary')
  })

  it('form và panel constants tuân thủ design system DHMQ', function () {
    expect(LABEL_CLASS).toContain('font-bold')
    expect(INPUT_CLASS).toContain('rounded-full')
    expect(INPUT_CLASS).toContain('border-zinc-300')
    expect(INPUT_CLASS).toContain('dark:bg-white/10')
    expect(INPUT_CLASS).not.toContain('dark:bg-zinc-800')
    expect(TEXTAREA_CLASS).toContain('rounded-2xl')
    expect(CARD_CLASS).toContain('rounded-3xl')
    expect(CARD_CLASS).toContain('dark:bg-[#11182a]')
    expect(PANEL_CLASS).toContain('rounded-3xl')
    expect(PANEL_CLASS).toContain('p-5')
  })

  it('button và sidebar helpers dùng shape lock pill và btn-primary khi active', function () {
    expect(secondaryButtonClass()).toContain('rounded-full')
    expect(secondaryButtonClass()).toContain('dark:bg-white/10')
    expect(dangerButtonClass()).toContain('rounded-full')
    expect(dangerButtonClass()).toContain('bg-rose-600')
    expect(iconButtonClass()).toContain('rounded-full')
    expect(sidebarItemClass(true)).toContain('btn-primary')
    expect(sidebarItemClass(false)).not.toContain('btn-primary')
  })
})
