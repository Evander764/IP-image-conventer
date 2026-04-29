import { useEffect, useMemo, useState } from 'react'
import {
  Bot,
  Check,
  ChevronLeft,
  ChevronRight,
  Clipboard,
  Download,
  ExternalLink,
  FileText,
  FolderOpen,
  History,
  Image,
  LayoutTemplate,
  Loader2,
  MonitorCog,
  Package,
  RefreshCw,
  Save,
  Sparkles,
  Trash2,
  UploadCloud,
  Wand2,
  X,
  ZoomIn,
  ZoomOut
} from 'lucide-react'
import { createAssistantSuggestions } from '../shared/assistant'
import { renderCoverSvg } from '../shared/cover'
import { parsePageRange } from '../shared/exporting'
import { renderArticlePageHtml } from '../shared/html'
import { parseMarkdown } from '../shared/markdown'
import { paginateBlocks } from '../shared/pagination'
import { getPlatformPreset, platformList } from '../shared/platforms'
import { applyLayoutAdjustments, defaultTemplateId, getTemplate, templateList, withTitleScale } from '../shared/templates'
import type {
  ArticleBlock,
  ArticleMeta,
  BrowserAutomationState,
  CoverLayoutAdjustments,
  CustomTemplateConfig,
  ExportAssetType,
  ExportFormat,
  ExportSettings,
  GenerationStep,
  LayoutAdjustments,
  LoadedProject,
  ProjectInfo,
  RecentExport,
  RenderJob,
  TemplateConfig,
  TemplateId,
  UpdateCheckResult
} from '../shared/types'

const DRAFT_KEY = 'ip-image-converter:draft:v5'
const RECENT_KEY = 'ip-image-converter:recent:v5'
const CUSTOM_TEMPLATE_KEY = 'ip-image-converter:custom-templates:v1'
const PROJECT_HISTORY_KEY = 'ip-image-converter:projects:v1'

type ToolPanel = 'content' | 'design' | 'cover' | 'body' | 'export' | 'project'
type PreviewMode = 'cover' | 'page' | 'long'

interface MetaDraft {
  title: string
  subtitle: string
  author: string
}

interface DraftState {
  markdown: string
  templateId: TemplateId
  platform: ArticleMeta['platform']
  titleScale: number
  metaDraft: MetaDraft
  tags: string[]
  coverPrompt: string
  layoutAdjustments: LayoutAdjustments
  coverLayoutAdjustments: CoverLayoutAdjustments
  exportSettings: ExportSettings
}

interface GenerationState {
  activeStep: GenerationStep | null
  completed: GenerationStep[]
  message: string
  progress: number
  isGenerating: boolean
}

interface ProjectRecord {
  id: string
  title: string
  projectDir: string
  outputDir: string
  configPath: string
  createdAt: string
}

const initialMarkdown = `---
title: 为什么普通人越来越难专注
subtitle: 在信息过载的时代，如何找回深度与专注力
author: 图文转换器
template: tech-briefing
---

# 为什么普通人越来越难专注

## 信息过载：注意力的隐形杀手

我们每天被海量信息包围：社交媒体、短视频、新闻推送、群聊消息……大脑在不断切换中疲惫，真正能沉浸的时间越来越少。

> 专注不是天赋，而是一种可以训练的能力。

## 找回专注的三个方法

- 给每一段工作设置明确目标
- 关闭不必要的通知和入口
- 用固定时间做深度阅读和复盘

当我们把环境变简单，把目标变清楚，注意力就会重新回到真正重要的事情上。`

const defaultLayoutAdjustments: LayoutAdjustments = {
  bodyFontSizeDelta: 0,
  bodyLineHeightDelta: 0,
  paragraphSpacingDelta: 0,
  h1FontSizeDelta: 0,
  h2FontSizeDelta: 0,
  h3FontSizeDelta: 0,
  paddingXDelta: 0,
  paddingTopDelta: 0,
  paddingBottomDelta: 0,
  contentTopOffsetDelta: 0,
  quotePaddingDelta: 0,
  listSpacingDelta: 0,
  pageMarkPosition: 'bottom-right'
}

const defaultCoverAdjustments: CoverLayoutAdjustments = {
  titleOffsetX: 0,
  titleOffsetY: 0,
  subtitleOffsetX: 0,
  subtitleOffsetY: 0,
  authorOffsetX: 0,
  authorOffsetY: 0,
  titleScale: 1,
  subtitleScale: 1,
  authorScale: 1,
  maxWidthScale: 1,
  align: 'left',
  shadow: false,
  stroke: false,
  imageScale: 1,
  imageFocusX: 0,
  imageFocusY: 0,
  overlayOpacity: 1
}

const defaultExportSettings: ExportSettings = {
  format: 'zip',
  assetType: 'all',
  platform: 'xiaohongshu',
  pageSize: '1080 x 1440 (3:4)',
  quality: 96,
  pageRange: '',
  includeSource: true,
  packageMode: 'publish'
}

const defaultDraft: DraftState = {
  markdown: initialMarkdown,
  templateId: defaultTemplateId,
  platform: 'xiaohongshu',
  titleScale: 1,
  metaDraft: {
    title: '为什么普通人越来越难专注',
    subtitle: '在信息过载的时代，如何找回深度与专注力',
    author: '图文转换器'
  },
  tags: ['专注力', '效率', '成长'],
  coverPrompt: '清爽杂志风，书桌、台灯、笔记本、咖啡，温暖自然光，突出专注与思考氛围',
  layoutAdjustments: defaultLayoutAdjustments,
  coverLayoutAdjustments: defaultCoverAdjustments,
  exportSettings: defaultExportSettings
}

const toolPanels: Array<{ id: ToolPanel; title: string; hint: string; icon: typeof FileText }> = [
  { id: 'content', title: '内容', hint: '文章与标签', icon: FileText },
  { id: 'design', title: '设计', hint: '平台与模板', icon: LayoutTemplate },
  { id: 'cover', title: '封面', hint: '文字与底图', icon: Image },
  { id: 'body', title: '正文', hint: '排版与分页', icon: Wand2 },
  { id: 'export', title: '导出', hint: '发布资产包', icon: Download },
  { id: 'project', title: '项目', hint: '历史与发布', icon: Package }
]

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function readDraft(): DraftState {
  const parsed = readJson<Partial<DraftState>>(DRAFT_KEY, {})
  return {
    ...defaultDraft,
    ...parsed,
    templateId: getTemplate(parsed.templateId).id,
    metaDraft: { ...defaultDraft.metaDraft, ...parsed.metaDraft },
    layoutAdjustments: { ...defaultLayoutAdjustments, ...parsed.layoutAdjustments },
    coverLayoutAdjustments: { ...defaultCoverAdjustments, ...parsed.coverLayoutAdjustments },
    exportSettings: { ...defaultExportSettings, ...parsed.exportSettings }
  }
}

function createMetaDraft(markdown: string, templateId: TemplateId): MetaDraft {
  const parsed = parseMarkdown(markdown, templateId)
  return {
    title: parsed.meta.title ?? '',
    subtitle: parsed.meta.subtitle ?? '',
    author: parsed.meta.author ?? ''
  }
}

function withFallbackTitle(blocks: ArticleBlock[], meta: ArticleMeta): ArticleBlock[] {
  if (blocks.some((block) => block.type === 'heading' && block.level === 1)) return blocks
  return [
    {
      id: 'preview-title',
      type: 'heading',
      level: 1,
      text: meta.title,
      children: [{ text: meta.title }]
    },
    ...blocks
  ]
}

function fileName(path: string): string {
  return path.split(/[\\/]/).pop() ?? path
}

