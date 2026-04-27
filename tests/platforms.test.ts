import { describe, expect, it } from 'vitest'
import { createAssistantSuggestions } from '../src/shared/assistant'
import { getPlatformPreset } from '../src/shared/platforms'

describe('platform presets', () => {
  it('defines cover sizes for supported platforms', () => {
    expect(getPlatformPreset('xiaohongshu').coverSize).toEqual({ width: 1080, height: 1440 })
    expect(getPlatformPreset('wechat').coverSize).toEqual({ width: 900, height: 383 })
    expect(getPlatformPreset('generic').pageSize).toEqual({ width: 1080, height: 1440 })
  })
})

describe('assistant suggestions', () => {
  it('creates actionable local suggestions', () => {
    const suggestions = createAssistantSuggestions(
      '# 为什么普通人越来越难专注\n\n正文内容包含 **重点**。\n\n- 第一项',
      '为什么普通人越来越难专注',
      '',
      'editorial-clean'
    )

    expect(suggestions.length).toBeGreaterThan(0)
    expect(suggestions.every((item) => ['title', 'subtitle', 'tag', 'coverPrompt'].includes(item.target))).toBe(true)
  })
})
