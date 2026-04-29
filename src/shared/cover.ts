import { getTemplate, normalizeTitleScale } from './templates'
import { escapeHtml, wrapTextByUnits } from './text'
import type { ArticleMeta, CoverLayoutAdjustments, TemplateConfig } from './types'

export interface RenderCoverSvgOptions {
  backgroundImageHref?: string
}

function esc(value: string | undefined): string {
  return escapeHtml(value ?? '')
}

function titleLines(meta: ArticleMeta, compact: boolean): string[] {
  const scale = normalizeTitleScale(meta.titleScale)
  const widthScale = scaleValue(meta.coverLayoutAdjustments?.maxWidthScale, 1)
  return wrapTextByUnits(meta.title || '未命名文章', ((compact ? 13.5 : 8.2) * widthScale) / scale, compact ? 2 : 4)
}

function subtitleLines(meta: ArticleMeta, compact: boolean): string[] {
  if (!meta.subtitle) return []
  return wrapTextByUnits(meta.subtitle, compact ? 24 : 16.5, compact ? 1 : 2)
}

function coverAdjustments(meta: ArticleMeta): CoverLayoutAdjustments {
  return meta.coverLayoutAdjustments ?? {}
}

function scaleValue(value: number | undefined, fallback = 1): number {
  if (!Number.isFinite(value)) return fallback
  return Math.min(1.6, Math.max(0.55, value ?? fallback))
}

function anchorForAdjustments(adjustments: CoverLayoutAdjustments): 'start' | 'middle' | 'end' {
  if (adjustments.align === 'center') return 'middle'
  if (adjustments.align === 'right') return 'end'
  return 'start'
}

function xForAdjustments(
  defaultLeft: number,
  width: number,
  adjustments: CoverLayoutAdjustments,
  offset = 0
): number {
  const base =
    adjustments.align === 'center' ? width / 2 : adjustments.align === 'right' ? width - defaultLeft : defaultLeft
  return base + offset
}

function textLines(lines: string[], x: number, y: number, lineHeight: number, className: string, anchor = 'start'): string {
  return lines
    .map((line, index) => `<text class="${className}" x="${x}" y="${y + index * lineHeight}" text-anchor="${anchor}">${esc(line)}</text>`)
    .join('')
}