function nowTime(): string {
  return new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function localFileUrl(path: string): string {
  return `file:///${encodeURI(path.replace(/\\/g, '/'))}`
}

function svgDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

function coverFrameHtml(svg: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><style>html,body{width:100%;height:100%;margin:0;overflow:hidden;background:#fff}svg{display:block;width:100%;height:100%}</style></head><body>${svg}</body></html>`
}

function exportKindName(kind: ExportAssetType): string {
  if (kind === 'pages') return '单页图'
  if (kind === 'long') return '长图'
  if (kind === 'cover') return '封面图'
  return '全部素材'
}

function exportFormatName(format: ExportFormat): string {
  if (format === 'jpg') return 'JPG'
  if (format === 'webp') return 'WebP'
  if (format === 'pdf') return 'PDF'
  if (format === 'zip') return 'ZIP'
  return 'PNG'
}

function coverExportNameForPlatform(platform: ArticleMeta['platform'], format: ExportFormat): string {
  const stem = platform === 'wechat' ? 'cover_wechat' : 'cover_vertical'
  return `${stem}.${format}`
}

function pageMarkName(value: LayoutAdjustments['pageMarkPosition']): string {
  if (value === 'bottom-center') return '底部居中'
  if (value === 'hidden') return '隐藏'
  return '右下角'
}

function alignmentName(value: CoverLayoutAdjustments['align']): string {
  if (value === 'center') return '居中'
  if (value === 'right') return '右对齐'
  return '左对齐'
}

function publishSummary(markdown: string): string {
  return markdown
    .replace(/^---[\s\S]*?---/, '')
    .replace(/[#>*_`\-\[\]\(\)]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120)
}

function App(): JSX.Element {
  const [draft, setDraft] = useState<DraftState>(() => readDraft())
  const [activePanel, setActivePanel] = useState<ToolPanel>('content')
  const [previewMode, setPreviewMode] = useState<PreviewMode>('page')
  const [selectedPage, setSelectedPage] = useState(1)
  const [zoom, setZoom] = useState(0.44)
  const [assistantOpen, setAssistantOpen] = useState(false)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [assistantSeed, setAssistantSeed] = useState(0)
  const [importedFilePath, setImportedFilePath] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [coverImagePath, setCoverImagePath] = useState('')
  const [projectInfo, setProjectInfo] = useState<ProjectInfo | null>(null)
  const [currentJob, setCurrentJob] = useState<RenderJob | null>(null)
  const [recentExports, setRecentExports] = useState<RecentExport[]>(() => readJson(RECENT_KEY, []))
  const [projectHistory, setProjectHistory] = useState<ProjectRecord[]>(() => readJson(PROJECT_HISTORY_KEY, []))
  const [customTemplates, setCustomTemplates] = useState<CustomTemplateConfig[]>(() => readJson(CUSTOM_TEMPLATE_KEY, []))
  const [savedAt, setSavedAt] = useState(() => nowTime())
  const [error, setError] = useState('')
  const [updateInfo, setUpdateInfo] = useState<UpdateCheckResult | null>(null)
  const [generation, setGeneration] = useState<GenerationState>({
    activeStep: null,
    completed: [],
    message: '等待操作',
    progress: 0,
    isGenerating: false
  })
  const [automation, setAutomation] = useState<BrowserAutomationState>({
    websiteName: getPlatformPreset(draft.platform).websiteName,
    websiteUrl: getPlatformPreset(draft.platform).websiteUrl,
    connected: false,
    handoffReady: false,
    promptCopied: false
  })

  const platformPreset = getPlatformPreset(draft.platform)
  const baseTemplate = getTemplate(draft.templateId)
  const template = useMemo(
    () => applyLayoutAdjustments(withTitleScale(baseTemplate, draft.titleScale), draft.layoutAdjustments),
    [baseTemplate, draft.layoutAdjustments, draft.titleScale]
  )
  const parsed = useMemo(() => parseMarkdown(draft.markdown, draft.templateId), [draft.markdown, draft.templateId])
  const meta: ArticleMeta = useMemo(
    () => ({
      title: draft.metaDraft.title.trim() || parsed.meta.title || '未命名文章',
      subtitle: draft.metaDraft.subtitle.trim() || parsed.meta.subtitle,
      author: draft.metaDraft.author.trim() || parsed.meta.author,
      platform: draft.platform,
      template: draft.templateId,
      createdAt: new Date().toISOString(),
      titleScale: draft.titleScale,
      coverLayoutAdjustments: draft.coverLayoutAdjustments
    }),
    [draft.coverLayoutAdjustments, draft.metaDraft, draft.platform, draft.templateId, draft.titleScale, parsed.meta.author, parsed.meta.subtitle, parsed.meta.title]
  )
  const previewPages = useMemo(
    () => paginateBlocks(withFallbackTitle(parsed.blocks, meta), template),
    [meta, parsed.blocks, template]
  )
  const selectedPreviewPage = previewPages[Math.max(0, Math.min(selectedPage - 1, previewPages.length - 1))]
  const selectedHtml = useMemo(
    () => renderArticlePageHtml(meta, selectedPreviewPage, template),
    [meta, selectedPreviewPage, template]
  )
  const coverSvg = useMemo(
    () =>
      renderCoverSvg(meta, template, platformPreset.coverSize.width, platformPreset.coverSize.height, {
        backgroundImageHref: coverImagePath ? localFileUrl(coverImagePath) : undefined
      }),
    [coverImagePath, meta, platformPreset.coverSize.height, platformPreset.coverSize.width, template]
  )
  const coverHtml = useMemo(() => coverFrameHtml(coverSvg), [coverSvg])
  const suggestions = useMemo(
    () => createAssistantSuggestions(draft.markdown, meta.title, meta.subtitle ?? '', draft.templateId, assistantSeed),
    [assistantSeed, draft.markdown, draft.templateId, meta.subtitle, meta.title]
  )
  const visiblePageNumbers = useMemo(
    () => parsePageRange(draft.exportSettings.pageRange, previewPages.length),
    [draft.exportSettings.pageRange, previewPages.length]
  )
  const estimatedFiles = useMemo(() => {
    const { assetType, format } = draft.exportSettings
    if (format === 'zip') return [`${draft.platform}-${draft.exportSettings.packageMode ?? 'publish'}-package.zip`]
    if (format === 'pdf') return [`${draft.platform}-${assetType}.pdf`]

    const files: string[] = []
    if (assetType === 'cover' || assetType === 'all') {
      files.push(coverExportNameForPlatform(draft.platform, format))
    }
    if (assetType === 'pages' || assetType === 'all') {
      visiblePageNumbers.forEach((page) => files.push(`page-${page.toString().padStart(3, '0')}.${format}`))
    }
    if (assetType === 'long' || assetType === 'all') files.push(`long.${format}`)
    return files
  }, [draft.exportSettings, draft.platform, visiblePageNumbers])
  const qualityWarnings = useMemo(() => {
    const warnings: string[] = []
    if (!meta.title.trim()) warnings.push('缺少标题')
    if (!meta.author?.trim()) warnings.push('缺少作者')
    if (previewPages.length > 12) warnings.push(`正文页数偏多：${previewPages.length} 页`)
    if (previewPages.some((page) => page.blocks.length === 0)) warnings.push('存在空白页')
    if (draft.exportSettings.assetType === 'pages' && !visiblePageNumbers.length) warnings.push('页范围没有匹配正文页')
    if (draft.platform === 'wechat' && previewMode === 'cover') warnings.push('公众号封面为横版，请检查标题是否在安全区内')
    return warnings
  }, [draft.exportSettings.assetType, draft.platform, meta.author, meta.title, previewMode, previewPages, visiblePageNumbers])
  const publishText = useMemo(
    () =>
      [
        `标题：${meta.title}`,
        meta.subtitle ? `副标题：${meta.subtitle}` : '',
        `摘要：${publishSummary(draft.markdown)}`,
        `标签：${draft.tags.map((tag) => `#${tag}`).join(' ')}`,
        `封面提示词：${draft.coverPrompt}`,
        `发布检查：封面、正文 ${previewPages.length} 页、长图、标题、标签已核对。`
      ]
        .filter(Boolean)
        .join('\n'),
    [draft.coverPrompt, draft.markdown, draft.tags, meta.subtitle, meta.title, previewPages.length]
  )

  useEffect(() => {
    const preset = getPlatformPreset(draft.platform)
    setAutomation((current) => ({
      ...current,
      websiteName: preset.websiteName,
      websiteUrl: preset.websiteUrl,
      connected: false,
      handoffReady: false
    }))
    setDraft((current) => ({
      ...current,
      exportSettings: {
        ...current.exportSettings,
        platform: current.platform,
        pageSize: `${preset.pageSize.width} x ${preset.pageSize.height} (3:4)`
      }
    }))
  }, [draft.platform])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
      setSavedAt(nowTime())
    }, 400)
    return () => window.clearTimeout(timer)
  }, [draft])

  useEffect(() => {
    localStorage.setItem(RECENT_KEY, JSON.stringify(recentExports.slice(0, 16)))
  }, [recentExports])

  useEffect(() => {
    localStorage.setItem(PROJECT_HISTORY_KEY, JSON.stringify(projectHistory.slice(0, 12)))
  }, [projectHistory])

  useEffect(() => {
    localStorage.setItem(CUSTOM_TEMPLATE_KEY, JSON.stringify(customTemplates.slice(0, 24)))
  }, [customTemplates])

  useEffect(() => {
    void window.ipWriter.checkForUpdate().then((result) => {
      if (result.available) setUpdateInfo(result)
    })
  }, [])

  useEffect(() => {
    if (selectedPage > previewPages.length) setSelectedPage(previewPages.length || 1)
  }, [previewPages.length, selectedPage])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      const target = event.target as HTMLElement | null
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return
      if (event.key === 'ArrowLeft') {
        setPreviewMode('page')
        setSelectedPage((value) => Math.max(1, value - 1))
      }
      if (event.key === 'ArrowRight') {
        setPreviewMode('page')
        setSelectedPage((value) => Math.min(previewPages.length, value + 1))
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [previewPages.length])

  function patchDraft(partial: Partial<DraftState>): void {
    setDraft((current) => ({ ...current, ...partial }))
  }

  function patchMeta(partial: Partial<MetaDraft>): void {
    setDraft((current) => ({ ...current, metaDraft: { ...current.metaDraft, ...partial } }))
  }

  function patchLayout(partial: Partial<LayoutAdjustments>): void {
    setDraft((current) => ({ ...current, layoutAdjustments: { ...current.layoutAdjustments, ...partial } }))
  }

  function patchCover(partial: Partial<CoverLayoutAdjustments>): void {
    setDraft((current) => ({ ...current, coverLayoutAdjustments: { ...current.coverLayoutAdjustments, ...partial } }))
  }

  function patchExportSettings(partial: Partial<ExportSettings>): void {
    setDraft((current) => ({ ...current, exportSettings: { ...current.exportSettings, ...partial } }))
  }

  function addRecent(paths: string[], kind: ExportAssetType, format: ExportFormat): void {
    const records = paths.map((path, index) => ({
      id: `${Date.now()}-${index}`,
      title: fileName(path),
      kind,
      format,
      size: format === 'pdf' || format === 'zip' ? exportFormatName(format) : kind === 'cover' ? `${platformPreset.coverSize.width}x${platformPreset.coverSize.height}` : '1080x1440',
      path,
      createdAt: new Date().toISOString()
    }))
    setRecentExports((current) => [...records, ...current].slice(0, 16))
  }

  function addProjectRecord(project: ProjectInfo): void {
    const record: ProjectRecord = {
      id: `${Date.now()}`,
      title: meta.title,
      projectDir: project.projectDir,
      outputDir: project.outputDir,
      configPath: project.configPath,
      createdAt: new Date().toISOString()
    }
    setProjectHistory((current) => [record, ...current.filter((item) => item.projectDir !== project.projectDir)].slice(0, 12))
  }

  function setGenerationStep(step: GenerationStep, message: string, progress: number): void {
    setGeneration((current) => ({ ...current, activeStep: step, message, progress }))
  }

  function completeGenerationStep(step: GenerationStep): void {
    setGeneration((current) => ({
      ...current,
      completed: current.completed.includes(step) ? current.completed : [...current.completed, step]
    }))
  }

  async function importMarkdown(): Promise<void> {
    const imported = await window.ipWriter.importMarkdownFile()
    if (!imported) return
    patchDraft({ markdown: imported.content, metaDraft: createMetaDraft(imported.content, draft.templateId) })
    setImportedFilePath(imported.filePath)
  }

  async function openProject(): Promise<void> {
    const loaded = await window.ipWriter.openProjectFile()
    if (!loaded) return
    applyLoadedProject(loaded)
  }

  function applyLoadedProject(loaded: LoadedProject): void {
    const templateId = getTemplate(loaded.meta.template).id
    setDraft((current) => ({
      ...current,
      markdown: loaded.markdown || current.markdown,
      templateId,
      platform: loaded.meta.platform ?? current.platform,
      titleScale: loaded.meta.titleScale ?? current.titleScale,
      metaDraft: {
        title: loaded.meta.title ?? current.metaDraft.title,
        subtitle: loaded.meta.subtitle ?? '',
        author: loaded.meta.author ?? ''
      },
      tags: loaded.tags,
      coverPrompt: loaded.coverPrompt,
      layoutAdjustments: { ...defaultLayoutAdjustments, ...loaded.layoutAdjustments },
      coverLayoutAdjustments: {
        ...defaultCoverAdjustments,
        ...loaded.meta.coverLayoutAdjustments
      },
      exportSettings: { ...defaultExportSettings, ...loaded.exportSettings }
    }))
    setCoverImagePath(loaded.coverImagePath ?? '')
    setImportedFilePath(loaded.sourcePath)
    setProjectInfo({
      projectDir: loaded.projectDir,
      outputDir: `${loaded.projectDir}\\output`,
      sourcePath: loaded.sourcePath,
      configPath: loaded.configPath
    })
  }

  async function readDroppedMarkdown(file: File): Promise<void> {
    const content = await file.text()
    patchDraft({ markdown: content, metaDraft: createMetaDraft(content, draft.templateId) })
    setImportedFilePath(file.name)
  }

  async function selectCoverImage(): Promise<void> {
    const path = await window.ipWriter.selectCoverImage()
    if (path) setCoverImagePath(path)
  }

  function addTag(value = tagInput): void {
    const tag = value.trim()
    if (!tag || draft.tags.includes(tag)) return
    patchDraft({ tags: [...draft.tags, tag].slice(0, 12) })
    setTagInput('')
  }

  function removeTag(tag: string): void {
    patchDraft({ tags: draft.tags.filter((item) => item !== tag) })
  }

  function applySuggestion(text: string, target: 'title' | 'subtitle' | 'tag' | 'coverPrompt'): void {
    if (target === 'title') patchMeta({ title: text })
    if (target === 'subtitle') patchMeta({ subtitle: text })
    if (target === 'tag') addTag(text)
    if (target === 'coverPrompt') patchDraft({ coverPrompt: text })
  }

  function insertPageBreak(): void {
    patchDraft({ markdown: `${draft.markdown.trimEnd()}\n\n---\n\n` })
    setPreviewMode('page')
  }

  function mergePageBreaks(): void {
    patchDraft({ markdown: draft.markdown.replace(/\n\s*---\s*\n/, '\n\n') })
  }

  function resetLayout(): void {
    patchDraft({ layoutAdjustments: defaultLayoutAdjustments })
  }

  function resetCover(): void {
    patchDraft({ coverLayoutAdjustments: defaultCoverAdjustments })
  }

  function saveCurrentTemplate(): void {
    const name = window.prompt('模板名称', `${baseTemplate.name} 微调版`)
    if (!name?.trim()) return
    const custom: CustomTemplateConfig = {
      id: `custom-${Date.now()}`,
      name: name.trim(),
      baseTemplateId: draft.templateId,
      layoutAdjustments: draft.layoutAdjustments,
      coverLayoutAdjustments: draft.coverLayoutAdjustments,
      createdAt: new Date().toISOString()
    }
    setCustomTemplates((current) => [custom, ...current].slice(0, 24))
  }

  function applyCustomTemplate(custom: CustomTemplateConfig): void {
    patchDraft({
      templateId: custom.baseTemplateId,
      layoutAdjustments: { ...defaultLayoutAdjustments, ...custom.layoutAdjustments },
      coverLayoutAdjustments: { ...defaultCoverAdjustments, ...custom.coverLayoutAdjustments }
    })
  }

  async function copyText(text: string): Promise<void> {
    await navigator.clipboard.writeText(text)
  }

  async function runGenerate(): Promise<{ job: RenderJob; project: ProjectInfo } | null> {
    setError('')
    setGeneration({
      activeStep: 'import',
      completed: [],
      message: '正在保存项目',
      progress: 8,
      isGenerating: true
    })

    try {
      completeGenerationStep('import')
      setGenerationStep('template', '正在应用模板覆盖', 18)
      completeGenerationStep('template')
      const saved = await window.ipWriter.saveProject({
        markdown: draft.markdown,
        meta,
        coverImagePath: coverImagePath || undefined,
        tags: draft.tags,
        coverPrompt: draft.coverPrompt,
        layoutAdjustments: draft.layoutAdjustments,
        exportSettings: draft.exportSettings
      })
      const job: RenderJob = {
        markdown: draft.markdown,
        meta,
        templateId: draft.templateId,
        layoutAdjustments: draft.layoutAdjustments,
        coverImagePath: coverImagePath || undefined,
        projectDir: saved.projectDir,
        outputDir: saved.outputDir
      }

      setGenerationStep('cover', '正在生成封面', 34)
      await window.ipWriter.renderCover(job)
      completeGenerationStep('cover')

      setGenerationStep('pages', '正在生成正文图片', 62)
      await window.ipWriter.renderPages(job)
      completeGenerationStep('pages')

      setGenerationStep('long', '正在合成长图', 86)
      const longResult = await window.ipWriter.composeLongImage(job)
      completeGenerationStep('long')

      setProjectInfo(saved)
      setCurrentJob(job)
      addProjectRecord(saved)
      addRecent([longResult.longImagePath], 'long', 'png')
      setGeneration({
        activeStep: null,
        completed: ['import', 'template', 'cover', 'pages', 'long'],
        message: '生成完成',
        progress: 100,
        isGenerating: false
      })
      return { job, project: saved }
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : String(caught)
      setError(message)
      setGeneration((current) => ({ ...current, message: '生成失败', isGenerating: false }))
      return null
    }
  }

  async function exportSelected(): Promise<void> {
    const prepared = currentJob && projectInfo ? { job: currentJob, project: projectInfo } : await runGenerate()
    if (!prepared) return

    try {
      setError('')
      setGeneration((current) => ({
        ...current,
        activeStep: 'export',
        message: '正在导出文件',
        progress: 92,
        isGenerating: true
      }))
      const result = await window.ipWriter.exportAssets(prepared.job, draft.exportSettings)
      addRecent(result.exportedPaths, draft.exportSettings.assetType, draft.exportSettings.format)
      completeGenerationStep('export')
      setGeneration((current) => ({
        ...current,
        activeStep: null,
        message: '导出完成',
        progress: 100,
        isGenerating: false
      }))
      await window.ipWriter.openOutputFolder(result.outputDir)
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : String(caught)
      setError(message)
      setGeneration((current) => ({ ...current, message: '导出失败', isGenerating: false }))
    }
  }

  async function copyCoverPrompt(): Promise<void> {
    await copyText(draft.coverPrompt)
    setAutomation((current) => ({ ...current, promptCopied: true, handoffReady: true }))
  }

  async function openAutomationWebsite(): Promise<void> {
    await window.ipWriter.openExternalUrl(automation.websiteUrl)
    setAutomation((current) => ({ ...current, connected: true, handoffReady: true }))
  }

  function primaryLabel(): string {
    if (activePanel === 'export') return '导出文件'
    return generation.isGenerating ? '正在生成' : '生成图片'
  }

  async function runPrimaryAction(): Promise<void> {
    if (activePanel === 'export') {
      await exportSelected()
      return
    }
    await runGenerate()
  }

  const generatedOutputText = projectInfo ? projectInfo.outputDir : '还没有生成输出目录'

  return (
    <main className="app-shell">
      <header className="app-topbar">
        <div className="project-field">
          <span>项目标题</span>
          <input value={draft.metaDraft.title} onChange={(event) => patchMeta({ title: event.target.value })} />
        </div>
        <div className="platform-tabs">
          {platformList.map((item) => (
            <button
              key={item.id}
              className={draft.platform === item.id ? 'selected' : ''}
              onClick={() => patchDraft({ platform: item.id })}
            >
              {item.shortName}
            </button>
          ))}
        </div>
        <div className="save-state">
          <Check size={16} />
          <span>已自动保存 {savedAt}</span>
        </div>
        <button className="top-secondary" onClick={() => void runGenerate()} disabled={generation.isGenerating}>
          {generation.isGenerating ? <Loader2 className="spin" size={17} /> : <Sparkles size={17} />}
          一键生成
        </button>
        <button className="top-primary" onClick={runPrimaryAction} disabled={generation.isGenerating}>
          {activePanel === 'export' ? <Download size={17} /> : <ChevronRight size={17} />}
          {primaryLabel()}
        </button>
      </header>

      <section className="workspace enhanced-workspace">
        <nav className="tool-nav">
          {toolPanels.map((panel) => {
            const Icon = panel.icon
            return (
              <button
                key={panel.id}
                className={activePanel === panel.id ? 'active' : ''}
                onClick={() => setActivePanel(panel.id)}
              >
                <Icon size={19} />
                <span>{panel.title}</span>
                <em>{panel.hint}</em>
              </button>
            )
          })}
        </nav>

        <aside className="settings-panel">
          {activePanel === 'content' ? (
            <ContentPanel
              draft={draft}
              importedFilePath={importedFilePath}
              tagInput={tagInput}
              setTagInput={setTagInput}
              importMarkdown={importMarkdown}
              readDroppedMarkdown={readDroppedMarkdown}
              patchDraft={patchDraft}
              patchMeta={patchMeta}
              addTag={addTag}
              removeTag={removeTag}
              insertPageBreak={insertPageBreak}
              mergePageBreaks={mergePageBreaks}
              assistantOpen={assistantOpen}
              setAssistantOpen={setAssistantOpen}
              suggestions={suggestions}
              onRefresh={() => setAssistantSeed((value) => value + 1)}
              onApply={applySuggestion}
            />
          ) : null}

          {activePanel === 'design' ? (
            <DesignPanel
              draft={draft}
              platformPreset={platformPreset}
              customTemplates={customTemplates}
              patchDraft={patchDraft}
              saveCurrentTemplate={saveCurrentTemplate}
              applyCustomTemplate={applyCustomTemplate}
              removeCustomTemplate={(id) => setCustomTemplates((current) => current.filter((item) => item.id !== id))}
            />
          ) : null}

          {activePanel === 'cover' ? (
            <CoverPanel
              draft={draft}
              coverImagePath={coverImagePath}
              selectCoverImage={selectCoverImage}
              patchDraft={patchDraft}
              patchCover={patchCover}
              resetCover={resetCover}
              advancedOpen={advancedOpen}
              setAdvancedOpen={setAdvancedOpen}
              automation={automation}
              openAutomationWebsite={openAutomationWebsite}
              copyCoverPrompt={copyCoverPrompt}
            />
          ) : null}

          {activePanel === 'body' ? (
            <BodyPanel
              draft={draft}
              pageCount={previewPages.length}
              selectedPage={selectedPage}
              patchLayout={patchLayout}
              patchExportSettings={patchExportSettings}
              setSelectedPage={setSelectedPage}
              setPreviewMode={setPreviewMode}
              insertPageBreak={insertPageBreak}
              mergePageBreaks={mergePageBreaks}
              resetLayout={resetLayout}
            />
          ) : null}

          {activePanel === 'export' ? (
            <ExportPanel
              draft={draft}
              estimatedFiles={estimatedFiles}
              qualityWarnings={qualityWarnings}
              selectedPage={selectedPage}
              patchExportSettings={patchExportSettings}
              exportSelected={exportSelected}
              generation={generation}
              recentExports={recentExports}
              clearRecent={() => setRecentExports([])}
              removeRecent={(id) => setRecentExports((current) => current.filter((item) => item.id !== id))}
            />
          ) : null}

          {activePanel === 'project' ? (
            <ProjectPanel
              projectInfo={projectInfo}
              projectHistory={projectHistory}
              publishText={publishText}
              openProject={openProject}
              runGenerate={runGenerate}
              copyText={copyText}
              clearHistory={() => setProjectHistory([])}
            />
          ) : null}
        </aside>

        <section className="visual-panel">
          {updateInfo?.available ? (
            <div className="update-banner">
              <span>
                发现新版本 {updateInfo.latestVersion}，当前版本 {updateInfo.currentVersion}
              </span>
              {updateInfo.releaseUrl ? <button onClick={() => window.ipWriter.openExternalUrl(updateInfo.releaseUrl!)}>查看更新</button> : null}
              <button onClick={() => setUpdateInfo(null)}>稍后</button>
            </div>
          ) : null}
          <div className="visual-header">
            <div>
              <h2>{previewMode === 'cover' ? '封面预览' : previewMode === 'long' ? '长图预览' : `正文第 ${selectedPreviewPage.index} 页`}</h2>
              <p>{template.name} · {platformPreset.name} · 共 {previewPages.length} 页</p>
            </div>
            <div className="visual-actions">
              <button className={previewMode === 'cover' ? 'selected' : ''} onClick={() => setPreviewMode('cover')}>封面</button>
              <button className={previewMode === 'page' ? 'selected' : ''} onClick={() => setPreviewMode('page')}>正文</button>
              <button className={previewMode === 'long' ? 'selected' : ''} onClick={() => setPreviewMode('long')}>长图</button>
            </div>
          </div>
          <div className="preview-toolbar">
            <button onClick={() => setZoom((value) => Math.max(0.24, value - 0.04))}><ZoomOut size={16} /></button>
            <span>{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom((value) => Math.min(0.74, value + 0.04))}><ZoomIn size={16} /></button>
            <button
              onClick={() => {
                setPreviewMode('page')
                setSelectedPage((value) => Math.max(1, value - 1))
              }}
            >
              <ChevronLeft size={16} />
            </button>
            <input
              value={selectedPage}
              onChange={(event) => {
                setPreviewMode('page')
                setSelectedPage(Math.min(previewPages.length, Math.max(1, Number(event.target.value) || 1)))
              }}
            />
            <button
              onClick={() => {
                setPreviewMode('page')
                setSelectedPage((value) => Math.min(previewPages.length, value + 1))
              }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
          {previewMode === 'page' ? (
            <div className="page-strip">
              {previewPages.map((page) => (
                <button
                  key={page.index}
                  className={selectedPage === page.index ? 'selected' : ''}
                  onClick={() => {
                    setSelectedPage(page.index)
                    setPreviewMode('page')
                  }}
                >
                  <strong>{page.index}</strong>
                  <span>{page.blocks.length} 块</span>
                </button>
              ))}
            </div>
          ) : null}
          <div className={`preview-canvas ${previewMode}`}>
            {previewMode === 'cover' ? (
              <iframe
                className="cover-preview-frame"
                style={{
                  width: platformPreset.coverSize.width,
                  height: platformPreset.coverSize.height,
                  transform: `scale(${platformPreset.coverSize.height < 600 ? Math.min(0.92, zoom * 1.55) : zoom})`
                }}
                srcDoc={coverHtml}
                title="cover-preview"
              />
            ) : previewMode === 'long' ? (
              <div className="long-preview" style={{ transform: `scale(${zoom * 0.86})` }}>
                {previewPages.map((page) => (
                  <iframe
                    key={page.index}
                    srcDoc={renderArticlePageHtml(meta, page, template, {
                      variant: 'long',
                      pageCount: previewPages.length
                    })}
                    title={`long-${page.index}`}
                  />
                ))}
              </div>
            ) : (
              <iframe
                style={{ width: 1080, height: 1440, transform: `scale(${zoom})` }}
                srcDoc={selectedHtml}
                title={`page-${selectedPreviewPage.index}`}
              />
            )}
          </div>
        </section>
      </section>

      <footer className="status-dock">
        <div className="progress-area">
          <span>{generation.message}</span>
          <div><i style={{ width: `${generation.progress}%` }} /></div>
          <strong>{generation.progress}%</strong>
        </div>
        <div className="output-area">
          <History size={16} />
          <span>{generatedOutputText}</span>
          {projectInfo ? <button onClick={() => window.ipWriter.openOutputFolder(projectInfo.outputDir)}>打开输出目录</button> : null}
        </div>
        {error ? <div className="error-message">{error}</div> : qualityWarnings.length ? <div className="warning-message">{qualityWarnings[0]}</div> : null}
      </footer>
    </main>
  )
}

function ContentPanel({
  draft,
  importedFilePath,
  tagInput,
  setTagInput,
  importMarkdown,
  readDroppedMarkdown,
  patchDraft,
  patchMeta,
  addTag,
  removeTag,
  insertPageBreak,
  mergePageBreaks,
  assistantOpen,
  setAssistantOpen,
  suggestions,
  onRefresh,
  onApply
}: {
  draft: DraftState
  importedFilePath: string
  tagInput: string
  setTagInput: (value: string) => void
  importMarkdown: () => Promise<void>
  readDroppedMarkdown: (file: File) => Promise<void>
  patchDraft: (partial: Partial<DraftState>) => void
  patchMeta: (partial: Partial<MetaDraft>) => void
  addTag: (value?: string) => void
  removeTag: (tag: string) => void
  insertPageBreak: () => void
  mergePageBreaks: () => void
  assistantOpen: boolean
  setAssistantOpen: (updater: (value: boolean) => boolean) => void
  suggestions: ReturnType<typeof createAssistantSuggestions>
  onRefresh: () => void
  onApply: (text: string, target: 'title' | 'subtitle' | 'tag' | 'coverPrompt') => void
}): JSX.Element {
  return (
    <section className="step-panel">
      <PanelHeading icon={FileText} title="内容工作台" text="导入、编辑正文，并用分页工具控制节奏。" />
      <div
        className="drop-card"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault()
          const file = event.dataTransfer.files[0]
          if (file) void readDroppedMarkdown(file)
        }}
      >
        <UploadCloud size={34} />
        <strong>{importedFilePath ? fileName(importedFilePath) : '拖入或选择 Markdown 文件'}</strong>
        <span>也可以直接在下方编辑内容</span>
        <button onClick={importMarkdown}>选择文件</button>
      </div>
      <div className="form-grid">
        <label className="field full">
          <span>标题</span>
          <input value={draft.metaDraft.title} onChange={(event) => patchMeta({ title: event.target.value })} />
        </label>
        <label className="field full">
          <span>副标题</span>
          <input value={draft.metaDraft.subtitle} onChange={(event) => patchMeta({ subtitle: event.target.value })} />
        </label>
        <label className="field">
          <span>作者</span>
          <input value={draft.metaDraft.author} onChange={(event) => patchMeta({ author: event.target.value })} />
        </label>
        <button className="plain-button" onClick={() => patchDraft({ metaDraft: createMetaDraft(draft.markdown, draft.templateId) })}>
          重新读取
        </button>
      </div>
      <div className="tag-editor">
        <span>标签</span>
        <div>
          {draft.tags.map((tag) => (
            <button key={tag} onClick={() => removeTag(tag)}>
              {tag}
              <X size={12} />
            </button>
          ))}
          <input
            value={tagInput}
            placeholder="添加标签"
            onChange={(event) => setTagInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') addTag()
            }}
          />
        </div>
      </div>
      <div className="editor-actions">
        <button onClick={insertPageBreak}>插入分页</button>
        <button onClick={insertPageBreak}>本段移到下一页</button>
        <button onClick={mergePageBreaks}>合并分页</button>
      </div>
      <textarea
        className="markdown-editor"
        value={draft.markdown}
        onChange={(event) => patchDraft({ markdown: event.target.value })}
        spellCheck={false}
      />
      <AssistantBox
        open={assistantOpen}
        onToggle={() => setAssistantOpen((value) => !value)}
        suggestions={suggestions}
        onRefresh={onRefresh}
        onApply={onApply}
      />
    </section>
  )
}

