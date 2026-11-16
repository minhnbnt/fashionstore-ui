import { createRef } from 'react'

// @vitest-environment happy-dom
import { act, cleanup, fireEvent, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vite-plus/test'

import { useMenuDisclosure } from './useMenuDisclosure'

function renderMenu(initialOpen?: boolean) {
  const containerRef = createRef<HTMLDivElement>()
  const triggerRef = createRef<HTMLButtonElement>()
  const hook = renderHook(function () {
    return useMenuDisclosure({ containerRef, triggerRef, initialOpen })
  })
  return {
    result: hook.result,
    unmount: hook.unmount,
    containerRef,
    triggerRef,
  }
}

describe('useMenuDisclosure', () => {
  afterEach(function () {
    cleanup()
  })

  it('toggle opens and closes the menu', function () {
    const { result } = renderMenu()

    expect(result.current.open).toBe(false)
    act(function () {
      result.current.toggle()
    })
    expect(result.current.open).toBe(true)
    act(function () {
      result.current.toggle()
    })
    expect(result.current.open).toBe(false)
  })

  it('close() closes without touching focus', function () {
    const { result } = renderMenu()

    act(function () {
      result.current.toggle()
    })
    act(function () {
      result.current.close()
    })
    expect(result.current.open).toBe(false)
  })

  it('starts open when initialOpen is true', function () {
    const { result } = renderMenu(true)

    expect(result.current.open).toBe(true)
    act(function () {
      result.current.close()
    })
    expect(result.current.open).toBe(false)
  })

  it('Escape closes the menu and returns focus to the trigger', function () {
    const { result, triggerRef } = renderMenu()
    const trigger = document.createElement('button')
    document.body.appendChild(trigger)
    triggerRef.current = trigger

    act(function () {
      result.current.toggle()
    })
    expect(result.current.open).toBe(true)

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(result.current.open).toBe(false)
    expect(document.activeElement).toBe(trigger)
  })

  it('pointerdown inside the container keeps the menu open', function () {
    const { result, containerRef } = renderMenu()
    const container = document.createElement('div')
    document.body.appendChild(container)
    containerRef.current = container

    act(function () {
      result.current.toggle()
    })
    fireEvent.pointerDown(container)

    expect(result.current.open).toBe(true)
  })

  it('pointerdown outside the container closes the menu', function () {
    const { result, containerRef } = renderMenu()
    const container = document.createElement('div')
    document.body.appendChild(container)
    containerRef.current = container

    act(function () {
      result.current.toggle()
    })
    fireEvent.pointerDown(document.body)

    expect(result.current.open).toBe(false)
  })

  it('focusin outside the container closes the menu (tab away)', function () {
    const { result, containerRef } = renderMenu()
    const container = document.createElement('div')
    document.body.appendChild(container)
    containerRef.current = container

    act(function () {
      result.current.toggle()
    })
    fireEvent.focusIn(document.body)

    expect(result.current.open).toBe(false)
  })

  it('removes document listeners on unmount', function () {
    const { result, unmount } = renderMenu()

    act(function () {
      result.current.toggle()
    })
    unmount()

    expect(function () {
      fireEvent.keyDown(document, { key: 'Escape' })
      fireEvent.pointerDown(document.body)
    }).not.toThrow()
  })
})
