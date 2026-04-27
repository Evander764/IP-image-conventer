import { describe, expect, it } from 'vitest'
import { parseMarkdown } from '../src/shared/markdown'
import { paginateBlocks } from '../src/shared/pagination'
import { getTemplate } from '../src/shared/templates'
import { PAGE_HEIGHT, PAGE_WIDTH } from '../src/shared/types'

describe('paginateBlocks', () => {
  it('keeps the fixed 3:4 page size from the template', () => {
    const template = getTemplate('editorial-clean')
    expect(template.page.width).toBe(PAGE_WIDTH)
    expect(template.page.height).toBe(PAGE_HEIGHT)
  })

  it('honors forced page breaks', () => {
    const template = getTemplate('fresh-note')
    const article = parseMarkdown(`# 标题

第一段内容。

---

第二段内容。`)
    const pages = paginateBlocks(article.blocks, template)
    expect(pages).toHaveLength(2)
    expect(pages[0].blocks.some((block) => block.type === 'paragraph' && block.text.includes('第一段'))).toBe(true)
    expect(pages[1].blocks.some((block) => block.type === 'paragraph' && block.text.includes('第二段'))).toBe(true)
  })

  it('splits long paragraphs across multiple pages', () => {
    const template = getTemplate('warm-column')
    const longText = Array.from({ length: 180 }, () => '真正的成长，是在不确定中继续行动。').join('')
    const article = parseMarkdown(`# 长文

${longText}
`)
    const pages = paginateBlocks(article.blocks, template)
    expect(pages.length).toBeGreaterThan(1)
  })
})
