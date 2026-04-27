import type {
  ArticleMeta,
  ArticlePage,
  ListBlock,
  RenderableBlock,
  RichTextSegment,
  TemplateConfig
} from './types'
import { escapeHtml } from './text'

interface RenderHtmlOptions {
  variant?: 'page' | 'long'
  pageCount?: number
}

function renderRichText(segments: RichTextSegment[]): string {
  return segments
    .map((segment) => {
      const text = escapeHtml(segment.text).replace(/\n/g, '<br />')
      return segment.strong ? `<strong>${text}</strong>` : text
    })
    .join('')
}

function renderList(block: ListBlock): string {
  const tag = block.ordered ? 'ol' : 'ul'
  const items = block.items.map((item) => `<li>${renderRichText(item)}</li>`).join('')
  return `<${tag} class="block list">${items}</${tag}>`
}

function renderBlock(block: RenderableBlock, meta: ArticleMeta): string {
  if (block.type === 'heading') {
    const subtitle =
      block.level === 1 && meta.subtitle
        ? `<div class="subtitle">${escapeHtml(meta.subtitle)}</div>`
        : ''
    return `<section class="block heading heading-${block.level}"><h${block.level}>${renderRichText(
      block.children
    )}</h${block.level}>${subtitle}</section>`
  }

  if (block.type === 'paragraph') {
    return `<p class="block paragraph">${renderRichText(block.children)}</p>`
  }

  if (block.type === 'quote') {
    return `<blockquote class="block quote">${renderRichText(block.children)}</blockquote>`
  }

  if (block.type === 'list') {
    return renderList(block)
  }

  return '<div class="block divider" aria-hidden="true"></div>'
}

function renderDecorations(template: TemplateConfig, page: ArticlePage): string {
  const pageMark = `<div class="decor page-mark">${page.index.toString().padStart(2, '0')}</div>`

  switch (template.id) {
    case 'editorial-clean':
      return `
        <div class="decor editorial-rule"></div>
        <div class="decor editorial-label">FEATURE</div>
        ${pageMark}
      `
    case 'business-mono':
      return `
        <div class="decor mono-frame"></div>
        <div class="decor mono-index">NO.${page.index.toString().padStart(2, '0')}</div>
        ${pageMark}
      `
    case 'tech-briefing':
      return `
        <div class="decor tech-grid"></div>
        <div class="decor tech-orbit"></div>
        <div class="decor tech-code">SYSTEM / BRIEF</div>
        ${pageMark}
      `
    case 'warm-column':
      return `
        <div class="decor warm-sun"></div>
        <div class="decor warm-line"></div>
        <div class="decor warm-label">COLUMN</div>
        ${pageMark}
      `
    case 'bold-opinion':
      return `
        <div class="decor bold-slash"></div>
        <div class="decor bold-number">${page.index.toString().padStart(2, '0')}</div>
        ${pageMark}
      `
    case 'fresh-note':
      return `
        <div class="decor fresh-leaf fresh-leaf-a"></div>
        <div class="decor fresh-leaf fresh-leaf-b"></div>
        <div class="decor fresh-tape"></div>
        ${pageMark}
      `
    case 'shan-shui':
      return `
        <div class="decor bamboo bamboo-a"></div>
        <div class="decor bamboo bamboo-b"></div>
        <div class="decor ink-mountain"></div>
        <div class="decor side-seal">修行</div>
        <div class="decor bottom-sign">向内生长 · 与自己和解</div>
        ${pageMark}
      `
    case 'essay-notes':
      return `
        <div class="decor paperclip"></div>
        <div class="decor tape tape-a"></div>
        <div class="decor tape tape-b"></div>
        <div class="decor leaf-shadow"></div>
        <div class="decor postal-stamp"></div>
        ${pageMark}
      `
    case 'journal-growth':
    default:
      return `
        <div class="decor spiral">${Array.from({ length: 13 })
          .map(() => '<span></span>')
          .join('')}</div>
        <div class="decor sticker-heart">♡</div>
        <div class="decor polaroid"><div></div><span>记录美好，遇见成长</span></div>
        <div class="decor washi washi-a"></div>
        <div class="decor washi washi-b"></div>
        ${pageMark}
      `
  }
}

function px(value: number): string {
  return `${value}px`
}

