import { PAGE_HEIGHT, PAGE_WIDTH, type TemplateConfig, type TemplateId } from './types'

const titleFont = '"Microsoft YaHei", "PingFang SC", "Noto Sans CJK SC", sans-serif'
const bodyFont = '"Microsoft YaHei", "PingFang SC", "Noto Sans CJK SC", sans-serif'
const serifFont = '"Songti SC", "SimSun", "Noto Serif CJK SC", serif'
const kaiFont = '"STKaiti", "KaiTi", "Microsoft YaHei", serif'

function page(
  paddingTop: number,
  paddingRight: number,
  paddingBottom: number,
  paddingLeft: number,
  contentTopOffset = 28
): TemplateConfig['page'] {
  return {
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
    paddingTop,
    paddingRight,
    paddingBottom,
    paddingLeft,
    contentTopOffset
  }
}

export const templateIds = [
  'tech-briefing',
  'business-mono',
  'warm-column',
  'editorial-clean',
  'bold-opinion',
  'fresh-note',
  'shan-shui',
  'essay-notes',
  'journal-growth'
] as const satisfies readonly TemplateId[]

export const defaultTemplateId: TemplateId = 'tech-briefing'

export function normalizeTitleScale(value: number | undefined): number {
  if (!Number.isFinite(value)) return 1
  return Math.min(1.3, Math.max(0.8, value ?? 1))
}

export function withTitleScale(template: TemplateConfig, value: number | undefined): TemplateConfig {
  const scale = normalizeTitleScale(value)
  if (scale === 1) return template
  return {
    ...template,
    typography: {
      ...template.typography,
      h1: {
        ...template.typography.h1,
        fontSize: Math.round(template.typography.h1.fontSize * scale)
      }
    }
  }
}

