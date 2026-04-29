export const PAGE_WIDTH = 1080
export const PAGE_HEIGHT = 1440

export type PlatformMode = 'xiaohongshu' | 'wechat' | 'generic'

export type TemplateId =
  | 'editorial-clean'
  | 'business-mono'
  | 'tech-briefing'
  | 'warm-column'
  | 'bold-opinion'
  | 'fresh-note'
  | 'shan-shui'
  | 'essay-notes'
  | 'journal-growth'

export type ExportFormat = 'png' | 'jpg' | 'webp' | 'pdf' | 'zip'

export type ExportAssetType = 'pages' | 'long' | 'cover' | 'all'

export type GenerationStep = 'import' | 'template' | 'cover' | 'pages' | 'long' | 'export'

export type CoverLayout =
  | 'left-report'
  | 'split-editorial'
  | 'center-statement'
  | 'paper-column'
  | 'note-board'

export type CoverMotif =
  | 'tech'
  | 'business'
  | 'warm'
  | 'editorial'
  | 'opinion'
  | 'note'
  | 'ink'
  | 'essay'
  | 'journal'

export interface CoverDesignConfig {
  layout: CoverLayout
  motif: CoverMotif
  palette: {
    background: string
    surface: string
    title: string
    subtitle: string
    muted: string
    accent: string
    accent2: string
    line: string
    imageOverlay: string
  }
}

export interface ArticleMeta {
  title: string
  subtitle?: string
  author?: string
  platform: PlatformMode
  template: TemplateId
  createdAt: string
  titleScale?: number
  coverLayoutAdjustments?: CoverLayoutAdjustments
}

export interface LayoutAdjustments {
  bodyFontSizeDelta?: number
  bodyLineHeightDelta?: number
  paragraphSpacingDelta?: number
  h1FontSizeDelta?: number
  h2FontSizeDelta?: number
  h3FontSizeDelta?: number
  paddingXDelta?: number
  paddingTopDelta?: number
  paddingBottomDelta?: number
  contentTopOffsetDelta?: number
  quotePaddingDelta?: number
  listSpacingDelta?: number
  pageMarkPosition?: 'bottom-right' | 'bottom-center' | 'hidden'
}

export interface CoverLayoutAdjustments {
  titleOffsetX?: number
  titleOffsetY?: number
  subtitleOffsetX?: number
  subtitleOffsetY?: number
  authorOffsetX?: number
  authorOffsetY?: number
  titleScale?: number
  subtitleScale?: number
  authorScale?: number
  maxWidthScale?: number
  align?: 'left' | 'center' | 'right'
  shadow?: boolean
  stroke?: boolean
  imageScale?: number
  imageFocusX?: number
  imageFocusY?: number
  overlayOpacity?: number
}

export interface RichTextSegment {
  text: string
  strong?: boolean
}

export interface HeadingBlock {
  id: string
  type: 'heading'
  level: 1 | 2 | 3
  text: string
  children: RichTextSegment[]
}

export interface ParagraphBlock {
  id: string
  type: 'paragraph'
  text: string
  children: RichTextSegment[]
}

export interface QuoteBlock {
  id: string
  type: 'quote'
  text: string
  children: RichTextSegment[]
}

export interface ListBlock {
  id: string
  type: 'list'
  ordered: boolean
  items: RichTextSegment[][]
}

export interface DividerBlock {
  id: string
  type: 'divider'
}

export interface PageBreakBlock {
  id: string
  type: 'pageBreak'
}

export type ArticleBlock =
  | HeadingBlock
  | ParagraphBlock
  | QuoteBlock
  | ListBlock
  | DividerBlock
  | PageBreakBlock

export type RenderableBlock = Exclude<ArticleBlock, PageBreakBlock>

export interface ArticlePage {
  index: number
  blocks: RenderableBlock[]
}

export interface ParsedArticle {
  meta: Partial<ArticleMeta>
  blocks: ArticleBlock[]
}

export interface TextStyleConfig {
  fontSize: number
  lineHeight: number
  marginBottom: number
  fontWeight?: number
}

