// =============================================================================
// utils/__tests__/setupStorage.test.ts
// Persistence of Setup screen choices via AsyncStorage.
// =============================================================================

import AsyncStorage from '@react-native-async-storage/async-storage'
import { loadSavedSetup, saveSetup, type SavedSetup } from '../setupStorage'

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
)

const STORAGE_KEY = 'indiq.setup.v1'

const sampleSetup: SavedSetup = {
  teamCount: 3,
  teamNames: ['Red', 'Blue', 'Green'],
  timerDuration: 90,
  maxActiveCards: 3,
  boardMode: false,
  targetScoreText: '15',
  chakraCardCount: 4,
  chakraReward: 'extra-round',
}

beforeEach(async () => {
  await AsyncStorage.clear()
})

describe('saveSetup / loadSavedSetup round trip', () => {
  it('restores exactly what was saved', async () => {
    await saveSetup(sampleSetup)
    const loaded = await loadSavedSetup()
    expect(loaded).toEqual(sampleSetup)
  })

  it('writes under the versioned storage key', async () => {
    await saveSetup(sampleSetup)
    const raw = await AsyncStorage.getItem(STORAGE_KEY)
    expect(raw).not.toBeNull()
    expect(JSON.parse(raw!)).toEqual(sampleSetup)
  })

  it('overwrites a previous save', async () => {
    await saveSetup(sampleSetup)
    await saveSetup({ ...sampleSetup, timerDuration: 30 })
    const loaded = await loadSavedSetup()
    expect(loaded?.timerDuration).toBe(30)
  })

  it('preserves numeric chakraReward values', async () => {
    await saveSetup({ ...sampleSetup, chakraReward: 2 })
    const loaded = await loadSavedSetup()
    expect(loaded?.chakraReward).toBe(2)
  })
})

describe('loadSavedSetup edge cases', () => {
  it('returns null when nothing has been saved', async () => {
    expect(await loadSavedSetup()).toBeNull()
  })

  it('returns null for corrupt JSON instead of throwing', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, '{not valid json!!')
    await expect(loadSavedSetup()).resolves.toBeNull()
  })

  it('returns null when the storage read throws', async () => {
    const spy = jest
      .spyOn(AsyncStorage, 'getItem')
      .mockRejectedValueOnce(new Error('disk error'))
    await expect(loadSavedSetup()).resolves.toBeNull()
    spy.mockRestore()
  })
})

describe('saveSetup edge cases', () => {
  it('swallows storage write failures (best-effort persistence)', async () => {
    const spy = jest
      .spyOn(AsyncStorage, 'setItem')
      .mockRejectedValueOnce(new Error('quota exceeded'))
    await expect(saveSetup(sampleSetup)).resolves.toBeUndefined()
    spy.mockRestore()
  })
})
