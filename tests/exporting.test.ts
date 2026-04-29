import { describe, expect, it } from 'vitest'
import { pagePathIndex, parsePageRange } from '../src/shared/exporting'

describe('exporting helpers', () => {
  it('returns all pages when range is empty', () => {
    expect(parsePageRange('', 4)).toEqual([1, 2, 3, 4])
    expect(parsePageRange(undefined, 3)).toEqual([1, 2, 3])
  })

  it('parses comma and range syntax', () => {
    expect(parsePageRange('1-3,5', 6)).toEqual([1, 2, 3, 5])
    expect(parsePageRange('2,4,6', 6)).toEqual([2, 4, 6])
  })

  it('ignores out-of-range pages and falls back when nothing matches', () => {
    expect(parsePageRange('0,2,9', 3)).toEqual([2])
    expect(parsePageRange('8-10', 3)).toEqual([1, 2, 3])
  })

  it('extracts rendered page indexes from file names', () => {
    expect(pagePathIndex('C:/tmp/page-003.png')).toBe(3)
    expect(pagePathIndex('C:/tmp/long.png')).toBeNull()
  })
})
