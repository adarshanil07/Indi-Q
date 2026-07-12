// =============================================================================
// components/card/__tests__/GameCard.test.tsx
// Reveal states, overlays, dimming, and word rendering.
// =============================================================================

import { render, screen, fireEvent } from '@testing-library/react-native'
import { GameCard } from '../GameCard'
import { makeCard } from '@/test-utils/fixtures'

const card = makeCard('c1', {
  wordsMl: {
    People: 'ആളുകൾ',
    Location: 'സ്ഥലം',
    Object: 'വസ്തു',
    Movie: 'സിനിമ',
    Nature: 'പ്രകൃതി',
    Random: 'റാൻഡം',
  },
})

describe('GameCard — hidden states', () => {
  it('shows TAP TO REVEAL before the turn starts', async () => {
    await render(
      <GameCard card={card} isRevealed={false} isVoided={false} selectedCategory={null} />,
    )
    expect(screen.getByText('TAP TO REVEAL')).toBeTruthy()
    expect(screen.getByText('Pass the phone to the describer first')).toBeTruthy()
    // Words are hidden while blurred
    expect(screen.queryByText('c1-Movie')).toBeNull()
  })

  it("shows TIME'S UP after the timer expires", async () => {
    await render(
      <GameCard
        card={card}
        isRevealed={false}
        isVoided={false}
        selectedCategory={null}
        isTimeUp
      />,
    )
    expect(screen.getByText("TIME'S UP")).toBeTruthy()
    expect(screen.getByText('Confirm the end of the round below')).toBeTruthy()
  })

  it('explains the category lock when reveal is blocked', async () => {
    await render(
      <GameCard
        card={card}
        isRevealed={false}
        isVoided={false}
        selectedCategory={null}
        needsCategory
      />,
    )
    expect(screen.getByText('SELECT A CATEGORY')).toBeTruthy()
  })

  it('fires onTapToReveal when the hidden card is tapped', async () => {
    const onTapToReveal = jest.fn()
    await render(
      <GameCard
        card={card}
        isRevealed={false}
        isVoided={false}
        selectedCategory={null}
        onTapToReveal={onTapToReveal}
      />,
    )
    await fireEvent.press(screen.getByTestId('game-card-c1'))
    expect(onTapToReveal).toHaveBeenCalledTimes(1)
  })
})

describe('GameCard — revealed', () => {
  it('shows all six words with their Malayalam companions', async () => {
    await render(
      <GameCard card={card} isRevealed isVoided={false} selectedCategory="Movie" />,
    )
    for (const cat of ['People', 'Location', 'Object', 'Movie', 'Nature', 'Random']) {
      expect(screen.getByText(`c1-${cat}`)).toBeTruthy()
    }
    expect(screen.getByText('സിനിമ')).toBeTruthy()
  })

  it('hides the reveal overlay once revealed', async () => {
    await render(
      <GameCard card={card} isRevealed isVoided={false} selectedCategory="Movie" />,
    )
    expect(screen.queryByText('TAP TO REVEAL')).toBeNull()
  })

  it('does not respond to taps once revealed', async () => {
    const onTapToReveal = jest.fn()
    await render(
      <GameCard
        card={card}
        isRevealed
        isVoided={false}
        selectedCategory="Movie"
        onTapToReveal={onTapToReveal}
      />,
    )
    await fireEvent.press(screen.getByTestId('game-card-c1'))
    expect(onTapToReveal).not.toHaveBeenCalled()
  })

  it('renders cards without Malayalam text', async () => {
    const plain = makeCard('c2')
    await render(
      <GameCard card={plain} isRevealed isVoided={false} selectedCategory={null} />,
    )
    expect(screen.getByText('c2-People')).toBeTruthy()
    expect(screen.queryByText('സിനിമ')).toBeNull()
  })
})

describe('GameCard — void overlay', () => {
  it('stamps VOID over a voided card', async () => {
    await render(
      <GameCard card={card} isRevealed isVoided selectedCategory="Movie" />,
    )
    expect(screen.getByText('VOID')).toBeTruthy()
    // The words remain visible beneath the overlay
    expect(screen.getByText('c1-Movie')).toBeTruthy()
  })

  it('shows no VOID stamp on a normal card', async () => {
    await render(
      <GameCard card={card} isRevealed isVoided={false} selectedCategory="Movie" />,
    )
    expect(screen.queryByText('VOID')).toBeNull()
  })
})