export const templates: Record<TemplateId, TemplateConfig> = {
  'editorial-clean': {
    id: 'editorial-clean',
    name: '清爽杂志',
    series: 'Editorial Clean / Template 01',
    description: '白底黑字、蓝灰强调、版心宽松，适合知识长文和公众号阅读。',
    page: page(108, 104, 106, 104, 28),
    colors: {
      background: '#eef3f8',
      paper: '#ffffff',
      text: '#172033',
      muted: '#6d7888',
      accent: '#315f96',
      accent2: '#9fb4c8',
      border: '#d9e2ec',
      quoteBackground: 'rgba(49, 95, 150, 0.08)'
    },
    fonts: {
      title: titleFont,
      body: bodyFont,
      accent: titleFont
    },
    typography: {
      h1: { fontSize: 78, lineHeight: 1.08, marginBottom: 34, fontWeight: 800 },
      h2: { fontSize: 44, lineHeight: 1.25, marginBottom: 24, fontWeight: 800 },
      h3: { fontSize: 34, lineHeight: 1.28, marginBottom: 18, fontWeight: 800 },
      paragraph: { fontSize: 30, lineHeight: 1.82, marginBottom: 25 },
      quote: { fontSize: 30, lineHeight: 1.72, marginBottom: 27 },
      list: { fontSize: 29, lineHeight: 1.7, marginBottom: 24 }
    },
    cover: {
      titleColor: '#ffffff',
      subtitleColor: '#d9e8f7',
      overlay: 'linear-gradient(180deg, rgba(23, 32, 51, 0.12), rgba(23, 32, 51, 0.72))'
    }
  },
  'business-mono': {
    id: 'business-mono',
    name: '黑白商务报告',
    series: 'Business Report / 2026',
    description: '黑白灰、强标题、左竖线引用，适合公众号、商业分析和观点长文。',
    page: page(104, 110, 108, 110, 24),
    colors: {
      background: '#ecebea',
      paper: '#fbfbfa',
      text: '#222222',
      muted: '#6e6e6e',
      accent: '#0d0d0d',
      accent2: '#c7b79f',
      border: '#d6d2cb',
      quoteBackground: 'rgba(20, 20, 20, 0.045)'
    },
    fonts: {
      title: titleFont,
      body: bodyFont,
      accent: '"Georgia", "Times New Roman", serif'
    },
    typography: {
      h1: { fontSize: 82, lineHeight: 1.02, marginBottom: 36, fontWeight: 900 },
      h2: { fontSize: 44, lineHeight: 1.2, marginBottom: 24, fontWeight: 900 },
      h3: { fontSize: 31, lineHeight: 1.32, marginBottom: 18, fontWeight: 850 },
      paragraph: { fontSize: 29, lineHeight: 1.86, marginBottom: 25 },
      quote: { fontSize: 29, lineHeight: 1.76, marginBottom: 28 },
      list: { fontSize: 28, lineHeight: 1.74, marginBottom: 24 }
    },
    cover: {
      titleColor: '#111111',
      subtitleColor: '#4a4a4a',
      overlay: 'linear-gradient(90deg, rgba(255,255,255,0.94), rgba(255,255,255,0.7), rgba(255,255,255,0.2))'
    }
  },
  'tech-briefing': {
    id: 'tech-briefing',
    name: '蓝色科技系统',
    series: '科技简报 / 2026.05',
    description: '浅蓝网格、编号标题、提示卡片，适合 AI、效率、产品和技术文章。',
    page: page(96, 86, 98, 86, 24),
    colors: {
      background: '#e9f4ff',
      paper: '#f8fbff',
      text: '#071b3a',
      muted: '#5d6f8c',
      accent: '#1976ff',
      accent2: '#7bb7ff',
      border: '#b9d6ff',
      quoteBackground: 'rgba(25, 118, 255, 0.075)'
    },
    fonts: {
      title: titleFont,
      body: bodyFont,
      accent: '"Cascadia Code", "Consolas", monospace'
    },
    typography: {
      h1: { fontSize: 72, lineHeight: 1.08, marginBottom: 34, fontWeight: 900 },
      h2: { fontSize: 40, lineHeight: 1.24, marginBottom: 24, fontWeight: 900 },
      h3: { fontSize: 31, lineHeight: 1.28, marginBottom: 18, fontWeight: 850 },
      paragraph: { fontSize: 28, lineHeight: 1.78, marginBottom: 23 },
      quote: { fontSize: 28, lineHeight: 1.68, marginBottom: 26 },
      list: { fontSize: 27, lineHeight: 1.68, marginBottom: 22 }
    },
    cover: {
      titleColor: '#061a3a',
      subtitleColor: '#506582',
      overlay: 'linear-gradient(90deg, rgba(248,251,255,0.96), rgba(248,251,255,0.76), rgba(248,251,255,0.24))'
    }
  },
  'warm-column': {
    id: 'warm-column',
    name: '暖金阅读专栏',
    series: '系列主题 / 读写成长',
    description: '米白纸感、金色强调、柔和引用块，适合成长、读书和方法论内容。',
    page: page(108, 96, 108, 96, 28),
    colors: {
      background: '#efe5d3',
      paper: '#fff8ea',
      text: '#32302c',
      muted: '#786f62',
      accent: '#c99531',
      accent2: '#dec28e',
      border: '#e4d2ae',
      quoteBackground: 'rgba(201, 149, 49, 0.1)'
    },
    fonts: {
      title: serifFont,
      body: bodyFont,
      accent: serifFont
    },
    typography: {
      h1: { fontSize: 76, lineHeight: 1.08, marginBottom: 34, fontWeight: 800 },
      h2: { fontSize: 42, lineHeight: 1.25, marginBottom: 24, fontWeight: 850 },
      h3: { fontSize: 31, lineHeight: 1.3, marginBottom: 18, fontWeight: 850 },
      paragraph: { fontSize: 29, lineHeight: 1.82, marginBottom: 24 },
      quote: { fontSize: 29, lineHeight: 1.72, marginBottom: 27 },
      list: { fontSize: 28, lineHeight: 1.72, marginBottom: 24 }
    },
    cover: {
      titleColor: '#2f2d29',
      subtitleColor: '#5f574c',
      overlay: 'linear-gradient(90deg, rgba(255,248,234,0.96), rgba(255,248,234,0.72), rgba(255,248,234,0.18))'
    }
  },
  'bold-opinion': {
    id: 'bold-opinion',
    name: '强观点',
    series: 'Bold Opinion / Template 05',
    description: '黑白红高对比、标题冲击力强，适合观点、金句和争议话题。',
    page: page(98, 88, 98, 88, 24),
    colors: {
      background: '#f0f0ee',
      paper: '#fbfaf7',
      text: '#111111',
      muted: '#696969',
      accent: '#d9291c',
      accent2: '#111111',
      border: '#181818',
      quoteBackground: 'rgba(217, 41, 28, 0.09)'
    },
    fonts: {
      title: titleFont,
      body: bodyFont,
      accent: titleFont
    },
    typography: {
      h1: { fontSize: 86, lineHeight: 0.98, marginBottom: 34, fontWeight: 900 },
      h2: { fontSize: 46, lineHeight: 1.16, marginBottom: 24, fontWeight: 900 },
      h3: { fontSize: 34, lineHeight: 1.24, marginBottom: 18, fontWeight: 900 },
      paragraph: { fontSize: 30, lineHeight: 1.72, marginBottom: 24 },
      quote: { fontSize: 31, lineHeight: 1.62, marginBottom: 27 },
      list: { fontSize: 29, lineHeight: 1.62, marginBottom: 23 }
    },
    cover: {
      titleColor: '#ffffff',
      subtitleColor: '#ffc4bd',
      overlay: 'linear-gradient(180deg, rgba(12, 12, 12, 0.18), rgba(12, 12, 12, 0.82))'
    }
  },
  'fresh-note': {
    id: 'fresh-note',
    name: '清新笔记',
    series: 'Fresh Note / Template 06',
    description: '绿色、浅黄、轻手写感点缀，适合小红书笔记、方法清单和轻教程。',
    page: page(108, 92, 104, 108, 28),
    colors: {
      background: '#e5eadc',
      paper: '#fffbed',
      text: '#3b422f',
      muted: '#7d876d',
      accent: '#6e8f57',
      accent2: '#e6bd5d',
      border: '#d9ddb9',
      quoteBackground: 'rgba(110, 143, 87, 0.12)'
    },
    fonts: {
      title: kaiFont,
      body: bodyFont,
      accent: kaiFont
    },
    typography: {
      h1: { fontSize: 82, lineHeight: 1.04, marginBottom: 32, fontWeight: 700 },
      h2: { fontSize: 44, lineHeight: 1.22, marginBottom: 24, fontWeight: 800 },
      h3: { fontSize: 34, lineHeight: 1.28, marginBottom: 18, fontWeight: 800 },
      paragraph: { fontSize: 30, lineHeight: 1.78, marginBottom: 24 },
      quote: { fontSize: 30, lineHeight: 1.68, marginBottom: 26 },
      list: { fontSize: 29, lineHeight: 1.68, marginBottom: 23 }
    },
    cover: {
      titleColor: '#fffbe9',
      subtitleColor: '#e8f4d8',
      overlay: 'linear-gradient(180deg, rgba(40, 63, 35, 0.08), rgba(40, 63, 35, 0.7))'
    }
  },
  'shan-shui': {
    id: 'shan-shui',
    name: '清新阅读',
    series: '山水修行系列 / Template 08',
    description: '宣纸肌理、墨绿山水、竹影与留白，适合修行、哲思和知识沉淀。',
    page: page(118, 96, 116, 96, 36),
    colors: {
      background: '#efe8d8',
      paper: '#f7f1e3',
      text: '#384137',
      muted: '#7b8375',
      accent: '#526b55',
      accent2: '#b64337',
      border: '#c9c0aa',
      quoteBackground: 'rgba(103, 121, 96, 0.14)'
    },
    fonts: {
      title: kaiFont,
      body: kaiFont,
      accent: kaiFont
    },
    typography: {
      h1: { fontSize: 104, lineHeight: 1.05, marginBottom: 34, fontWeight: 700 },
      h2: { fontSize: 50, lineHeight: 1.25, marginBottom: 28, fontWeight: 700 },
      h3: { fontSize: 38, lineHeight: 1.3, marginBottom: 22, fontWeight: 700 },
      paragraph: { fontSize: 31, lineHeight: 1.88, marginBottom: 28 },
      quote: { fontSize: 31, lineHeight: 1.8, marginBottom: 30 },
      list: { fontSize: 30, lineHeight: 1.78, marginBottom: 26 }
    },
    cover: {
      titleColor: '#fff5d8',
      subtitleColor: '#e4d7ac',
      overlay: 'linear-gradient(180deg, rgba(20, 24, 20, 0.18), rgba(20, 24, 20, 0.76))'
    }
  },
  'essay-notes': {
    id: 'essay-notes',
    name: '温暖治愈',
    series: '感悟随笔系列 / Template 09',
    description: '温暖纸张、胶带、植物、印章与手写感，适合生活感悟和成长随笔。',
    page: page(112, 92, 106, 92, 34),
    colors: {
      background: '#ead8bd',
      paper: '#fff7e9',
      text: '#4a382b',
      muted: '#8b7d65',
      accent: '#c1773c',
      accent2: '#778564',
      border: '#d7bf9e',
      quoteBackground: 'rgba(210, 148, 79, 0.14)'
    },
    fonts: {
      title: serifFont,
      body: kaiFont,
      accent: kaiFont
    },
    typography: {
      h1: { fontSize: 92, lineHeight: 1.05, marginBottom: 32, fontWeight: 600 },
      h2: { fontSize: 46, lineHeight: 1.28, marginBottom: 26, fontWeight: 700 },
      h3: { fontSize: 36, lineHeight: 1.32, marginBottom: 20, fontWeight: 700 },
      paragraph: { fontSize: 30, lineHeight: 1.85, marginBottom: 27 },
      quote: { fontSize: 30, lineHeight: 1.78, marginBottom: 28 },
      list: { fontSize: 29, lineHeight: 1.75, marginBottom: 25 }
    },
    cover: {
      titleColor: '#fff2dd',
      subtitleColor: '#f1c99b',
      overlay: 'linear-gradient(180deg, rgba(54, 31, 16, 0.08), rgba(54, 31, 16, 0.7))'
    }
  },
  'journal-growth': {
    id: 'journal-growth',
    name: '手账成长',
    series: '手账成长系列 / Template 10',
    description: '活页本、贴纸、拍立得、彩色标签，适合小红书笔记和轻松教程。',
    page: page(108, 82, 104, 118, 32),
    colors: {
      background: '#ddc7aa',
      paper: '#fff8ea',
      text: '#4c3a29',
      muted: '#8d846d',
      accent: '#e59a8f',
      accent2: '#81936c',
      border: '#decdb2',
      quoteBackground: 'rgba(124, 150, 174, 0.16)'
    },
    fonts: {
      title: kaiFont,
      body: kaiFont,
      accent: kaiFont
    },
    typography: {
      h1: { fontSize: 88, lineHeight: 1.05, marginBottom: 30, fontWeight: 700 },
      h2: { fontSize: 44, lineHeight: 1.26, marginBottom: 26, fontWeight: 700 },
      h3: { fontSize: 36, lineHeight: 1.3, marginBottom: 20, fontWeight: 700 },
      paragraph: { fontSize: 30, lineHeight: 1.78, marginBottom: 26 },
      quote: { fontSize: 30, lineHeight: 1.74, marginBottom: 28 },
      list: { fontSize: 29, lineHeight: 1.72, marginBottom: 24 }
    },
    cover: {
      titleColor: '#fff8ea',
      subtitleColor: '#f7c9b5',
      overlay: 'linear-gradient(180deg, rgba(57, 38, 21, 0.06), rgba(57, 38, 21, 0.62))'
    }
  }
}

export const templateList = templateIds.map((id) => templates[id])

export function isTemplateId(value: unknown): value is TemplateId {
  return typeof value === 'string' && templateIds.includes(value as TemplateId)
}

export function getTemplate(id: TemplateId | string | undefined): TemplateConfig {
  return isTemplateId(id) ? templates[id] : templates[defaultTemplateId]
}
