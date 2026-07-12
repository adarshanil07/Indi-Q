// =============================================================================
// components/intro/__tests__/IntroSequence.test.tsx
// Branded intro overlay: tap-to-skip fires onDone exactly once.
// =============================================================================

import { render, screen, fireEvent, act } from '@testing-library/react-native'
import { IntroSequence } from '../IntroSequence'

describe('IntroSequence', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('renders without crashing', async () => {
    await render(<IntroSequence onDone={jest.fn()} />)
    expect(screen.toJSON()).toBeTruthy()
  })

  it('tap anywhere skips the intro', async () => {
    const onDone = jest.fn()
    await render(<IntroSequence onDone={onDone} />)
    const pressable = screen.root!.queryAll(
      i => typeof i.props.onClick === 'function' || typeof i.props.onPress === 'function',
    )[0]
    await fireEvent.press(pressable ?? screen.root!)
    expect(onDone).toHaveBeenCalledTimes(1)
  })

  it('never fires onDone twice on repeated taps', async () => {
    const onDone = jest.fn()
    await render(<IntroSequence onDone={onDone} />)
    const pressable = screen.root!.queryAll(
      i => typeof i.props.onClick === 'function' || typeof i.props.onPress === 'function',
    )[0]
    await fireEvent.press(pressable ?? screen.root!)
    await fireEvent.press(pressable ?? screen.root!)
    await act(async () => jest.advanceTimersByTime(5_000))
    expect(onDone).toHaveBeenCalledTimes(1)
  })
})