function DesignPanel({
  draft,
  platformPreset,
  customTemplates,
  patchDraft,
  saveCurrentTemplate,
  applyCustomTemplate,
  removeCustomTemplate
}: {
  draft: DraftState
  platformPreset: ReturnType<typeof getPlatformPreset>
  customTemplates: CustomTemplateConfig[]
  patchDraft: (partial: Partial<DraftState>) => void
  saveCurrentTemplate: () => void
  applyCustomTemplate: (custom: CustomTemplateConfig) => void
  removeCustomTemplate: (id: string) => void
}): JSX.Element {
  return (
    <section className="step-panel">
      <PanelHeading icon={LayoutTemplate} title="设计系统" text="选择平台和模板，微调后可保存为我的模板。" />
      <div className="platform-summary">
        <MonitorCog size={18} />
        <div>
          <strong>{platformPreset.name}</strong>
          <span>封面 {platformPreset.coverSize.width}x{platformPreset.coverSize.height}，正文 1080x1440</span>
        </div>
      </div>
      <div className="template-row">
        {templateList.map((item) => (
          <button
            key={item.id}
            className={draft.templateId === item.id ? 'selected' : ''}
            onClick={() => patchDraft({ templateId: item.id })}
          >
            <CoverTemplateThumb template={item} />
            <strong>{item.name}</strong>
            <span>{item.description}</span>
          </button>
        ))}
      </div>
      <div className="section-card">
        <div className="card-title">
          <strong>我的模板</strong>
          <button onClick={saveCurrentTemplate}><Save size={15} />保存当前</button>
        </div>
        {customTemplates.length ? (
          customTemplates.map((item) => (
            <article className="custom-template" key={item.id}>
              <button onClick={() => applyCustomTemplate(item)}>
                <strong>{item.name}</strong>
                <span>{getTemplate(item.baseTemplateId).name}</span>
              </button>
              <button onClick={() => removeCustomTemplate(item.id)}><Trash2 size={15} /></button>
            </article>
          ))
        ) : (
          <p className="muted-text">暂无自定义模板</p>
        )}
      </div>
      <RangeField
        label="主标题比例"
        value={Math.round(draft.titleScale * 100)}
        min={80}
        max={130}
        step={5}
        suffix="%"
        onChange={(value) => patchDraft({ titleScale: value / 100 })}
      />
    </section>
  )
}

