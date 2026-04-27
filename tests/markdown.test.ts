import { describe, expect, it } from 'vitest'
import { parseMarkdown } from '../src/shared/markdown'

describe('parseMarkdown', () => {
  it('reads frontmatter and common markdown structures', () => {
    const article = parseMarkdown(`---
title: 测试标题
subtitle: 测试副标题
author: 作者
template: tech-briefing
---

# 测试标题

## 小节

正文包含 **重点文字**。

> 一句引用

- 第一项
- 第二项

---

1. 有序项`)

    expect(article.meta.title).toBe('测试标题')
    expect(article.meta.subtitle).toBe('测试副标题')
    expect(article.meta.author).toBe('作者')
    expect(article.meta.template).toBe('tech-briefing')
    expect(article.blocks.some((block) => block.type === 'pageBreak')).toBe(true)
    expect(article.blocks.some((block) => block.type === 'quote')).toBe(true)
    expect(article.blocks.some((block) => block.type === 'list' && block.ordered === false)).toBe(true)
    expect(article.blocks.some((block) => block.type === 'list' && block.ordered === true)).toBe(true)
    const paragraph = article.blocks.find((block) => block.type === 'paragraph')
    expect(paragraph?.children.some((segment) => segment.strong && segment.text.includes('重点文字'))).toBe(true)
  })

  it('falls back to the default template for unknown frontmatter templates', () => {
    const article = parseMarkdown(`---
template: unknown-template
---

# 标题`)

    expect(article.meta.template).toBe('editorial-clean')
  })
})
