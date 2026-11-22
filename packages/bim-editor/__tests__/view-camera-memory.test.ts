import { CameraPlacement } from '../src/editor/views-sheets/view-camera-memory'

describe('camera placement gate', () => {
  it('a settle while a placement is still running is skipped, so a view does not remember where the camera was before it opened', () => {
    const placing = new CameraPlacement()
    placing.start('view:mech')
    expect(placing.inFlight).toBe(true)
  })

  it('once the placement is done, settles are remembered again', () => {
    const placing = new CameraPlacement()
    placing.start('view:mech')
    placing.finish('view:mech')
    expect(placing.inFlight).toBe(false)
  })

  it('a finish from a placement a newer one replaced does not unblock (a quick click from one view to the next)', () => {
    const placing = new CameraPlacement()
    placing.start('view:mech')
    placing.start('view:site')
    placing.finish('view:mech')
    // The first placement is still settling its way out; only the current one may clear the flag.
    expect(placing.inFlight).toBe(true)
    placing.finish('view:site')
    expect(placing.inFlight).toBe(false)
  })

  it('finishing an unknown key changes nothing', () => {
    const placing = new CameraPlacement()
    placing.start('view:mech')
    placing.finish('view:other')
    expect(placing.inFlight).toBe(true)
  })
})