function CoverPanel({
  draft,
  coverImagePath,
  selectCoverImage,
  patchDraft,
  patchCover,
  resetCover,
  advancedOpen,
  setAdvancedOpen,
  automation,
  openAutomationWebsite,
  copyCoverPrompt
}: {
  draft: DraftState
  coverImagePath: string
  selectCoverImage: () => Promise<void>
  patchDraft: (partial: Partial<DraftState>) => void
  patchCover: (partial: Partial<CoverLayoutAdjustments>) => void
  resetCover: () => void
  advancedOpen: boolean
  setAdvancedOpen: (updater: (value: boolean) => boolean) => void
  automation: BrowserAutomationState
  openAutomationWebsite: () => Promise<void>
  copyCoverPrompt: () => Promise<void>
}): JSX.Element {
  const cover = draft.coverLayoutAdjustments
  return (
    <section className="step-panel">
      <PanelHeading icon={Image} title="封面精修" text="调节文字位置、底图焦点和发布提示词。" />
      <div className="cover-tools">
        <button onClick={selectCoverImage}>
          <Image size={17} />
          {coverImagePath ? '更换封面底图' : '上传封面底图'}
        </button>
        <span>{coverImagePath ? fileName(coverImagePath) : '不上传时使用模板封面'}</span>
      </div>
      <div className="choice-group">
        <span>对齐方式</span>
        <div>
          {(['left', 'center', 'right'] as const).map((align) => (
            <button key={align} className={cover.align === align ? 'selected' : ''} onClick={() => patchCover({ align })}>
              {alignmentName(align)}
            </button>
          ))}
        </div>
      </div>
      <div className="switch-row">
        <button className={cover.shadow ? 'selected' : ''} onClick={() => patchCover({ shadow: !cover.shadow })}>文字阴影</button>
        <button className={cover.stroke ? 'selected' : ''} onClick={() => patchCover({ stroke: !cover.stroke })}>白色描边</button>
        <button onClick={resetCover}>重置封面</button>
      </div>
      <RangeField label="标题 X" value={cover.titleOffsetX ?? 0} min={-220} max={220} step={5} onChange={(value) => patchCover({ titleOffsetX: value })} />
      <RangeField label="标题 Y" value={cover.titleOffsetY ?? 0} min={-260} max={260} step={5} onChange={(value) => patchCover({ titleOffsetY: value })} />
      <RangeField label="标题字号" value={Math.round((cover.titleScale ?? 1) * 100)} min={70} max={150} step={5} suffix="%" onChange={(value) => patchCover({ titleScale: value / 100 })} />
      <RangeField label="副标题 X" value={cover.subtitleOffsetX ?? 0} min={-220} max={220} step={5} onChange={(value) => patchCover({ subtitleOffsetX: value })} />
      <RangeField label="副标题 Y" value={cover.subtitleOffsetY ?? 0} min={-220} max={220} step={5} onChange={(value) => patchCover({ subtitleOffsetY: value })} />
      <RangeField label="副标题字号" value={Math.round((cover.subtitleScale ?? 1) * 100)} min={70} max={150} step={5} suffix="%" onChange={(value) => patchCover({ subtitleScale: value / 100 })} />
      <RangeField label="作者 Y" value={cover.authorOffsetY ?? 0} min={-180} max={180} step={5} onChange={(value) => patchCover({ authorOffsetY: value })} />
      <RangeField label="标题宽度" value={Math.round((cover.maxWidthScale ?? 1) * 100)} min={70} max={145} step={5} suffix="%" onChange={(value) => patchCover({ maxWidthScale: value / 100 })} />
      <RangeField label="底图缩放" value={Math.round((cover.imageScale ?? 1) * 100)} min={100} max={160} step={5} suffix="%" onChange={(value) => patchCover({ imageScale: value / 100 })} />
      <RangeField label="底图焦点 X" value={cover.imageFocusX ?? 0} min={-50} max={50} step={5} onChange={(value) => patchCover({ imageFocusX: value })} />
      <RangeField label="底图焦点 Y" value={cover.imageFocusY ?? 0} min={-50} max={50} step={5} onChange={(value) => patchCover({ imageFocusY: value })} />
      <RangeField label="遮罩强度" value={Math.round((cover.overlayOpacity ?? 1) * 100)} min={20} max={120} step={5} suffix="%" onChange={(value) => patchCover({ overlayOpacity: value / 100 })} />
      <label className="field full">
        <span>封面提示词</span>
        <textarea className="prompt-textarea" value={draft.coverPrompt} onChange={(event) => patchDraft({ coverPrompt: event.target.value })} />
      </label>
      <div className="advanced-card">
        <button onClick={() => setAdvancedOpen((value) => !value)}>
          <ExternalLink size={16} />
          封面生成高级设置
          <ChevronRight className={advancedOpen ? 'rotated' : ''} size={16} />
        </button>
        {advancedOpen ? (
          <div>
            <p>{automation.websiteName}</p>
            <button onClick={openAutomationWebsite}>打开平台网站</button>
            <button onClick={copyCoverPrompt}>{automation.promptCopied ? '已复制提示词' : '复制提示词'}</button>
          </div>
        ) : null}
      </div>
    </section>
  )
}

