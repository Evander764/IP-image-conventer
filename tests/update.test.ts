import { describe, expect, it } from 'vitest'
import {
  createUpdateState,
  isDownloadableUpdate,
  normalizeReleaseNotes,
  updatePromptChoice,
  updateStatusLabel
} from '../src/shared/update'

describe('update helpers', () => {
  it('creates a normalized idle state', () => {
    expect(createUpdateState('0.1.3')).toEqual({
      status: 'idle',
      currentVersion: '0.1.3',
      available: false
    })
  })

  it('only treats available states as downloadable', () => {
    expect(isDownloadableUpdate(createUpdateState('0.1.3', { status: 'available', available: true }))).toBe(true)
    expect(isDownloadableUpdate(createUpdateState('0.1.3', { status: 'unsupported', available: true }))).toBe(false)
    expect(isDownloadableUpdate(createUpdateState('0.1.3', { status: 'downloading', available: true }))).toBe(false)
  })

  it('maps update prompt responses to actions', () => {
    expect(updatePromptChoice(0)).toBe('download')
    expect(updatePromptChoice(1)).toBe('dismiss')
  })

  it('normalizes release notes from electron-updater payloads', () => {
    expect(normalizeReleaseNotes('  fixed update flow  ')).toBe('fixed update flow')
    expect(normalizeReleaseNotes([{ version: '0.1.4', note: 'silent installer' }])).toBe('0.1.4\nsilent installer')
    expect(normalizeReleaseNotes([])).toBeUndefined()
  })

  it('has labels for user-facing statuses', () => {
    expect(updateStatusLabel('checking')).toContain('检查')
    expect(updateStatusLabel('unsupported')).toContain('不支持')
  })
})