export interface TemplateConfig {
  id: TemplateId
  name: string
  series: string
  description: string
  page: {
    width: number
    height: number
    paddingTop: number
    paddingRight: number
    paddingBottom: number
    paddingLeft: number
    contentTopOffset: number
  }
  colors: {
    background: string
    paper: string
    text: string
    muted: string
    accent: string
    accent2: string
    border: string
    quoteBackground: string
  }
  fonts: {
    title: string
    body: string
    accent: string
  }
  typography: {
    h1: TextStyleConfig
    h2: TextStyleConfig
    h3: TextStyleConfig
    paragraph: TextStyleConfig
    quote: TextStyleConfig
    list: TextStyleConfig
  }
  cover: {
    titleColor: string
    subtitleColor: string
    overlay: string
    design: CoverDesignConfig
  }
  adjustments?: LayoutAdjustments
}

export interface CustomTemplateConfig {
  id: string
  name: string
  baseTemplateId: TemplateId
  layoutAdjustments: LayoutAdjustments
  coverLayoutAdjustments: CoverLayoutAdjustments
  createdAt: string
}

export interface ProjectInfo {
  projectDir: string
  outputDir: string
  sourcePath: string
  configPath: string
}

export interface RenderJob {
  markdown: string
  meta: ArticleMeta
  templateId: TemplateId
  layoutAdjustments?: LayoutAdjustments
  coverImagePath?: string
  projectDir: string
  outputDir: string
}

export interface RenderPagesResult {
  pagePaths: string[]
  pageCount: number
}

export interface RenderCoverResult {
  coverPath: string | null
}

export interface ComposeLongImageResult {
  longImagePath: string
}

export interface ExportSettings {
  format: ExportFormat
  assetType: ExportAssetType
  platform: PlatformMode
  pageSize: string
  quality?: number
  pageRange?: string
  includeSource?: boolean
  packageMode?: 'assets' | 'publish'
}

export interface ExportAssetsResult {
  exportedPaths: string[]
  outputDir: string
}

export interface RecentExport {
  id: string
  title: string
  kind: ExportAssetType
  format: ExportFormat
  size: string
  path: string
  createdAt: string
}

export interface BrowserAutomationState {
  websiteName: string
  websiteUrl: string
  connected: boolean
  handoffReady: boolean
  promptCopied: boolean
}

export interface UpdateCheckResult {
  status: 'ok' | 'not-configured' | 'unavailable' | 'error'
  currentVersion: string
  latestVersion?: string
  available: boolean
  releaseUrl?: string
  repository?: string
  message?: string
}

export interface AssistantSuggestion {
  id: string
  text: string
  target: 'title' | 'subtitle' | 'tag' | 'coverPrompt'
}

export interface SaveProjectPayload {
  markdown: string
  meta: ArticleMeta
  coverImagePath?: string
  tags?: string[]
  coverPrompt?: string
  layoutAdjustments?: LayoutAdjustments
  exportSettings?: ExportSettings
}

export interface ImportedMarkdownFile {
  filePath: string
  content: string
}

export interface LoadedProject {
  projectDir: string
  sourcePath: string
  configPath: string
  markdown: string
  meta: Partial<ArticleMeta>
  coverImagePath?: string
  tags: string[]
  coverPrompt: string
  exportSettings?: Partial<ExportSettings>
  layoutAdjustments?: LayoutAdjustments
}

export interface IpImageConverterApi {
  importMarkdownFile: () => Promise<ImportedMarkdownFile | null>
  openProjectFile: () => Promise<LoadedProject | null>
  selectCoverImage: () => Promise<string | null>
  saveProject: (payload: SaveProjectPayload) => Promise<ProjectInfo>
  renderPages: (job: RenderJob) => Promise<RenderPagesResult>
  renderCover: (job: RenderJob) => Promise<RenderCoverResult>
  composeLongImage: (job: RenderJob) => Promise<ComposeLongImageResult>
  exportAssets: (job: RenderJob, settings: ExportSettings) => Promise<ExportAssetsResult>
  openOutputFolder: (path: string) => Promise<void>
  openExternalUrl: (url: string) => Promise<void>
  revealPath: (path: string) => Promise<void>
  checkForUpdate: () => Promise<UpdateCheckResult>
}
