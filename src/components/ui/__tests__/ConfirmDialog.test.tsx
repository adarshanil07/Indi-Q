// =============================================================================
// components/ui/__tests__/ConfirmDialog.test.tsx
// =============================================================================

import { render, screen, fireEvent } from '@testing-library/react-native'
import { ConfirmDialog } from '../ConfirmDialog'

const baseProps = {
  visible: true,
  title: 'End game?',
  message: 'This cannot be undone.',
  confirmLabel: 'End Game',
  onCancel: jest.fn(),
  onConfirm: jest.fn(),
}

describe('ConfirmDialog', () => {
  it('renders title, message, and both action labels when visible', async () => {
    await render(<ConfirmDialog {...baseProps} />)
    expect(screen.getByText('End game?')).toBeTruthy()
    expect(screen.getByText('This cannot be undone.')).toBeTruthy()
    expect(screen.getByText('Cancel')).toBeTruthy()
    expect(screen.getByText('End Game')).toBeTruthy()
  })

  it('hides its content when not visible', async () => {
    await render(<ConfirmDialog {...baseProps} visible={false} />)
    expect(screen.queryByText('End game?')).toBeNull()
  })

  it('calls onCancel when Cancel is pressed', async () => {
    const onCancel = jest.fn()
    await render(<ConfirmDialog {...baseProps} onCancel={onCancel} />)
    await fireEvent.press(screen.getByText('Cancel'))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('calls onConfirm when the confirm button is pressed', async () => {
    const onConfirm = jest.fn()
    const onCancel = jest.fn()
    await render(<ConfirmDialog {...baseProps} onConfirm={onConfirm} onCancel={onCancel} />)
    await fireEvent.press(screen.getByText('End Game'))
    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onCancel).not.toHaveBeenCalled()
  })

  it('routes the hardware back button to onCancel', async () => {
    const onCancel = jest.fn()
    await render(<ConfirmDialog {...baseProps} onCancel={onCancel} />)
    const modal = screen.getByTestId('confirm-dialog-modal')
    await fireEvent(modal, 'requestClose')
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('renders non-destructive styling without crashing', async () => {
    await render(<ConfirmDialog {...baseProps} destructive={false} />)
    expect(screen.getByText('End Game')).toBeTruthy()
  })
})