function motifDecor(template: TemplateConfig, width: number, height: number, compact: boolean): string {
  const { motif, palette } = template.cover.design
  const right = width * 0.66
  const bottom = height * 0.75

  if (motif === 'tech') {
    return `
      <g opacity="0.58">
        <path d="M${width - 250} 0 V${compact ? 98 : 330} H${width - 118} M${width - 180} 0 V${compact ? 138 : 430}" stroke="${palette.accent2}" stroke-width="${compact ? 1.4 : 2.4}" fill="none"/>
        <circle cx="${width - 118}" cy="${compact ? 98 : 330}" r="${compact ? 4 : 8}" fill="#fff" stroke="${palette.accent}"/>
        <circle cx="${width - 180}" cy="${compact ? 138 : 430}" r="${compact ? 4 : 8}" fill="#fff" stroke="${palette.accent}"/>
      </g>
      <g opacity="0.2" fill="${palette.accent}">
        <rect x="${width * 0.58}" y="${height * 0.66}" width="${width * 0.07}" height="${height * 0.16}"/>
        <rect x="${width * 0.68}" y="${height * 0.58}" width="${width * 0.09}" height="${height * 0.24}"/>
        <rect x="${width * 0.81}" y="${height * 0.5}" width="${width * 0.08}" height="${height * 0.32}"/>
        <rect x="${width * 0.91}" y="${height * 0.62}" width="${width * 0.06}" height="${height * 0.2}"/>
      </g>`
  }

  if (motif === 'business') {
    return `
      <path d="M${width * 0.42} ${height} L${width} ${height * (compact ? 0.12 : 0.42)} L${width} ${height} Z" fill="${palette.line}" opacity="0.3"/>
      <g opacity="0.25" stroke="${palette.muted}" stroke-width="1">
        ${Array.from({ length: compact ? 7 : 12 })
          .map((_, index) => `<path d="M${width * 0.46 + index * 54} ${height} L${width} ${height * (0.48 + index * 0.035)}"/>`)
          .join('')}
        ${Array.from({ length: compact ? 4 : 8 })
          .map((_, index) => `<path d="M${width * 0.48} ${height * (0.72 + index * 0.035)} H${width}"/>`)
          .join('')}
      </g>`
  }

  if (motif === 'warm' || motif === 'essay') {
    return `
      <rect x="${width * 0.48}" y="${height * (compact ? 0.16 : 0.13)}" width="${width * 0.42}" height="${height * (compact ? 0.66 : 0.58)}" rx="${compact ? 16 : 40}" fill="${palette.accent2}" opacity="0.2"/>
      <circle cx="${width * 0.79}" cy="${height * 0.28}" r="${Math.min(width, height) * 0.1}" fill="#ffffff" opacity="0.4"/>
      <path d="M${width * 0.72} ${height * 0.18} C${width * 0.8} ${height * 0.28} ${width * 0.78} ${height * 0.44} ${width * 0.66} ${height * 0.54}" stroke="${palette.accent}" stroke-width="${compact ? 3 : 7}" stroke-linecap="round" fill="none" opacity="0.28"/>
      <path d="M${width * 0.69} ${height * 0.26} q32 -28 64 0 M${width * 0.71} ${height * 0.36} q38 -24 76 6" stroke="${palette.accent}" stroke-width="${compact ? 3 : 7}" stroke-linecap="round" fill="none" opacity="0.24"/>`
  }

  if (motif === 'editorial') {
    return `
      <rect x="${width * 0.56}" y="${height * (compact ? 0.16 : 0.18)}" width="${width * 0.32}" height="${height * (compact ? 0.56 : 0.48)}" rx="${compact ? 14 : 30}" fill="${palette.accent2}" opacity="0.16"/>
      <path d="M${right} ${height * 0.22}h${width * 0.18} M${right} ${height * 0.27}h${width * 0.12} M${right} ${height * 0.32}h${width * 0.2}" stroke="${palette.accent}" stroke-width="${compact ? 3 : 6}" opacity="0.48"/>
      <circle cx="${width * 0.84}" cy="${height * 0.62}" r="${compact ? 24 : 58}" fill="${palette.accent}" opacity="0.1"/>`
  }

  if (motif === 'opinion') {
    return `
      <rect x="${width * 0.72}" y="${height * 0.16}" width="${compact ? 82 : 160}" height="${compact ? 82 : 160}" rx="${compact ? 41 : 80}" fill="none" stroke="${palette.accent}" stroke-width="${compact ? 4 : 8}" opacity="0.78"/>
      <text x="${width * 0.72 + (compact ? 41 : 80)}" y="${height * 0.16 + (compact ? 48 : 94)}" text-anchor="middle" class="stamp">观点</text>
      <path d="M${width * 0.04} ${height * 0.78} L${width * 0.96} ${height * 0.18}" stroke="${palette.accent}" stroke-width="${compact ? 8 : 20}" opacity="0.08"/>`
  }

  if (motif === 'note' || motif === 'journal') {
    return `
      <g opacity="0.58">
        <rect x="${width * 0.62}" y="${height * (compact ? 0.18 : 0.12)}" width="${width * 0.24}" height="${height * (compact ? 0.48 : 0.28)}" rx="${compact ? 12 : 22}" fill="#fff" stroke="${palette.line}"/>
        <rect x="${width * 0.65}" y="${height * (compact ? 0.23 : 0.17)}" width="${width * 0.18}" height="${height * (compact ? 0.2 : 0.12)}" fill="${palette.accent2}" opacity="0.22"/>
        <path d="M${width * 0.66} ${height * (compact ? 0.51 : 0.34)} H${width * 0.82}" stroke="${palette.accent}" stroke-width="${compact ? 2 : 4}" stroke-linecap="round"/>
      </g>
      <path d="M${width * 0.12} ${height * 0.84} C${width * 0.26} ${height * 0.78} ${width * 0.38} ${height * 0.92} ${width * 0.52} ${height * 0.84}" stroke="${palette.accent2}" stroke-width="${compact ? 3 : 6}" fill="none" opacity="0.4"/>`
  }

  if (motif === 'ink') {
    return `
      <path d="M0 ${bottom} C${width * 0.22} ${height * 0.62} ${width * 0.4} ${height * 0.76} ${width * 0.62} ${height * 0.62} C${width * 0.78} ${height * 0.52} ${width * 0.9} ${height * 0.6} ${width} ${height * 0.5} L${width} ${height} L0 ${height} Z" fill="${palette.accent}" opacity="0.12"/>
      <path d="M${width * 0.12} ${height * 0.68} q80 -86 160 0 q80 -70 160 0 q80 -68 160 0" stroke="${palette.muted}" stroke-width="${compact ? 2 : 4}" fill="none" opacity="0.18"/>
      <rect x="${width * 0.79}" y="${height * 0.18}" width="${compact ? 42 : 74}" height="${compact ? 42 : 74}" rx="8" fill="none" stroke="${palette.accent2}" stroke-width="${compact ? 2 : 4}"/>
      <text x="${width * 0.79 + (compact ? 21 : 37)}" y="${height * 0.18 + (compact ? 28 : 48)}" text-anchor="middle" class="seal">读</text>`
  }

  return ''
}