function BodyPanel({
  draft,
  pageCount,
  selectedPage,
  patchLayout,
  patchExportSettings,
  setSelectedPage,
  setPreviewMode,
  insertPageBreak,
  mergePageBreaks,
  resetLayout
}: {
  draft: DraftState
  pageCount: number
  selectedPage: number
  patchLayout: (partial: Partial<LayoutAdjustments>) => void
  patchExportSettings: (partial: Partial<ExportSettings>) => void
  setSelectedPage: (value: number) => void
  setPreviewMode: (value: PreviewMode) => void
  insertPageBreak: () => void
  mergePageBreaks: () => void
  resetLayout: () => void
}): JSX.Element {
  const layout = draft.layoutAdjustments
  return (
    <section className="step-panel">
      <PanelHeading icon={Wand2} title="正文精排" text="调节文字密度、版心和分页，右侧实时预览。" />
      <div className="page-jump">
        <button onClick={() => setSelectedPage(Math.max(1, selectedPage - 1))}><ChevronLeft size={16} /></button>
        <span>第 {selectedPage} / {pageCount} 页</span>
        <button onClick={() => setSelectedPage(Math.min(pageCount, selectedPage + 1))}><ChevronRight size={16} /></button>
      </div>
      <div className="editor-actions">
        <button onClick={insertPageBreak}>插入分页</button>
        <button onClick={mergePageBreaks}>合并分页</button>
        <button onClick={resetLayout}>重置排版</button>
      </div>
      <RangeField label="正文字号" value={layout.bodyFontSizeDelta ?? 0} min={-8} max={14} step={1} onChange={(value) => patchLayout({ bodyFontSizeDelta: value })} />
      <RangeField label="行高" value={Math.round((layout.bodyLineHeightDelta ?? 0) * 100)} min={-30} max={40} step={5} suffix="%" onChange={(value) => patchLayout({ bodyLineHeightDelta: value / 100 })} />
      <RangeField label="段落间距" value={layout.paragraphSpacingDelta ?? 0} min={-18} max={36} step={2} onChange={(value) => patchLayout({ paragraphSpacingDelta: value })} />
      <RangeField label="左右边距" value={layout.paddingXDelta ?? 0} min={-50} max={80} step={5} onChange={(value) => patchLayout({ paddingXDelta: value })} />
      <RangeField label="顶部边距" value={layout.paddingTopDelta ?? 0} min={-50} max={90} step={5} onChange={(value) => patchLayout({ paddingTopDelta: value })} />
      <RangeField label="底部安全距" value={layout.paddingBottomDelta ?? 0} min={-40} max={100} step={5} onChange={(value) => patchLayout({ paddingBottomDelta: value })} />
      <RangeField label="正文起始偏移" value={layout.contentTopOffsetDelta ?? 0} min={-40} max={80} step={5} onChange={(value) => patchLayout({ contentTopOffsetDelta: value })} />
      <RangeField label="H1 字号" value={layout.h1FontSizeDelta ?? 0} min={-24} max={28} step={2} onChange={(value) => patchLayout({ h1FontSizeDelta: value })} />
      <RangeField label="H2 字号" value={layout.h2FontSizeDelta ?? 0} min={-16} max={22} step={2} onChange={(value) => patchLayout({ h2FontSizeDelta: value })} />
      <RangeField label="H3 字号" value={layout.h3FontSizeDelta ?? 0} min={-14} max={18} step={2} onChange={(value) => patchLayout({ h3FontSizeDelta: value })} />
      <RangeField label="引用内边距" value={layout.quotePaddingDelta ?? 0} min={-12} max={32} step={2} onChange={(value) => patchLayout({ quotePaddingDelta: value })} />
      <RangeField label="列表紧凑度" value={layout.listSpacingDelta ?? 0} min={-12} max={28} step={2} onChange={(value) => patchLayout({ listSpacingDelta: value })} />
      <div className="choice-group">
        <span>页码位置</span>
        <div>
          {(['bottom-right', 'bottom-center', 'hidden'] as const).map((position) => (
            <button key={position} className={layout.pageMarkPosition === position ? 'selected' : ''} onClick={() => patchLayout({ pageMarkPosition: position })}>
              {pageMarkName(position)}
            </button>
          ))}
        </div>
      </div>
      <button
        className="wide-secondary"
        onClick={() => {
          patchExportSettings({ pageRange: String(selectedPage) })
          setPreviewMode('page')
        }}
      >
        仅导出当前页
      </button>
    </section>
  )
}

