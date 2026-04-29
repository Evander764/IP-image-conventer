import { describe, expect, it } from 'vitest'
import { renderCoverSvg } from '../src/shared/cover'
import { renderArticlePageHtml } from '../src/shared/html'
import { getPlatformPreset } from '../src/shared/platforms'
import { applyLayoutAdjustments, getTemplate, templateList, withTitleScale } from '../src/shared/templates'
import { PAGE_HEIGHT, PAGE_WIDTH, type ArticleMeta, type ArticlePage } from '../src/shared/types'

describe('templates', () => {
  it('keeps the three reference templates first', () => {
    expect(templateList.map((template) => template.id)).toEqual([
      'tech-briefing',
      'business-mono',
      'warm-column',
      'editorial-clean',
      'bold-opinion',
      'fresh-note',
      'shan-shui',
      'essay-notes',
      'journal-growth'
    ])
  })

  it('keeps every template at 1080x1440', () => {
    for (const template of templateList) {
      expect(template.page.width).toBe(PAGE_WIDTH)
      expect(template.page.height).toBe(PAGE_HEIGHT)
    }
  })

  it('falls back unknown template ids to tech-briefing', () => {
    expect(getTemplate('unknown-template').id).toBe('tech-briefing')
  })

  it('scales the primary title without mutating the base template', () => {
    const base = getTemplate('tech-briefing')
    const scaled = withTitleScale(base, 1.25)

    expect(scaled.typography.h1.fontSize).toBe(Math.round(base.typography.h1.fontSize * 1.25))
    expect(getTemplate('tech-briefing').typography.h1.fontSize).toBe(base.typography.h1.fontSize)
  })

  it('applies project layout adjustments without mutating the base template', () => {
    const base = getTemplate('tech-briefing')
    const adjusted = applyLayoutAdjustments(base, {
      bodyFontSizeDelta: 4,
      paragraphSpacingDelta: 10,
      paddingXDelta: 20,
      pageMarkPosition: 'hidden'
    })

    expect(adjusted.typography.paragraph.fontSize).toBe(base.typography.paragraph.fontSize + 4)
    expect(adjusted.typography.paragraph.marginBottom).toBe(base.typography.paragraph.marginBottom + 10)
    expect(adjusted.page.paddingLeft).toBe(base.page.paddingLeft + 20)
    expect(adjusted.adjustments?.pageMarkPosition).toBe('hidden')
    expect(getTemplate('tech-briefing').page.paddingLeft).toBe(base.page.paddingLeft)
  })

  it('renders a real cover svg for every template', () => {
    const preset = getPlatformPreset('xiaohongshu')
    for (const template of templateList) {
      const meta: ArticleMeta = {
        title: '构建可持续的技术系统',
        subtitle: '从设计原则到工程实践',
        author: 'IP-image',
        platform: 'xiaohongshu',
        template: template.id,
        createdAt: '2026-05-01T00:00:00.000Z'
      }
      const svg = renderCoverSvg(meta, template, preset.coverSize.width, preset.coverSize.height)
      expect(svg).toContain(`<svg width="${preset.coverSize.width}" height="${preset.coverSize.height}"`)
      expect(svg).toContain(template.name)
      expect(svg).not.toContain('radial-gradient(circle')
    }
  })

  it('renders a separate horizontal cover layout for wechat', () => {
    const template = getTemplate('business-mono')
    const preset = getPlatformPreset('wechat')
    const svg = renderCoverSvg(
      {
        title: '这是一个公众号外封面',
        subtitle: '横版封面不能从竖版硬裁剪',
        author: 'IP-image',
        platform: 'wechat',
        template: template.id,
        createdAt: '2026-05-01T00:00:00.000Z',
        titleScale: 1.3
      },
      template,
      preset.coverSize.width,
      preset.coverSize.height
    )

    expect(svg).toContain('width="900" height="383"')
    expect(svg).toContain('这是一个公众号')
    expect(svg).toContain('Business Report / 2026')
  })

  it('renders cover adjustment controls into the cover svg', () => {
    const template = getTemplate('tech-briefing')
    const preset = getPlatformPreset('xiaohongshu')
    const svg = renderCoverSvg(
      {
        title: '可精细调节的封面',
        subtitle: '位置和样式可控',
        author: 'IP-image',
        platform: 'xiaohongshu',
        template: template.id,
        createdAt: '2026-05-01T00:00:00.000Z',
        coverLayoutAdjustments: {
          align: 'center',
          titleOffsetY: 40,
          titleScale: 1.2,
          shadow: true,
          stroke: true
        }
      },
      template,
      preset.coverSize.width,
      preset.coverSize.height
    )

    expect(svg).toContain('text-anchor="middle"')
    expect(svg).toContain('filter: url(#softShadow)')
    expect(svg).toContain('paint-order: stroke')
  })

  it('does not output page marks or repeated decorations in long mode', () => {
    const template = getTemplate('tech-briefing')
    const meta: ArticleMeta = {
      title: '测试标题',
      subtitle: '测试副标题',
      author: '作者',
      platform: 'xiaohongshu',
      template: template.id,
      createdAt: new Date().toISOString()
    }
    const page: ArticlePage = {
      index: 2,
      blocks: [
        {
          id: 'paragraph-1',
          type: 'paragraph',
          text: '正文内容',
          children: [{ text: '正文内容' }]
        }
      ]
    }
    const html = renderArticlePageHtml(meta, page, template, { variant: 'long', pageCount: 3 })
    expect(html).toContain('long-stitch')
    expect(html).not.toContain('class="decor page-mark"')
    expect(html).not.toContain('class="decor tech-circuit"')
    expect(html).not.toContain('TECH SYSTEM / BRIEF')
  })

  it('renders layout adjustment CSS into article pages', () => {
    const template = applyLayoutAdjustments(getTemplate('fresh-note'), {
      quotePaddingDelta: 12,
      listSpacingDelta: 8,
      pageMarkPosition: 'bottom-center'
    })
    const meta: ArticleMeta = {
      title: '测试标题',
      platform: 'xiaohongshu',
      template: template.id,
      createdAt: new Date().toISOString()
    }
    const page: ArticlePage = {
      index: 1,
      blocks: [
        {
          id: 'quote-1',
          type: 'quote',
          text: '引用内容',
          children: [{ text: '引用内容' }]
        }
      ]
    }
    const html = renderArticlePageHtml(meta, page, template)

    expect(html).toContain('left: 50%; right: auto; transform: translateX(-50%);')
    expect(html).toContain('padding: 36px 42px 36px 54px;')
  })
})