function backgroundLayer(
  template: TemplateConfig,
  width: number,
  height: number,
  imageHref?: string,
  adjustments: CoverLayoutAdjustments = {}
): string {
  const { palette } = template.cover.design
  const imageScale = scaleValue(adjustments.imageScale, 1)
  const scaledWidth = width * imageScale
  const scaledHeight = height * imageScale
  const imageX = ((adjustments.imageFocusX ?? 0) + 50) / 100 * (width - scaledWidth)
  const imageY = ((adjustments.imageFocusY ?? 0) + 50) / 100 * (height - scaledHeight)
  const overlayOpacity = Math.min(1, Math.max(0, adjustments.overlayOpacity ?? 1))
  const texture = `
    <rect width="${width}" height="${height}" fill="${palette.background}"/>
    <rect width="${width}" height="${height}" fill="url(#fineGrid)" opacity="0.28"/>
    <rect x="${width * 0.055}" y="${height * 0.05}" width="${width * 0.89}" height="${height * 0.9}" rx="${Math.min(width, height) * 0.026}" fill="${palette.surface}" opacity="0.66"/>
  `

  if (!imageHref) return texture
  return `
    <image href="${esc(imageHref)}" x="${imageX}" y="${imageY}" width="${scaledWidth}" height="${scaledHeight}" preserveAspectRatio="xMidYMid slice"/>
    <rect width="${width}" height="${height}" fill="${palette.imageOverlay}" opacity="${overlayOpacity}"/>
    <rect x="${width * 0.06}" y="${height * 0.08}" width="${width * 0.56}" height="${height * 0.64}" rx="${Math.min(width, height) * 0.028}" fill="${palette.surface}" opacity="0.9"/>
  `
}