function ExportPanel({
  draft,
  estimatedFiles,
  qualityWarnings,
  selectedPage,
  patchExportSettings,
  exportSelected,
  generation,
  recentExports,
  clearRecent,
  removeRecent
}: {
  draft: DraftState
  estimatedFiles: string[]
  qualityWarnings: string[]
  selectedPage: number
  patchExportSettings: (partial: Partial<ExportSettings>) => void
  exportSelected: () => Promise<void>
  generation: GenerationState
  recentExports: RecentExport[]
  clearRecent: () => void
  removeRecent: (id: string) => void
}): JSX.Element {
  return (
    <section className="step-panel compact">
      <PanelHeading icon={Download} title="发布资产包" text="选择格式、页范围和打包内容，导出后自动打开目录。" />
      <div className="choice-group">
        <span>格式</span>
        <div>
          {(['zip', 'png', 'jpg', 'webp', 'pdf'] as ExportFormat[]).map((format) => (
            <button key={format} className={draft.exportSettings.format === format ? 'selected' : ''} onClick={() => patchExportSettings({ format })}>
              {exportFormatName(format)}
            </button>
          ))}
        </div>
      </div>
      <div className="choice-group">
        <span>内容</span>
        <div>
          {(['all', 'cover', 'pages', 'long'] as ExportAssetType[]).map((assetType) => (
            <button key={assetType} className={draft.exportSettings.assetType === assetType ? 'selected' : ''} onClick={() => patchExportSettings({ assetType })}>
              {exportKindName(assetType)}
            </button>
          ))}
        </div>
      </div>
      <div className="form-grid">
        <label className="field full">
          <span>页范围</span>
          <input
            placeholder="例如 1-3,5；留空导出全部正文页"
            value={draft.exportSettings.pageRange ?? ''}
            onChange={(event) => patchExportSettings({ pageRange: event.target.value })}
          />
        </label>
        <button className="plain-button" onClick={() => patchExportSettings({ pageRange: String(selectedPage) })}>当前页</button>
      </div>
      {draft.exportSettings.format === 'jpg' || draft.exportSettings.format === 'webp' ? (
        <RangeField label="图片质量" value={draft.exportSettings.quality ?? 96} min={60} max={100} step={1} onChange={(value) => patchExportSettings({ quality: value })} />
      ) : null}
      {draft.exportSettings.format === 'zip' ? (
        <div className="switch-row">
          <button className={draft.exportSettings.includeSource ? 'selected' : ''} onClick={() => patchExportSettings({ includeSource: !draft.exportSettings.includeSource })}>包含源文件</button>
          <button className={draft.exportSettings.packageMode === 'publish' ? 'selected' : ''} onClick={() => patchExportSettings({ packageMode: 'publish' })}>发布包</button>
          <button className={draft.exportSettings.packageMode === 'assets' ? 'selected' : ''} onClick={() => patchExportSettings({ packageMode: 'assets' })}>素材包</button>
        </div>
      ) : null}
      <div className="export-list">
        <strong>将导出</strong>
        {estimatedFiles.map((name) => (
          <span key={name}>{name}</span>
        ))}
      </div>
      <div className="qa-list">
        <strong>导出质检</strong>
        {qualityWarnings.length ? qualityWarnings.map((warning) => <span key={warning}>{warning}</span>) : <span>未发现明显问题</span>}
      </div>
      <button className="wide-primary" onClick={exportSelected} disabled={generation.isGenerating}>
        <Download size={18} />
        导出文件
      </button>
      <div className="recent-exports">
        <div>
          <strong>最近导出</strong>
          {recentExports.length ? <button onClick={clearRecent}>清空</button> : null}
        </div>
        {recentExports.length ? (
          recentExports.slice(0, 6).map((record) => (
            <article key={record.id}>
              <span>{record.title}</span>
              <button onClick={() => window.ipWriter.revealPath(record.path)}><FolderOpen size={15} /></button>
              <button onClick={() => removeRecent(record.id)}><Trash2 size={15} /></button>
            </article>
          ))
        ) : (
          <p>暂无导出记录</p>
        )}
      </div>
    </section>
  )
}