function renderCss(template: TemplateConfig, pageData?: ArticlePage, options: RenderHtmlOptions = {}): string {
  const { colors, fonts, typography, page } = template
  const isLong = options.variant === 'long'
  const pageIndex = pageData?.index ?? 1
  const pageCount = Math.max(1, options.pageCount ?? 1)
  const backgroundOffset = (pageIndex - 1) * page.height
  const top = isLong && pageIndex > 1 ? 60 : page.paddingTop
  const bottom = isLong && pageIndex < pageCount ? 64 : page.paddingBottom
  const contentTopOffset = isLong && pageIndex > 1 ? 0 : page.contentTopOffset

  return `
    * { box-sizing: border-box; }
    html,
    body {
      width: ${page.width}px;
      height: ${page.height}px;
      margin: 0;
      overflow: hidden;
      background: ${colors.background};
    }
    body {
      color: ${colors.text};
      font-family: ${fonts.body};
      -webkit-font-smoothing: antialiased;
      text-rendering: geometricPrecision;
    }
    .page {
      position: relative;
      width: ${page.width}px;
      height: ${page.height}px;
      overflow: hidden;
      background:
        radial-gradient(circle at 18% 10%, rgba(255,255,255,0.55), transparent 32%),
        radial-gradient(circle at 88% 88%, rgba(0,0,0,0.035), transparent 36%),
        linear-gradient(135deg, rgba(255,255,255,0.25), rgba(0,0,0,0.025)),
        ${colors.paper};
    }
    .page::before {
      content: "";
      position: absolute;
      inset: 0;
      z-index: 0;
      pointer-events: none;
      opacity: 0.42;
      background-image:
        radial-gradient(rgba(76, 70, 62, 0.07) 0.8px, transparent 0.8px),
        radial-gradient(rgba(255, 255, 255, 0.28) 0.7px, transparent 0.7px);
      background-position: 0 ${isLong ? `-${backgroundOffset}px` : '0'}, 8px ${isLong ? `${12 - backgroundOffset}px` : '12px'};
      background-size: 18px 18px, 22px 22px;
      mix-blend-mode: multiply;
    }
    .content {
      position: relative;
      z-index: 2;
      height: ${page.height - top - bottom - contentTopOffset}px;
      margin: ${px(top)} ${px(page.paddingRight)} ${px(bottom)} ${px(page.paddingLeft)};
      padding-top: ${px(contentTopOffset)};
    }
    .series-chip {
      position: absolute;
      top: 42px;
      left: 52px;
      z-index: 3;
      padding: 8px 18px;
      color: ${colors.muted};
      border: 1px solid ${colors.border};
      border-radius: 999px;
      background: rgba(255,255,255,0.45);
      font-family: ${fonts.accent};
      font-size: 20px;
      letter-spacing: 0;
    }
    .block {
      position: relative;
      margin: 0;
      word-break: break-word;
    }
    strong {
      color: ${colors.accent};
      font-weight: 900;
    }
    .heading {
      color: ${colors.accent};
      font-family: ${fonts.title};
    }
    .heading h1,
    .heading h2,
    .heading h3 {
      margin: 0;
      font-family: inherit;
      font-weight: inherit;
      line-height: inherit;
      letter-spacing: 0;
    }
    .heading-1 {
      margin: 18px 0 ${typography.h1.marginBottom}px;
      font-size: ${typography.h1.fontSize}px;
      line-height: ${typography.h1.lineHeight};
      font-weight: ${typography.h1.fontWeight ?? 800};
    }
    .heading-1::after {
      content: "";
      display: block;
      width: 42%;
      height: 2px;
      margin-top: 28px;
      background: linear-gradient(90deg, ${colors.accent}, transparent);
    }
    .subtitle {
      max-width: 88%;
      margin-top: 22px;
      color: ${colors.muted};
      font-family: ${fonts.accent};
      font-size: 34px;
      line-height: 1.35;
      font-weight: 500;
    }
    .heading-2 {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: ${typography.h2.marginBottom}px;
      font-size: ${typography.h2.fontSize}px;
      line-height: ${typography.h2.lineHeight};
      font-weight: ${typography.h2.fontWeight ?? 800};
    }
    .heading-2::before {
      content: "";
      width: 44px;
      height: 6px;
      border-radius: 999px;
      background: ${colors.accent};
    }
    .heading-3 {
      width: fit-content;
      max-width: 100%;
      margin-bottom: ${typography.h3.marginBottom}px;
      padding: 8px 18px 9px;
      border: 1px solid ${colors.border};
      border-radius: 999px;
      background: rgba(255,255,255,0.34);
      font-size: ${typography.h3.fontSize}px;
      line-height: ${typography.h3.lineHeight};
      font-weight: ${typography.h3.fontWeight ?? 800};
    }
    .paragraph {
      color: ${colors.text};
      font-size: ${typography.paragraph.fontSize}px;
      line-height: ${typography.paragraph.lineHeight};
      margin-bottom: ${typography.paragraph.marginBottom}px;
    }
    .quote {
      margin-bottom: ${typography.quote.marginBottom}px;
      padding: 24px 30px 24px 42px;
      color: ${colors.text};
      border: 1px solid ${colors.border};
      border-left: 8px solid ${colors.accent};
      border-radius: 16px;
      background: ${colors.quoteBackground};
      font-size: ${typography.quote.fontSize}px;
      line-height: ${typography.quote.lineHeight};
    }
    .quote::before {
      content: "“";
      position: absolute;
      top: -14px;
      left: 18px;
      color: ${colors.accent2};
      font-family: Georgia, serif;
      font-size: 78px;
      line-height: 1;
      opacity: 0.36;
    }
    .list {
      margin: 0 0 ${typography.list.marginBottom}px;
      padding: 20px 30px 20px 62px;
      border: 1px solid ${colors.border};
      border-radius: 16px;
      background: rgba(255,255,255,0.28);
      font-size: ${typography.list.fontSize}px;
      line-height: ${typography.list.lineHeight};
    }
    .list li {
      padding-left: 8px;
      margin-bottom: 12px;
    }
    .list li:last-child {
      margin-bottom: 0;
    }
    .divider {
      height: 38px;
      margin: 2px 0 20px;
    }
    .divider::before {
      content: "";
      position: absolute;
      top: 18px;
      left: 0;
      right: 0;
      height: 1px;
      background: linear-gradient(90deg, transparent, ${colors.border}, transparent);
    }
    .decor {
      position: absolute;
      z-index: 1;
      pointer-events: none;
    }
    .page-mark {
      right: 48px;
      bottom: 40px;
      color: ${colors.muted};
      font-family: ${fonts.accent};
      font-size: 20px;
      opacity: 0.62;
    }
    .editorial-clean .page {
      box-shadow: inset 0 0 0 18px rgba(49, 95, 150, 0.035);
    }
    .editorial-clean .heading-1 {
      max-width: 86%;
    }
    .editorial-clean .editorial-rule {
      top: 86px;
      left: 104px;
      right: 104px;
      height: 1px;
      background: ${colors.border};
    }
    .editorial-clean .editorial-label {
      right: 104px;
      top: 60px;
      color: ${colors.accent};
      font-family: ${fonts.accent};
      font-size: 18px;
      font-weight: 800;
    }
    .business-mono .page {
      border: 18px solid ${colors.paper};
      box-shadow: inset 0 0 0 1px ${colors.border};
    }
    .business-mono .series-chip {
      border-radius: 0;
      background: ${colors.accent};
      color: #fff;
    }
    .business-mono .heading-1 {
      text-transform: uppercase;
    }
    .business-mono .heading-2::before {
      width: 58px;
      height: 2px;
    }
    .business-mono .mono-frame {
      inset: 62px;
      border: 1px solid ${colors.border};
    }
    .business-mono .mono-index {
      right: 82px;
      top: 82px;
      color: ${colors.muted};
      font-family: ${fonts.accent};
      font-size: 22px;
    }
    .tech-briefing .page {
      background:
        linear-gradient(rgba(15, 116, 168, 0.05) 1px, transparent 1px),
        linear-gradient(90deg, rgba(15, 116, 168, 0.05) 1px, transparent 1px),
        ${colors.paper};
      background-size: 34px 34px;
    }
    .tech-briefing .series-chip {
      border-color: rgba(15, 116, 168, 0.3);
      background: rgba(255,255,255,0.72);
      font-family: ${fonts.accent};
    }
    .tech-briefing .heading-2::before {
      background: linear-gradient(90deg, ${colors.accent}, ${colors.accent2});
    }
    .tech-briefing .quote,
    .tech-briefing .list {
      box-shadow: 0 12px 30px rgba(15, 116, 168, 0.06);
    }
    .tech-briefing .tech-grid {
      right: 70px;
      bottom: 80px;
      width: 180px;
      height: 180px;
      border: 1px solid rgba(15,116,168,0.22);
      background:
        linear-gradient(rgba(15,116,168,0.14) 1px, transparent 1px),
        linear-gradient(90deg, rgba(15,116,168,0.14) 1px, transparent 1px);
      background-size: 24px 24px;
      opacity: 0.65;
    }
    .tech-briefing .tech-orbit {
      right: 142px;
      top: 122px;
      width: 190px;
      height: 190px;
      border: 2px solid rgba(35,183,164,0.22);
      border-radius: 50%;
    }
    .tech-briefing .tech-code {
      left: 94px;
      bottom: 58px;
      color: ${colors.muted};
      font-family: ${fonts.accent};
      font-size: 20px;
    }
    .warm-column .page {
      box-shadow: inset 0 0 0 12px rgba(196, 95, 60, 0.045);
    }
    .warm-column .heading-1 {
      color: ${colors.accent};
      text-align: center;
    }
    .warm-column .heading-1::after {
      margin-left: auto;
      margin-right: auto;
      background: linear-gradient(90deg, transparent, ${colors.accent}, transparent);
    }
    .warm-column .subtitle {
      margin-left: auto;
      margin-right: auto;
      text-align: center;
    }
    .warm-column .paragraph {
      text-indent: 2em;
    }
    .warm-column .warm-sun {
      right: 78px;
      top: 96px;
      width: 112px;
      height: 112px;
      border-radius: 50%;
      background: ${colors.accent2};
      opacity: 0.16;
    }
    .warm-column .warm-line {
      left: 72px;
      top: 220px;
      bottom: 140px;
      width: 2px;
      background: linear-gradient(${colors.border}, transparent);
    }
    .warm-column .warm-label {
      left: 92px;
      bottom: 76px;
      color: ${colors.muted};
      font-family: ${fonts.accent};
      font-size: 20px;
    }
    .bold-opinion .page {
      box-shadow: inset 0 0 0 20px ${colors.accent};
    }
    .bold-opinion .series-chip {
      border-radius: 0;
      border-color: ${colors.accent};
      color: #fff;
      background: ${colors.accent};
      font-weight: 900;
    }
    .bold-opinion .heading-1 {
      max-width: 92%;
      color: ${colors.accent2};
    }
    .bold-opinion .heading-1::after {
      height: 10px;
      background: ${colors.accent};
    }
    .bold-opinion .heading-2::before {
      width: 18px;
      height: 44px;
      border-radius: 0;
      background: ${colors.accent};
    }
    .bold-opinion .quote {
      border-color: ${colors.accent};
      background: ${colors.quoteBackground};
      font-weight: 800;
    }
    .bold-opinion .bold-slash {
      right: 74px;
      top: 112px;
      width: 38px;
      height: 280px;
      background: ${colors.accent};
      transform: skewX(-16deg);
      opacity: 0.9;
    }
    .bold-opinion .bold-number {
      right: 92px;
      bottom: 82px;
      color: ${colors.accent};
      font-size: 86px;
      font-weight: 900;
      font-family: ${fonts.title};
    }
    .fresh-note .page {
      box-shadow: inset 0 0 0 10px rgba(110,143,87,0.06);
    }
    .fresh-note .series-chip {
      border-color: rgba(110,143,87,0.22);
      background: rgba(255,255,255,0.52);
    }
    .fresh-note .heading-1 {
      color: ${colors.accent};
    }
    .fresh-note .heading-1::after {
      height: 14px;
      border-radius: 999px;
      background: rgba(230,189,93,0.45);
    }
    .fresh-note .paragraph {
      padding: 20px 28px;
      border: 1px dashed rgba(110,143,87,0.28);
      border-radius: 22px;
      background: rgba(255,255,255,0.24);
      text-indent: 0;
    }
    .fresh-note .fresh-leaf {
      width: 150px;
      height: 210px;
      opacity: 0.28;
      background:
        linear-gradient(68deg, transparent 48%, ${colors.accent} 49% 51%, transparent 52%),
        radial-gradient(ellipse at 65% 22%, ${colors.accent} 0 12%, transparent 13%),
        radial-gradient(ellipse at 44% 44%, ${colors.accent} 0 10%, transparent 11%),
        radial-gradient(ellipse at 72% 62%, ${colors.accent} 0 9%, transparent 10%);
    }
    .fresh-note .fresh-leaf-a {
      right: 70px;
      top: 90px;
      transform: rotate(-20deg);
    }
    .fresh-note .fresh-leaf-b {
      left: 52px;
      bottom: 112px;
      transform: rotate(20deg);
    }
    .fresh-note .fresh-tape {
      right: 112px;
      bottom: 156px;
      width: 128px;
      height: 36px;
      border-radius: 6px;
      background: rgba(230,189,93,0.38);
      transform: rotate(-8deg);
    }
    .shan-shui .series-chip {
      border-radius: 0;
      clip-path: polygon(8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px), 0 8px);
    }
    .shan-shui .heading-1 {
      text-align: center;
      text-shadow: 0 6px 0 rgba(84, 107, 85, 0.08);
    }
    .shan-shui .heading-1::after {
      margin-left: auto;
      margin-right: auto;
      background: linear-gradient(90deg, transparent, ${colors.border}, transparent);
    }
    .shan-shui .subtitle {
      margin-left: auto;
      margin-right: auto;
      text-align: center;
    }
    .shan-shui .paragraph {
      text-indent: 2em;
    }
    .shan-shui .quote {
      border-radius: 0;
      border-left: 0;
      border-right: 0;
      background: linear-gradient(90deg, rgba(82, 107, 85, 0.16), rgba(255,255,255,0.08));
    }
    .shan-shui .ink-mountain {
      left: -44px;
      right: -44px;
      bottom: 42px;
      height: 168px;
      opacity: 0.18;
      background:
        radial-gradient(ellipse at 20% 100%, #526b55 0 22%, transparent 23%),
        radial-gradient(ellipse at 45% 100%, #526b55 0 30%, transparent 31%),
        radial-gradient(ellipse at 74% 100%, #526b55 0 24%, transparent 25%);
      filter: blur(1px);
    }
    .shan-shui .bamboo {
      width: 190px;
      height: 260px;
      opacity: 0.26;
      background:
        linear-gradient(78deg, transparent 46%, ${colors.accent} 47% 49%, transparent 50%),
        radial-gradient(ellipse at 65% 18%, ${colors.accent} 0 10%, transparent 11%),
        radial-gradient(ellipse at 54% 35%, ${colors.accent} 0 9%, transparent 10%),
        radial-gradient(ellipse at 76% 45%, ${colors.accent} 0 8%, transparent 9%),
        radial-gradient(ellipse at 44% 58%, ${colors.accent} 0 9%, transparent 10%);
    }
    .shan-shui .bamboo-a {
      top: -34px;
      right: 40px;
      transform: rotate(-18deg);
    }
    .shan-shui .bamboo-b {
      left: -18px;
      bottom: 110px;
      transform: rotate(24deg);
    }
    .shan-shui .side-seal {
      top: 190px;
      right: 52px;
      width: 34px;
      color: ${colors.muted};
      font-family: ${fonts.accent};
      font-size: 22px;
      line-height: 1.6;
      writing-mode: vertical-rl;
    }
    .shan-shui .bottom-sign {
      left: 0;
      right: 0;
      bottom: 36px;
      color: ${colors.muted};
      text-align: center;
      font-family: ${fonts.accent};
      font-size: 26px;
    }
    .essay-notes .page {
      margin: 28px;
      width: ${page.width - 56}px;
      height: ${page.height - 56}px;
      border-radius: 30px;
      box-shadow: 0 20px 50px rgba(99, 62, 28, 0.16);
    }
    .essay-notes .series-chip {
      left: 310px;
      top: 30px;
      color: #fff8ed;
      border: 0;
      border-radius: 0 0 14px 14px;
      background: ${colors.accent};
      font-size: 28px;
    }
    .essay-notes .heading-1 {
      margin-top: 42px;
      color: #6d452b;
      text-align: center;
    }
    .essay-notes .heading-1::before {
      content: "";
      position: absolute;
      left: 27%;
      right: 27%;
      top: 20px;
      height: 80px;
      z-index: -1;
      border-radius: 50%;
      background: rgba(214, 152, 91, 0.16);
      transform: rotate(-4deg);
    }
    .essay-notes .heading-1::after {
      margin-left: auto;
      margin-right: auto;
      background: linear-gradient(90deg, transparent, ${colors.accent}, transparent);
    }
    .essay-notes .subtitle {
      margin-left: auto;
      margin-right: auto;
      text-align: center;
    }
    .essay-notes .paragraph {
      padding: 0 18px;
    }
    .essay-notes .quote {
      border-style: dashed;
      background: linear-gradient(90deg, rgba(196, 116, 52, 0.12), rgba(255,255,255,0.16));
    }
    .essay-notes .paperclip {
      top: 44px;
      left: 56px;
      width: 38px;
      height: 94px;
      border: 8px solid rgba(170, 111, 46, 0.55);
      border-left-width: 5px;
      border-radius: 999px;
      transform: rotate(24deg);
      box-shadow: inset 0 0 0 8px rgba(255,255,255,0.22);
    }
    .essay-notes .tape {
      width: 120px;
      height: 38px;
      background: rgba(195, 124, 59, 0.34);
      opacity: 0.85;
    }
    .essay-notes .tape-a {
      left: 74px;
      bottom: 370px;
      transform: rotate(-9deg);
    }
    .essay-notes .tape-b {
      right: 78px;
      top: 370px;
      transform: rotate(-11deg);
    }
    .essay-notes .leaf-shadow {
      right: -18px;
      top: -18px;
      width: 220px;
      height: 220px;
      opacity: 0.3;
      background:
        radial-gradient(ellipse at 50% 20%, ${colors.accent2} 0 9%, transparent 10%),
        radial-gradient(ellipse at 40% 42%, ${colors.accent2} 0 8%, transparent 9%),
        radial-gradient(ellipse at 66% 48%, ${colors.accent2} 0 8%, transparent 9%),
        linear-gradient(140deg, transparent 48%, ${colors.accent2} 49% 51%, transparent 52%);
      transform: rotate(24deg);
    }
    .essay-notes .postal-stamp {
      right: 82px;
      bottom: 332px;
      width: 92px;
      height: 92px;
      border: 2px solid rgba(193, 119, 60, 0.34);
      border-radius: 50%;
    }
    .essay-notes .postal-stamp::after {
      content: "";
      position: absolute;
      inset: 18px;
      border: 1px solid rgba(193, 119, 60, 0.3);
      border-radius: 50%;
    }
    .journal-growth .page {
      border: 1px solid rgba(116, 86, 54, 0.15);
      box-shadow: inset 0 0 0 10px rgba(255,255,255,0.28);
    }
    .journal-growth .series-chip {
      display: none;
    }
    .journal-growth .heading-1 {
      margin-top: 18px;
      margin-left: 16px;
      color: #5b3d23;
    }
    .journal-growth .heading-1::before {
      content: "";
      position: absolute;
      left: -8px;
      top: 52px;
      width: 370px;
      height: 48px;
      z-index: -1;
      border-radius: 999px;
      background: rgba(237, 186, 99, 0.42);
      transform: rotate(-2deg);
    }
    .journal-growth .heading-1::after {
      width: 42%;
      background: repeating-linear-gradient(90deg, ${colors.accent2} 0 12px, transparent 12px 22px);
    }
    .journal-growth .subtitle {
      color: ${colors.accent2};
    }
    .journal-growth .heading-2,
    .journal-growth .heading-3 {
      width: fit-content;
      padding: 12px 28px 14px;
      color: white;
      border: 0;
      border-radius: 999px;
      background: ${colors.accent2};
    }
    .journal-growth .heading-2::before {
      display: none;
    }
    .journal-growth .paragraph {
      margin-left: 28px;
      padding: 28px 42px;
      border: 2px dashed rgba(129, 147, 108, 0.38);
      border-radius: 28px;
      background: rgba(255,255,255,0.24);
      text-indent: 0;
    }
    .journal-growth .quote {
      margin-left: 22px;
      border-style: dashed;
      background:
        linear-gradient(rgba(124,150,174,0.08) 1px, transparent 1px),
        linear-gradient(90deg, rgba(124,150,174,0.08) 1px, transparent 1px),
        ${colors.quoteBackground};
      background-size: 26px 26px;
    }
    .journal-growth .list {
      margin-left: 28px;
      border-left-color: ${colors.accent};
      border-radius: 22px;
      background: rgba(229, 154, 143, 0.12);
    }
    .journal-growth .spiral {
      top: 96px;
      left: 26px;
      display: flex;
      flex-direction: column;
      gap: 48px;
    }
    .journal-growth .spiral span {
      width: 30px;
      height: 30px;
      border-radius: 50%;
      background: rgba(161, 127, 86, 0.38);
      box-shadow: 34px 0 0 -9px rgba(255,255,255,0.82);
    }
    .journal-growth .sticker-heart {
      top: 110px;
      left: 430px;
      color: ${colors.accent};
      font-family: ${fonts.accent};
      font-size: 76px;
      transform: rotate(8deg);
    }
    .journal-growth .polaroid {
      top: 52px;
      right: 70px;
      width: 250px;
      height: 250px;
      padding: 18px 18px 28px;
      background: #fffaf0;
      box-shadow: 0 12px 28px rgba(92, 64, 38, 0.16);
      transform: rotate(5deg);
    }
    .journal-growth .polaroid div {
      height: 160px;
      background:
        radial-gradient(circle at 50% 60%, rgba(229,154,143,0.35), transparent 24%),
        linear-gradient(135deg, rgba(251,209,137,0.48), rgba(129,147,108,0.18));
    }
    .journal-growth .polaroid span {
      display: block;
      margin-top: 12px;
      color: ${colors.muted};
      text-align: center;
      font-family: ${fonts.accent};
      font-size: 18px;
    }
    .journal-growth .washi {
      width: 118px;
      height: 36px;
      opacity: 0.58;
      background: repeating-linear-gradient(45deg, rgba(229,154,143,0.4) 0 9px, rgba(255,255,255,0.25) 9px 18px);
    }
    .journal-growth .washi-a {
      top: 26px;
      left: 76px;
      transform: rotate(8deg);
    }
    .journal-growth .washi-b {
      right: 92px;
      bottom: 154px;
      background: repeating-linear-gradient(45deg, rgba(124,150,174,0.42) 0 9px, rgba(255,255,255,0.25) 9px 18px);
      transform: rotate(-13deg);
    }
    body.long-stitch .decor,
    body.long-stitch .page-mark {
      display: none;
    }
    body.long-stitch:not(.long-first) .series-chip {
      display: none;
    }
    body.long-stitch .page {
      margin: 0;
      width: ${page.width}px;
      height: ${page.height}px;
      border: 0;
      border-radius: 0;
      box-shadow: none;
    }
    body.long-stitch .content {
      height: ${page.height - top - bottom - contentTopOffset}px;
      margin: ${top}px ${page.paddingRight}px ${bottom}px ${page.paddingLeft}px;
      padding-top: ${contentTopOffset}px;
    }
    body.long-stitch:not(.long-first) .heading-1 {
      margin-top: 0;
    }
  `
}

export function renderArticlePageHtml(
  meta: ArticleMeta,
  page: ArticlePage,
  template: TemplateConfig,
  options: RenderHtmlOptions = {}
): string {
  const blocksHtml = page.blocks.map((block) => renderBlock(block, meta)).join('\n')
  const bodyClass = [
    template.id,
    options.variant === 'long' ? 'long-stitch' : '',
    options.variant === 'long' && page.index === 1 ? 'long-first' : '',
    options.variant === 'long' && page.index === options.pageCount ? 'long-last' : ''
  ]
    .filter(Boolean)
    .join(' ')
  const seriesChip =
    options.variant === 'long' && page.index > 1
      ? ''
      : `<div class="series-chip">${escapeHtml(template.series)}</div>`
  const decorations = options.variant === 'long' ? '' : renderDecorations(template, page)

  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=${template.page.width}, initial-scale=1" />
    <style>${renderCss(template, page, options)}</style>
  </head>
  <body class="${bodyClass}">
    <main class="page">
      ${seriesChip}
      ${decorations}
      <article class="content">${blocksHtml}</article>
    </main>
  </body>
</html>`
}
