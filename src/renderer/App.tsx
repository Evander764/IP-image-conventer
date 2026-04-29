import { useEffect, useMemo, useState } from 'react'
import {
  Bot,
  Check,
  ChevronRight,
  Download,
  ExternalLink,
  FileText,
  FolderOpen,
  History,
  Image,
  Loader2,
  MonitorCog,
  RefreshCw,
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
import { renderArticlePageHtml } from '../shared/html'
import { parseMarkdown } from '../shared/markdown'
import { paginateBlocks } from '../shared/pagination'
import { getPlatformPreset, platformList } from '../shared/platforms'
import { defaultTemplateId, getTemplate, templateList, withTitleScale } from '../shared/templates'
import type {
  ArticleBlock,
  ArticleMeta,
  BrowserAutomationState,
  ExportAssetType,
  ExportFormat,
  ExportSettings,
  GenerationStep,
  ProjectInfo,
  RecentExport,
  RenderJob,
  TemplateConfig,
  TemplateId,
  UpdateCheckResult
} from '../shared/types'

const DRAFT_KEY = 'ip-image-converter:draft:v4'
const RECENT_KEY = 'ip-image-converter:recent:v4'

type WorkflowStep = 'content' | 'design' | 'preview' | 'export'
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
  exportSettings: ExportSettings
}

interface GenerationState {
  activeStep: GenerationStep | null
  completed: GenerationStep[]
  message: string
  progress: number
  isGenerating: boolean
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

const defaultExportSettings: ExportSettings = {
  format: 'png',
  assetType: 'all',
  platform: 'xiaohongshu',
  pageSize: '1080 x 1440 (3:4)'
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
  exportSettings: defaultExportSettings
}

const workflowSteps: Array<{ id: WorkflowStep; index: number; title: string; hint: string }> = [
  { id: 'content', index: 1, title: '内容', hint: '导入文章' },
  { id: 'design', index: 2, title: '设计', hint: '平台与模板' },
  { id: 'preview', index: 3, title: '预览', hint: '检查页面' },
  { id: 'export', index: 4, title: '导出', hint: '生成素材' }
]

function readDraft(): DraftState {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return defaultDraft
    const parsed = JSON.parse(raw) as Partial<DraftState>
    return {
      ...defaultDraft,
      ...parsed,
      templateId: getTemplate(parsed.templateId).id,
      metaDraft: { ...defaultDraft.metaDraft, ...parsed.metaDraft },
      exportSettings: { ...defaultExportSettings, ...parsed.exportSettings }
    }
  } catch {
    return defaultDraft
  }
}