function ProjectPanel({
  projectInfo,
  projectHistory,
  publishText,
  openProject,
  runGenerate,
  copyText,
  clearHistory
}: {
  projectInfo: ProjectInfo | null
  projectHistory: ProjectRecord[]
  publishText: string
  openProject: () => Promise<void>
  runGenerate: () => Promise<{ job: RenderJob; project: ProjectInfo } | null>
  copyText: (text: string) => Promise<void>
  clearHistory: () => void
}): JSX.Element {
  return (
    <section className="step-panel">
      <PanelHeading icon={Package} title="项目与发布" text="打开旧项目、复制项目，并准备平台发布文案。" />
      <div className="project-actions">
        <button onClick={openProject}><FolderOpen size={16} />打开项目</button>
        <button onClick={() => void runGenerate()}><Save size={16} />复制为新项目</button>
        {projectInfo ? <button onClick={() => window.ipWriter.openOutputFolder(projectInfo.outputDir)}><ExternalLink size={16} />输出目录</button> : null}
      </div>
      <div className="section-card">
        <div className="card-title">
          <strong>最近项目</strong>
          {projectHistory.length ? <button onClick={clearHistory}>清空</button> : null}
        </div>
        {projectHistory.length ? (
          projectHistory.map((project) => (
            <article className="project-record" key={project.id}>
              <div>
                <strong>{project.title}</strong>
                <span>{project.projectDir}</span>
              </div>
              <button onClick={() => window.ipWriter.revealPath(project.configPath)}><FolderOpen size={15} /></button>
            </article>
          ))
        ) : (
          <p className="muted-text">暂无项目记录</p>
        )}
      </div>
      <div className="section-card">
        <div className="card-title">
          <strong>发布辅助</strong>
          <button onClick={() => void copyText(publishText)}><Clipboard size={15} />复制全部</button>
        </div>
        <textarea className="publish-text" value={publishText} readOnly />
      </div>
    </section>
  )
}

