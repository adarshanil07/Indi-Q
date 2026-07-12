// =============================================================================
// components/ui/__tests__/CategoryBar.test.tsx
// Selection behaviour of the six vectorized category boxes.
// =============================================================================

import { render, screen, fireEvent } from '@testing-library/react-native'
import { CategoryBar } from '../CategoryBar'
import { CATEGORIES } from '@/constants/categories'

function renderBar(props: Partial<React.ComponentProps<typeof CategoryBar>> = {}) {
  const onSelect = jest.fn()
  return render(
    <CategoryBar selectedCategory={null} onSelect={onSelect} {...props} />,
  ).then(() => ({ onSelect: props.onSelect ?? onSelect }))
}

describe('CategoryBar', () => {
  it('renders one tappable box per category', async () => {
    await renderBar()
    for (const cat of CATEGORIES) {
      expect(screen.getByTestId(`category-box-${cat}`)).toBeTruthy()
    }
  })

  it('reports the tapped category through onSelect', async () => {
    const { onSelect } = await renderBar()
    await fireEvent.press(screen.getByTestId('category-box-People'))
    expect(onSelect).toHaveBeenCalledWith('People')
    await fireEvent.press(screen.getByTestId('category-box-Movie'))
    expect(onSelect).toHaveBeenCalledWith('Movie')
    await fireEvent.press(screen.getByTestId('category-box-Random'))
    expect(onSelect).toHaveBeenCalledWith('Random')
  })

  it('still allows changing the selection after one is made', async () => {
    const { onSelect } = await renderBar({ selectedCategory: 'Movie' })
    await fireEvent.press(screen.getByTestId('category-box-Location'))
    expect(onSelect).toHaveBeenCalledWith('Location')
  })

  it('ignores taps when interactive is false', async () => {
    const { onSelect } = await renderBar({ interactive: false })
    for (const cat of CATEGORIES) {
      await fireEvent.press(screen.getByTestId(`category-box-${cat}`))
    }
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('dims every box except the selected one', async () => {
    await renderBar({ selectedCategory: 'Object' })
    const json = JSON.stringify(screen.toJSON())
    // Five of the six boxes carry the dimmed opacity; the selected one is
    // scaled up instead.
    expect(json.match(/"opacity":0\.25/g)).toHaveLength(5)
    expect(json).toContain('"scale":1.12')
  })

  it('dims nothing while no category is selected', async () => {
    await renderBar()
    const json = JSON.stringify(screen.toJSON())
    expect(json.match(/"opacity":0\.25/g)).toBeNull()
  })
})