function readRecentExports(): RecentExport[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]') as RecentExport[]
  } catch {
    return []
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

function coverExportNameForPlatform(platform: ArticleMeta['platform'], format: ExportFormat): string {
  const stem = platform === 'wechat' ? 'cover_wechat' : 'cover_vertical'
  return `${stem}.${format}`
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
  return '全部'
}

function exportFormatName(format: ExportFormat): string {
  if (format === 'jpg') return 'JPG'
  if (format === 'webp') return 'WebP'
  return 'PNG'
}

function coverBackground(template: TemplateConfig, coverImagePath: string): string {
  if (coverImagePath) {
    return `${template.cover.overlay}, url("${localFileUrl(coverImagePath)}")`
  }
  return `
    ${template.cover.overlay},
    radial-gradient(circle at 20% 18%, ${template.colors.accent}55, transparent 34%),
    radial-gradient(circle at 82% 78%, ${template.colors.accent2}55, transparent 38%),
    linear-gradient(135deg, ${template.colors.paper}, ${template.colors.background})
  `
}

function App(): JSX.Element {
  const [draft, setDraft] = useState<DraftState>(() => readDraft())
  const [currentStep, setCurrentStep] = useState<WorkflowStep>('content')
  const [previewMode, setPreviewMode] = useState<PreviewMode>('page')
  const [selectedPage, setSelectedPage] = useState(1)
  const [zoom, setZoom] = useState(0.44)
  const [markdownExpanded, setMarkdownExpanded] = useState(false)
  const [assistantOpen, setAssistantOpen] = useState(false)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [assistantSeed, setAssistantSeed] = useState(0)
  const [importedFilePath, setImportedFilePath] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [coverImagePath, setCoverImagePath] = useState('')
  const [projectInfo, setProjectInfo] = useState<ProjectInfo | null>(null)
  const [currentJob, setCurrentJob] = useState<RenderJob | null>(null)
  const [recentExports, setRecentExports] = useState<RecentExport[]>(() => readRecentExports())
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
  const template = useMemo(() => withTitleScale(baseTemplate, draft.titleScale), [baseTemplate, draft.titleScale])
  const parsed = useMemo(() => parseMarkdown(draft.markdown, draft.templateId), [draft.markdown, draft.templateId])
  const meta: ArticleMeta = useMemo(
    () => ({
      title: draft.metaDraft.title.trim() || parsed.meta.title || '未命名文章',
      subtitle: draft.metaDraft.subtitle.trim() || parsed.meta.subtitle,
      author: draft.metaDraft.author.trim() || parsed.meta.author,
      platform: draft.platform,
      template: draft.templateId,
      createdAt: new Date().toISOString(),
      titleScale: draft.titleScale
    }),
    [draft.metaDraft, draft.platform, draft.templateId, draft.titleScale, parsed.meta.author, parsed.meta.subtitle, parsed.meta.title]
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
  const estimatedFiles = useMemo(() => {
    const files: string[] = []
    if (draft.exportSettings.assetType === 'cover' || draft.exportSettings.assetType === 'all') {
      files.push(coverExportNameForPlatform(draft.platform, draft.exportSettings.format))
    }
    if (draft.exportSettings.assetType === 'pages' || draft.exportSettings.assetType === 'all') {
      previewPages.forEach((page) => files.push(`page-${page.index.toString().padStart(3, '0')}.${draft.exportSettings.format}`))
    }
    if (draft.exportSettings.assetType === 'long' || draft.exportSettings.assetType === 'all') files.push(`long.${draft.exportSettings.format}`)
    return files
  }, [draft.exportSettings.assetType, draft.exportSettings.format, draft.platform, previewPages])

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
    localStorage.setItem(RECENT_KEY, JSON.stringify(recentExports.slice(0, 10)))
  }, [recentExports])

  useEffect(() => {
    void window.ipWriter.checkForUpdate().then((result) => {
      if (result.available) setUpdateInfo(result)
    })
  }, [])

  function patchDraft(partial: Partial<DraftState>): void {
    setDraft((current) => ({ ...current, ...partial }))
  }

  function patchMeta(partial: Partial<MetaDraft>): void {
    setDraft((current) => ({ ...current, metaDraft: { ...current.metaDraft, ...partial } }))
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
      size: kind === 'cover' ? `${platformPreset.coverSize.width}x${platformPreset.coverSize.height}` : '1080x1440',
      path,
      createdAt: new Date().toISOString()
    }))
    setRecentExports((current) => [...records, ...current].slice(0, 10))
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
    const metaDraft = createMetaDraft(imported.content, draft.templateId)
    patchDraft({ markdown: imported.content, metaDraft })
    setImportedFilePath(imported.filePath)
    setMarkdownExpanded(false)
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
    patchDraft({ tags: [...draft.tags, tag].slice(0, 8) })
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
      setGenerationStep('template', '正在应用模板', 18)
      completeGenerationStep('template')
      const saved = await window.ipWriter.saveProject({
        markdown: draft.markdown,
        meta,
        coverImagePath: coverImagePath || undefined,
        tags: draft.tags,
        coverPrompt: draft.coverPrompt,
        exportSettings: draft.exportSettings
      })
      const job: RenderJob = {
        markdown: draft.markdown,
        meta,
        templateId: draft.templateId,
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
    await navigator.clipboard.writeText(draft.coverPrompt)
    setAutomation((current) => ({ ...current, promptCopied: true, handoffReady: true }))
  }

  async function openAutomationWebsite(): Promise<void> {
    await window.ipWriter.openExternalUrl(automation.websiteUrl)
    setAutomation((current) => ({ ...current, connected: true, handoffReady: true }))
  }

  function goNext(): void {
    const order: WorkflowStep[] = ['content', 'design', 'preview', 'export']
    const current = order.indexOf(currentStep)
    setCurrentStep(order[Math.min(order.length - 1, current + 1)])
  }

  async function runPrimaryAction(): Promise<void> {
    if (currentStep === 'content' || currentStep === 'design') {
      goNext()
      return
    }
    if (currentStep === 'preview') {
      await runGenerate()
      setCurrentStep('export')
      return
    }
    await exportSelected()
  }

  function primaryLabel(): string {
    if (currentStep === 'content') return '下一步：调样式'
    if (currentStep === 'design') return '下一步：看预览'
    if (currentStep === 'preview') return '生成图片'
    return '导出文件'
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
          {currentStep === 'export' ? <Download size={17} /> : <ChevronRight size={17} />}
          {primaryLabel()}
        </button>
      </header>

      <section className="workspace">
        <nav className="step-nav">
          {workflowSteps.map((step) => (
            <button
              key={step.id}
              className={currentStep === step.id ? 'active' : ''}
              onClick={() => setCurrentStep(step.id)}
            >
              <strong>{step.index}</strong>
              <span>{step.title}</span>
              <em>{step.hint}</em>
            </button>
          ))}
        </nav>

        <aside className="settings-panel">
          {currentStep === 'content' ? (
            <section className="step-panel">
              <div className="step-heading">
                <FileText size={20} />
                <div>
                  <h2>写内容</h2>
                  <p>导入 Markdown 后，标题和作者会自动读取。</p>
                </div>
              </div>
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
                <span>也可以直接粘贴文章内容</span>
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
              <div className="markdown-card">
                <button onClick={() => setMarkdownExpanded((value) => !value)}>
                  {markdownExpanded ? '收起 Markdown 编辑器' : '展开 Markdown 编辑器'}
                </button>
                {markdownExpanded ? (
                  <textarea value={draft.markdown} onChange={(event) => patchDraft({ markdown: event.target.value })} spellCheck={false} />
                ) : (
                  <p>{draft.markdown.replace(/---[\s\S]*?---/, '').replace(/\s+/g, ' ').trim().slice(0, 140)}...</p>
                )}
              </div>
              <AssistantBox
                open={assistantOpen}
                onToggle={() => setAssistantOpen((value) => !value)}
                suggestions={suggestions}
                onRefresh={() => setAssistantSeed((value) => value + 1)}
                onApply={applySuggestion}
              />
            </section>
          ) : null}

          {currentStep === 'design' ? (
            <section className="step-panel">
              <div className="step-heading">
                <Wand2 size={20} />
                <div>
                  <h2>调样式</h2>
                  <p>选择平台、模板和封面信息。</p>
                </div>
              </div>
              <div className="platform-summary">
                <MonitorCog size={18} />
                <div>
                  <strong>{platformPreset.name}</strong>
                  <span>
                    封面 {platformPreset.coverSize.width}x{platformPreset.coverSize.height}，正文 1080x1440
                  </span>
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
              <div className="title-scale-card">
                <div>
                  <span>标题字号</span>
                  <strong>{Math.round(draft.titleScale * 100)}%</strong>
                </div>
                <input
                  type="range"
                  min="80"
                  max="130"
                  step="5"
                  value={Math.round(draft.titleScale * 100)}
                  onChange={(event) => patchDraft({ titleScale: Number(event.target.value) / 100 })}
                />
                <p>同时影响正文大标题和导出封面标题。</p>
              </div>
              <div className="cover-tools">
                <button onClick={selectCoverImage}>
                  <Image size={17} />
                  {coverImagePath ? '更换封面底图' : '上传封面底图'}
                </button>
                <span>{coverImagePath ? fileName(coverImagePath) : '不上传时会自动生成占位封面'}</span>
              </div>
              <label className="field full">
                <span>封面提示词</span>
                <textarea className="prompt-textarea" value={draft.coverPrompt} onChange={(event) => patchDraft({ coverPrompt: event.target.value })} />
              </label>
              <AssistantBox
                open={assistantOpen}
                onToggle={() => setAssistantOpen((value) => !value)}
                suggestions={suggestions}
                onRefresh={() => setAssistantSeed((value) => value + 1)}
                onApply={applySuggestion}
              />
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
          ) : null}

          {currentStep === 'preview' ? (
            <section className="step-panel compact">
              <div className="step-heading">
                <Image size={20} />
                <div>
                  <h2>看预览</h2>
                  <p>检查封面、正文分页和长图效果。</p>
                </div>
              </div>
              <div className="preview-mode-tabs">
                {(['cover', 'page', 'long'] as PreviewMode[]).map((mode) => (
                  <button key={mode} className={previewMode === mode ? 'selected' : ''} onClick={() => setPreviewMode(mode)}>
                    {mode === 'cover' ? '封面' : mode === 'page' ? '正文页' : '长图'}
                  </button>
                ))}
              </div>
              <div className="zoom-row">
                <button onClick={() => setZoom((value) => Math.max(0.26, value - 0.04))}>
                  <ZoomOut size={16} />
                </button>
                <span>{Math.round(zoom * 100)}%</span>
                <button onClick={() => setZoom((value) => Math.min(0.68, value + 0.04))}>
                  <ZoomIn size={16} />
                </button>
              </div>
              <div className="page-list">
                {previewPages.map((page) => (
                  <button
                    key={page.index}
                    className={selectedPage === page.index && previewMode === 'page' ? 'selected' : ''}
                    onClick={() => {
                      setSelectedPage(page.index)
                      setPreviewMode('page')
                    }}
                  >
                    第 {page.index} 页
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          {currentStep === 'export' ? (
            <section className="step-panel compact">
              <div className="step-heading">
                <Download size={20} />
                <div>
                  <h2>导出</h2>
                  <p>选择格式和导出内容，完成后会打开输出目录。</p>
                </div>
              </div>
              <div className="choice-group">
                <span>格式</span>
                <div>
                  {(['png', 'jpg', 'webp'] as ExportFormat[]).map((format) => (
                    <button
                      key={format}
                      className={draft.exportSettings.format === format ? 'selected' : ''}
                      onClick={() => patchExportSettings({ format })}
                    >
                      {exportFormatName(format)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="choice-group">
                <span>内容</span>
                <div>
                  {(['all', 'cover', 'pages', 'long'] as ExportAssetType[]).map((assetType) => (
                    <button
                      key={assetType}
                      className={draft.exportSettings.assetType === assetType ? 'selected' : ''}
                      onClick={() => patchExportSettings({ assetType })}
                    >
                      {exportKindName(assetType)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="export-list">
                <strong>将导出</strong>
                {estimatedFiles.map((name) => (
                  <span key={name}>{name}</span>
                ))}
              </div>
              <button className="wide-primary" onClick={exportSelected} disabled={generation.isGenerating}>
                <Download size={18} />
                导出文件
              </button>
              <div className="recent-exports">
                <div>
                  <strong>最近导出</strong>
                  {recentExports.length ? <button onClick={() => setRecentExports([])}>清空</button> : null}
                </div>
                {recentExports.length ? (
                  recentExports.slice(0, 4).map((record) => (
                    <article key={record.id}>
                      <span>{record.title}</span>
                      <button onClick={() => window.ipWriter.revealPath(record.path)}>
                        <FolderOpen size={15} />
                      </button>
                      <button onClick={() => setRecentExports((current) => current.filter((item) => item.id !== record.id))}>
                        <Trash2 size={15} />
                      </button>
                    </article>
                  ))
                ) : (
                  <p>暂无导出记录</p>
                )}
              </div>
            </section>
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
              <p>{template.name} · {platformPreset.name}</p>
            </div>
            <div className="visual-actions">
              <button onClick={() => setPreviewMode('cover')}>封面</button>
              <button onClick={() => setPreviewMode('page')}>分页</button>
              <button onClick={() => setPreviewMode('long')}>长图</button>
            </div>
          </div>
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
        {error ? <div className="error-message">{error}</div> : null}
      </footer>
    </main>
  )
}

function TemplateThumb({ template }: { template: TemplateConfig }): JSX.Element {
  return (
    <div
      className="template-thumb"
      style={{
        color: template.colors.text,
        background: `linear-gradient(135deg, ${template.colors.paper}, ${template.colors.background})`,
        borderColor: template.colors.border
      }}
    >
      <i style={{ background: template.colors.accent }} />
      <b style={{ color: template.colors.accent }}>标题</b>
      <em style={{ background: template.colors.accent2 }} />
      <span style={{ background: template.colors.text }} />
      <span style={{ background: template.colors.muted }} />
      <small style={{ borderColor: template.colors.border, background: template.colors.quoteBackground }} />
    </div>
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