function horizontalCover(meta: ArticleMeta, template: TemplateConfig, width: number, height: number, imageHref?: string): string {
  const { palette } = template.cover.design
  const adjustments = coverAdjustments(meta)
  const titleScale = normalizeTitleScale(meta.titleScale) * scaleValue(adjustments.titleScale, 1)
  const title = titleLines(meta, true)
  const subtitle = subtitleLines(meta, true)
  const titleSize = Math.round((title.length > 1 ? 48 : 56) * titleScale)
  const subtitleSize = Math.round(24 * scaleValue(adjustments.subtitleScale, 1))
  const left = 62
  const titleY = 145
  const anchor = anchorForAdjustments(adjustments)
  const textX = xForAdjustments(left, width, adjustments, adjustments.titleOffsetX ?? 0)
  const subtitleX = xForAdjustments(left, width, adjustments, adjustments.subtitleOffsetX ?? 0)
  const authorX = xForAdjustments(left, width, adjustments, adjustments.authorOffsetX ?? 0)
  const authorSize = Math.round(14 * scaleValue(adjustments.authorScale, 1))
  const author = meta.author
    ? `<text class="meta" x="${authorX}" y="${height - 42 + (adjustments.authorOffsetY ?? 0)}" text-anchor="${anchor}">${esc(meta.author)}</text>`
    : ''

  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <title>${esc(template.name)}</title>
      <desc>${esc(template.series)}</desc>
      ${defs(template)}
      ${backgroundLayer(template, width, height, imageHref, adjustments)}
      ${motifDecor(template, width, height, true)}
      <rect x="${left}" y="50" width="138" height="32" rx="6" fill="${palette.accent}"/>
      <text class="chip" x="${left + 18}" y="72">${esc(template.name)}</text>
      <path d="M${left} 102 H${width - 64}" stroke="${palette.line}" stroke-width="1"/>
      <g>${textLines(title, textX, titleY + (adjustments.titleOffsetY ?? 0), titleSize * 1.05, 'title', anchor)}</g>
      <g>${textLines(subtitle, subtitleX, titleY + title.length * titleSize * 1.05 + 26 + (adjustments.subtitleOffsetY ?? 0), subtitleSize * 1.42, 'subtitle', anchor)}</g>
      ${author}
      ${style(template, titleSize, subtitleSize, authorSize, adjustments)}
    </svg>`
}

function verticalCover(meta: ArticleMeta, template: TemplateConfig, width: number, height: number, imageHref?: string): string {
  const { palette } = template.cover.design
  const layout = template.cover.design.layout
  const adjustments = coverAdjustments(meta)
  const titleScale = normalizeTitleScale(meta.titleScale) * scaleValue(adjustments.titleScale, 1)
  const title = titleLines(meta, false)
  const subtitle = subtitleLines(meta, false)
  const baseTitleSize = layout === 'center-statement' ? 112 : layout === 'paper-column' ? 94 : 98
  const titleSize = Math.round((title.length >= 4 ? baseTitleSize - 18 : title.length >= 3 ? baseTitleSize - 8 : baseTitleSize) * titleScale)
  const subtitleSize = Math.round(34 * scaleValue(adjustments.subtitleScale, 1))
  const left = layout === 'center-statement' ? 92 : 104
  const top = layout === 'paper-column' ? 118 : 126
  const titleY = layout === 'center-statement' ? 350 : layout === 'paper-column' ? 430 : 380
  const subtitleY = titleY + title.length * titleSize * 1.05 + 42
  const authorY = height - 176
  const anchor = anchorForAdjustments(adjustments)
  const textX = xForAdjustments(left, width, adjustments, adjustments.titleOffsetX ?? 0)
  const subtitleX = xForAdjustments(left, width, adjustments, adjustments.subtitleOffsetX ?? 0)
  const authorX = xForAdjustments(left, width, adjustments, adjustments.authorOffsetX ?? 0)
  const authorSize = Math.round(27 * scaleValue(adjustments.authorScale, 1))
  const author = meta.author
    ? `<text class="author" x="${authorX}" y="${authorY + (adjustments.authorOffsetY ?? 0)}" text-anchor="${anchor}">${esc(meta.author)}</text><text class="meta" x="${authorX}" y="${authorY + 40 + (adjustments.authorOffsetY ?? 0)}" text-anchor="${anchor}">内容创作者</text>`
    : ''
  const label = layout === 'center-statement' ? '核心观点' : template.name
  const frame =
    layout === 'paper-column'
      ? `<rect x="58" y="54" width="${width - 116}" height="${height - 108}" rx="48" fill="none" stroke="${palette.line}" stroke-width="2"/>`
      : `<path d="M${left} ${top + 70} H${left + 240}" stroke="${palette.accent}" stroke-width="8" stroke-linecap="round"/>`

  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <title>${esc(template.name)}</title>
      <desc>${esc(template.series)}</desc>
      ${defs(template)}
      ${backgroundLayer(template, width, height, imageHref, adjustments)}
      ${motifDecor(template, width, height, false)}
      ${frame}
      <text class="series" x="${left}" y="${top}">${esc(template.series)}</text>
      <text class="date" x="${width - left}" y="${top}" text-anchor="end">${new Date(meta.createdAt).getFullYear()} / ${String(new Date(meta.createdAt).getMonth() + 1).padStart(2, '0')}</text>
      <rect x="${left}" y="${top + 34}" width="${Math.max(110, label.length * 24)}" height="44" rx="10" fill="${palette.accent}" opacity="0.92"/>
      <text class="chip" x="${left + 22}" y="${top + 64}">${esc(label)}</text>
      <g>${textLines(title, textX, titleY + (adjustments.titleOffsetY ?? 0), titleSize * 1.05, 'title', anchor)}</g>
      <g>${textLines(subtitle, subtitleX, subtitleY + (adjustments.subtitleOffsetY ?? 0), subtitleSize * 1.42, 'subtitle', anchor)}</g>
      ${author}
      <g class="feature-row" transform="translate(${left}, ${height - 88})">
        <text x="0" y="0">清晰结构</text>
        <path d="M170 -10 V12" stroke="${palette.line}"/>
        <text x="220" y="0">深度表达</text>
        <path d="M390 -10 V12" stroke="${palette.line}"/>
        <text x="440" y="0">可直接发布</text>
      </g>
      ${style(template, titleSize, subtitleSize, authorSize, adjustments)}
    </svg>`
}