function PanelHeading({ icon: Icon, title, text }: { icon: typeof FileText; title: string; text: string }): JSX.Element {
  return (
    <div className="step-heading">
      <Icon size={20} />
      <div>
        <h2>{title}</h2>
        <p>{text}</p>
      </div>
    </div>
  )
}

function RangeField({
  label,
  value,
  min,
  max,
  step,
  suffix = 'px',
  onChange
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  suffix?: string
  onChange: (value: number) => void
}): JSX.Element {
  return (
    <label className="range-field">
      <span>{label}</span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} />
      <strong>{value}{suffix}</strong>
    </label>
  )
}

function CoverTemplateThumb({ template }: { template: TemplateConfig }): JSX.Element {
  const thumbMeta: ArticleMeta = {
    title: '标题示例',
    subtitle: '副标题示例',
    author: 'IP-image',
    platform: 'xiaohongshu',
    template: template.id,
    createdAt: '2026-05-01T00:00:00.000Z'
  }
  const svg = renderCoverSvg(thumbMeta, template, 270, 360)

  return (
    <div className="template-thumb real-cover-thumb">
      <img src={svgDataUrl(svg)} alt={`${template.name} 封面缩略图`} />
    </div>
  )
}

function AssistantBox({
  open,
  suggestions,
  onToggle,
  onRefresh,
  onApply
}: {
  open: boolean
  suggestions: ReturnType<typeof createAssistantSuggestions>
  onToggle: () => void
  onRefresh: () => void
  onApply: (text: string, target: 'title' | 'subtitle' | 'tag' | 'coverPrompt') => void
}): JSX.Element {
  return (
    <div className="assistant-box">
      <button onClick={onToggle}>
        <Bot size={16} />
        AI 助手
        <ChevronRight className={open ? 'rotated' : ''} size={16} />
      </button>
      {open ? (
        <div>
          <button className="refresh-ai" onClick={onRefresh}>
            <RefreshCw size={15} />
            换一换建议
          </button>
          {suggestions.map((suggestion) => (
            <button key={suggestion.id} onClick={() => onApply(suggestion.text, suggestion.target)}>
              <Check size={14} />
              <span>{suggestion.text}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export default App
