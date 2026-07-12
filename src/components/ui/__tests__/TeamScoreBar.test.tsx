// =============================================================================
// components/ui/__tests__/TeamScoreBar.test.tsx
// =============================================================================

import { render, screen, fireEvent } from '@testing-library/react-native'
import { TeamScoreBar } from '../TeamScoreBar'
import type { Team } from '@/types/game'

const teams: Team[] = [
  { id: 'team-0', name: 'Red Rockets', score: 4 },
  { id: 'team-1', name: 'Blue Bandits', score: 7 },
]

describe('TeamScoreBar', () => {
  it('renders every team name and score', async () => {
    await render(<TeamScoreBar teams={teams} activeTeamId="team-0" />)
    expect(screen.getByText('Red Rockets')).toBeTruthy()
    expect(screen.getByText('4')).toBeTruthy()
    expect(screen.getByText('Blue Bandits')).toBeTruthy()
    expect(screen.getByText('7')).toBeTruthy()
  })

  it('fires onLongPressTeam with the held team id', async () => {
    const onLongPressTeam = jest.fn()
    await render(
      <TeamScoreBar teams={teams} activeTeamId="team-0" onLongPressTeam={onLongPressTeam} />,
    )
    await fireEvent(screen.getByText('Blue Bandits'), 'longPress')
    expect(onLongPressTeam).toHaveBeenCalledWith('team-1')
  })

  it('does not crash on long press without a handler', async () => {
    await render(<TeamScoreBar teams={teams} activeTeamId="team-0" />)
    await expect(
      fireEvent(screen.getByText('Red Rockets'), 'longPress'),
    ).resolves.not.toThrow()
  })

  it('renders an empty container with no teams', async () => {
    await render(<TeamScoreBar teams={[]} activeTeamId="" />)
    expect(screen.toJSON()).toBeTruthy()
  })
})