function defs(template: TemplateConfig): string {
  const { palette } = template.cover.design
  return `
    <defs>
      <pattern id="fineGrid" width="32" height="32" patternUnits="userSpaceOnUse">
        <path d="M32 0H0V32" fill="none" stroke="${palette.line}" stroke-width="1"/>
      </pattern>
      <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="12" stdDeviation="18" flood-color="#1a2433" flood-opacity="0.12"/>
      </filter>
    </defs>`
}

function style(
  template: TemplateConfig,
  titleSize: number,
  subtitleSize: number,
  metaSize: number,
  adjustments: CoverLayoutAdjustments = {}
): string {
  const { palette } = template.cover.design
  const shadow = adjustments.shadow ? 'filter: url(#softShadow);' : ''
  const stroke = adjustments.stroke
    ? 'paint-order: stroke; stroke: rgba(255,255,255,0.78); stroke-width: 5px; stroke-linejoin: round;'
    : ''
  return `
    <style>
      .series,.date,.meta { fill: ${palette.muted}; font-family: "Microsoft YaHei", "PingFang SC", sans-serif; font-size: ${metaSize}px; font-weight: 800; letter-spacing: 0; }
      .chip { fill: #fff; font-family: "Microsoft YaHei", "PingFang SC", sans-serif; font-size: ${metaSize + 5}px; font-weight: 900; letter-spacing: 0; }
      .title { fill: ${palette.title}; font-family: ${template.fonts.title}; font-size: ${titleSize}px; font-weight: 900; letter-spacing: 0; ${shadow} ${stroke} }
      .subtitle { fill: ${palette.subtitle}; font-family: ${template.fonts.body}; font-size: ${subtitleSize}px; font-weight: 650; letter-spacing: 0; ${shadow} }
      .author { fill: ${palette.title}; font-family: "Microsoft YaHei", "PingFang SC", sans-serif; font-size: ${metaSize + 9}px; font-weight: 900; letter-spacing: 0; ${shadow} }
      .feature-row text { fill: ${palette.muted}; font-family: "Microsoft YaHei", "PingFang SC", sans-serif; font-size: ${metaSize + 3}px; font-weight: 900; letter-spacing: 0; }
      .stamp,.seal { fill: ${palette.accent}; font-family: "Microsoft YaHei", "PingFang SC", sans-serif; font-size: ${metaSize + 10}px; font-weight: 900; letter-spacing: 0; }
    </style>`
}

export function renderCoverSvg(
  meta: ArticleMeta,
  templateInput: TemplateConfig | string | undefined,
  width: number,
  height: number,
  options: RenderCoverSvgOptions = {}
): string {
  const template = typeof templateInput === 'string' || !templateInput ? getTemplate(templateInput) : templateInput
  const compact = height < 600 || width / height > 1.7
  return compact
    ? horizontalCover(meta, template, width, height, options.backgroundImageHref)
    : verticalCover(meta, template, width, height, options.backgroundImageHref)
}
