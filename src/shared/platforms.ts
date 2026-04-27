import type { PlatformMode } from './types'

export interface PlatformPreset {
  id: PlatformMode
  name: string
  shortName: string
  coverSize: { width: number; height: number }
  pageSize: { width: number; height: number }
  websiteName: string
  websiteUrl: string
  exportFilePrefix: string
  processLabels: string[]
}

export const platformPresets: Record<PlatformMode, PlatformPreset> = {
  xiaohongshu: {
    id: 'xiaohongshu',
    name: '小红书',
    shortName: '小红书',
    coverSize: { width: 1080, height: 1440 },
    pageSize: { width: 1080, height: 1440 },
    websiteName: '小红书创作平台',
    websiteUrl: 'https://creator.xiaohongshu.com',
    exportFilePrefix: 'xiaohongshu',
    processLabels: ['导入内容', '选择模板', '生成封面', '生成正文图', '合成长图']
  },
  wechat: {
    id: 'wechat',
    name: '微信公众号',
    shortName: '公众号',
    coverSize: { width: 900, height: 383 },
    pageSize: { width: 1080, height: 1440 },
    websiteName: '微信公众平台',
    websiteUrl: 'https://mp.weixin.qq.com',
    exportFilePrefix: 'wechat',
    processLabels: ['导入内容', '选择模板', '生成外封面', '生成正文图', '合成长图']
  },
  generic: {
    id: 'generic',
    name: '通用平台',
    shortName: '通用',
    coverSize: { width: 1080, height: 1440 },
    pageSize: { width: 1080, height: 1440 },
    websiteName: '本地输出目录',
    websiteUrl: 'https://www.xiaohongshu.com',
    exportFilePrefix: 'generic',
    processLabels: ['导入内容', '选择模板', '生成封面', '生成正文图', '合成长图']
  }
}

export const platformList = Object.values(platformPresets)

export function getPlatformPreset(platform: PlatformMode): PlatformPreset {
  return platformPresets[platform] ?? platformPresets.xiaohongshu
}
