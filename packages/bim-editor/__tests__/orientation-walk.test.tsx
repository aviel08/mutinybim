import { act, fireEvent, render, screen } from '@testing-library/react'
import { OrientationControls } from '../src/editor/orientation/OrientationControls'
import { TooltipProvider } from '../src/ui/tooltip'

// jsdom omits PointerEvent, causing fireEvent.pointer* to drop button state.
if (typeof globalThis.PointerEvent === 'undefined') {
  ;(globalThis as unknown as { PointerEvent: typeof MouseEvent }).PointerEvent = MouseEvent
}
// Radix captures the pointer and watches sizes; jsdom has neither.
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.setPointerCapture = () => {}
  Element.prototype.releasePointerCapture = () => {}
  Element.prototype.hasPointerCapture = () => false
}
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}

/** The viewer surface OrientationControls reads, with the walk as its own little state that tells its listeners. */
function viewerWith() {
  const listeners = new Set<(walking: boolean) => void>()
  let walking = false
  const tell = () => {
    for (const listener of listeners) listener(walking)
  }
  return {
    orientation: () => ({ azimuth: 0.6, polar: 1.05 }),
    onCameraChange: () => () => {},
    orientTo: async () => {},
    orbitBy: () => {},
    frame: async () => {},
    walking: jest.fn(() => walking),
    setWalk: jest.fn((on: boolean) => {
      if (on === walking) return
      walking = on
      tell()
    }),
    onWalkChange: (listener: (walking: boolean) => void) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}

function renderControls() {
  const viewer = viewerWith()
  render(
    <TooltipProvider>
      <OrientationControls
        viewer={viewer as unknown as Parameters<typeof OrientationControls>[0]['viewer']}
        rightInset={0}
        canCreateViews
        blockedReason=""
        onCreatePlan={() => {}}
        onCreateElevation={() => {}}
        trueNorthDeg={0}
        projection="perspective"
        onProjectionChange={() => {}}
      />
    </TooltipProvider>,
  )
  return viewer
}

const walkButton = () => screen.getByRole('button', { name: 'Walk the model' })

describe('the Walk switch on the view toolbar', () => {
  it('is there beside Home, not pressed', () => {
    renderControls()
    expect(walkButton()).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByTestId('orientation-walk')).toBe(walkButton())
    expect(screen.getByTestId('orientation-controls')).toHaveAttribute('data-walking', 'false')
    // Home comes first, then Walk: the same order on screen.
    const home = screen.getByTestId('orientation-home')
    expect(home.compareDocumentPosition(walkButton()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('clicking it starts the walk, and the button shows it is on', () => {
    const viewer = renderControls()
    fireEvent.click(walkButton())
    expect(viewer.setWalk).toHaveBeenCalledTimes(1)
    expect(viewer.setWalk).toHaveBeenCalledWith(true)
    expect(walkButton()).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTestId('orientation-controls')).toHaveAttribute('data-walking', 'true')
  })

  it('clicking it again stops the walk', () => {
    const viewer = renderControls()
    fireEvent.click(walkButton())
    fireEvent.click(walkButton())
    expect(viewer.setWalk).toHaveBeenLastCalledWith(false)
    expect(walkButton()).toHaveAttribute('aria-pressed', 'false')
  })

  it('follows a walk started and stopped elsewhere (W starts it, Esc stops it)', () => {
    const viewer = renderControls()
    act(() => viewer.setWalk(true))
    expect(walkButton()).toHaveAttribute('aria-pressed', 'true')
    act(() => viewer.setWalk(false))
    expect(walkButton()).toHaveAttribute('aria-pressed', 'false')
  })

  it('is pressed from the first frame when the view opens mid-walk', () => {
    const viewer = viewerWith()
    viewer.setWalk(true)
    render(
      <TooltipProvider>
        <OrientationControls
          viewer={viewer as unknown as Parameters<typeof OrientationControls>[0]['viewer']}
          rightInset={0}
          canCreateViews
          blockedReason=""
          onCreatePlan={() => {}}
          onCreateElevation={() => {}}
          trueNorthDeg={0}
          projection="perspective"
          onProjectionChange={() => {}}
        />
      </TooltipProvider>,
    )
    expect(walkButton()).toHaveAttribute('aria-pressed', 'true')
  })
})
