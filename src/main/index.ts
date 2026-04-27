import { app, BrowserWindow, Menu, dialog, ipcMain, shell, type OpenDialogOptions } from 'electron'
import { existsSync } from 'node:fs'
import { copyFile, mkdir, readFile, readdir, stat, unlink, writeFile } from 'node:fs/promises'
import { join, parse } from 'node:path'
import sharp from 'sharp'
import { renderArticlePageHtml } from '../shared/html'
import { parseMarkdown } from '../shared/markdown'
import { paginateBlocks } from '../shared/pagination'
import { getPlatformPreset } from '../shared/platforms'
import { defaultTemplateId, getTemplate } from '../shared/templates'
import {
  PAGE_HEIGHT,
  PAGE_WIDTH,
  type ArticleBlock,
  type ArticleMeta,
  type ExportAssetType,
  type ExportFormat,
  type ExportSettings,
  type ProjectInfo,
  type RenderJob,
  type SaveProjectPayload,
  type UpdateCheckResult
} from '../shared/types'
import { escapeHtml, slugify, wrapTextByUnits } from '../shared/text'

let mainWindow: BrowserWindow | null = null

interface PackageMetadata {
  repository?: string | { url?: string }
  ipImageConverter?: {
    updateRepository?: string
  }
}

function getAppIconPath(): string {
  if (app.isPackaged) return join(process.resourcesPath, 'icon.ico')
  return join(process.cwd(), 'resources', 'icon.ico')
}

function createMainWindow(): void {
  const iconPath = getAppIconPath()
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 920,
    minWidth: 1180,
    minHeight: 760,
    show: false,
    title: 'IP-image-conventer',
    autoHideMenuBar: true,
    icon: existsSync(iconPath) ? iconPath : undefined,
    backgroundColor: '#f3f6fb',
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  mainWindow.setMenu(null)
  mainWindow.setMenuBarVisibility(false)

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    void mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    void mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

async function ensureDirectory(path: string): Promise<void> {
  await mkdir(path, { recursive: true })
}

function buildArticleMeta(payload: SaveProjectPayload): ArticleMeta {
  return {
    ...payload.meta,
    title: payload.meta.title.trim() || '未命名文章',
    subtitle: payload.meta.subtitle?.trim() || undefined,
    author: payload.meta.author?.trim() || undefined,
    platform: payload.meta.platform,
    template: payload.meta.template || defaultTemplateId,
    createdAt: payload.meta.createdAt || new Date().toISOString()
  }
}

function projectsRoot(): string {
  return join(process.cwd(), 'projects')
}

function timestamp(): string {
  const now = new Date()
  const pad = (value: number): string => value.toString().padStart(2, '0')
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(
    now.getHours()
  )}${pad(now.getMinutes())}${pad(now.getSeconds())}`
}

function hasTopLevelTitle(blocks: ArticleBlock[]): boolean {
  return blocks.some((block) => block.type === 'heading' && block.level === 1)
}

function withFallbackTitle(blocks: ArticleBlock[], meta: ArticleMeta): ArticleBlock[] {
  if (hasTopLevelTitle(blocks)) return blocks
  return [
    {
      id: 'heading-fallback-title',
      type: 'heading',
      level: 1,
      text: meta.title,
      children: [{ text: meta.title }]
    },
    ...blocks
  ]
}

async function cleanGeneratedPages(outputDir: string): Promise<void> {
  await ensureDirectory(outputDir)
  const files = await readdir(outputDir)
  await Promise.all(
    files
      .filter((file) => /^page-\d{3}\.png$/.test(file))
      .map((file) => unlink(join(outputDir, file)).catch(() => undefined))
  )
}

async function captureHtmlToPng(html: string, outputPath: string): Promise<void> {
  const renderWindow = new BrowserWindow({
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
    show: false,
    paintWhenInitiallyHidden: true,
    webPreferences: {
      backgroundThrottling: false,
      offscreen: false,
      sandbox: false
    }
  })

  try {
    await renderWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
    await renderWindow.webContents.executeJavaScript(
      'document.fonts ? document.fonts.ready.then(() => true) : true'
    )
    await new Promise((resolve) => setTimeout(resolve, 100))
    const image = await renderWindow.webContents.capturePage({
      x: 0,
      y: 0,
      width: PAGE_WIDTH,
      height: PAGE_HEIGHT
    })
    const size = image.getSize()
    const png = image.toPNG()
    if (size.width === PAGE_WIDTH && size.height === PAGE_HEIGHT) {
      await writeFile(outputPath, png)
    } else {
      await sharp(png).resize(PAGE_WIDTH, PAGE_HEIGHT, { fit: 'fill' }).png().toFile(outputPath)
    }
  } finally {
    renderWindow.destroy()
  }
}

function svgEscape(value: string): string {
  return escapeHtml(value)
}

function coverFileName(meta: ArticleMeta): string {
  return meta.platform === 'wechat' ? 'cover_wechat.png' : 'cover_vertical.png'
}

function coverTextSvg(meta: ArticleMeta, width: number, height: number): string {
  const template = getTemplate(meta.template)
  const titleLines = wrapTextByUnits(meta.title, 8.5, 4)
  const subtitleLines = meta.subtitle ? wrapTextByUnits(meta.subtitle, 17, 2) : []
  const compact = height < 600
  const titleSize = compact
    ? titleLines.length >= 3
      ? 44
      : 52
    : titleLines.length >= 4
      ? 86
      : titleLines.length >= 3
        ? 96
        : 112
  const centerX = width / 2
  const titleStart = compact ? 142 : 685 - titleLines.length * titleSize * 0.58
  const titleText = titleLines
    .map(
      (line, index) =>
        `<text x="${centerX}" y="${titleStart + index * titleSize * 1.06}" text-anchor="middle">${svgEscape(
          line
        )}</text>`
    )
    .join('')
  const subtitleStart = titleStart + titleLines.length * titleSize * 1.06 + (compact ? 28 : 54)
  const subtitleText = subtitleLines
    .map(
      (line, index) =>
        `<text class="subtitle" x="${centerX}" y="${subtitleStart + index * (compact ? 30 : 48)}" text-anchor="middle">${svgEscape(
          line
        )}</text>`
    )
    .join('')
  const author = meta.author
    ? `<text class="author" x="${centerX}" y="${height - (compact ? 42 : 165)}" text-anchor="middle">${svgEscape(meta.author)}</text>`
    : ''

  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="shade" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stop-color="#000" stop-opacity="0.08"/>
          <stop offset="0.48" stop-color="#000" stop-opacity="0.12"/>
          <stop offset="1" stop-color="#000" stop-opacity="0.68"/>
        </linearGradient>
        <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="8" stdDeviation="7" flood-color="#000" flood-opacity="0.44"/>
        </filter>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#shade)"/>
      <rect x="${compact ? 36 : 86}" y="${compact ? 30 : 116}" width="${width - (compact ? 72 : 172)}" height="${height - (compact ? 60 : 232)}" rx="${compact ? 18 : 42}" fill="none" stroke="rgba(255,255,255,0.34)" stroke-width="2"/>
      <text x="${centerX}" y="${compact ? 74 : 188}" text-anchor="middle" class="series">${svgEscape(template.series)}</text>
      <g class="title" filter="url(#softShadow)">${titleText}</g>
      <g>${subtitleText}</g>
      ${author}
      <style>
        .series {
          fill: rgba(255,255,255,0.72);
          font-size: ${compact ? 18 : 30}px;
          font-family: "Microsoft YaHei", "SimSun", sans-serif;
          letter-spacing: 0;
        }
        .title text {
          fill: ${template.cover.titleColor};
          font-size: ${titleSize}px;
          font-weight: 800;
          font-family: "Microsoft YaHei", "SimSun", sans-serif;
          letter-spacing: 0;
        }
        .subtitle {
          fill: ${template.cover.subtitleColor};
          font-size: ${compact ? 24 : 40}px;
          font-family: "Microsoft YaHei", "SimSun", sans-serif;
          letter-spacing: 0;
        }
        .author {
          fill: rgba(255,255,255,0.78);
          font-size: 28px;
          font-family: "Microsoft YaHei", sans-serif;
          letter-spacing: 0;
        }
      </style>
    </svg>
  `
}

function placeholderCoverSvg(meta: ArticleMeta, width: number, height: number): string {
  const template = getTemplate(meta.template)
  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width}" height="${height}" fill="${template.colors.background}"/>
      <circle cx="${width * 0.16}" cy="${height * 0.18}" r="${Math.min(width, height) * 0.24}" fill="${template.colors.accent}" opacity="0.16"/>
      <circle cx="${width * 0.84}" cy="${height * 0.76}" r="${Math.min(width, height) * 0.28}" fill="${template.colors.accent2}" opacity="0.14"/>
      <path d="M0 ${height * 0.78} C${width * 0.24} ${height * 0.7} ${width * 0.39} ${height * 0.83} ${width * 0.6} ${height * 0.74} C${width * 0.73} ${height * 0.68} ${width * 0.86} ${height * 0.69} ${width} ${height * 0.64} L${width} ${height} L0 ${height} Z" fill="${template.colors.accent}" opacity="0.22"/>
    </svg>
  `
}

async function createCover(job: RenderJob): Promise<string | null> {
  const preset = getPlatformPreset(job.meta.platform)
  const outputPath = join(job.outputDir, coverFileName(job.meta))
  const overlay = Buffer.from(coverTextSvg(job.meta, preset.coverSize.width, preset.coverSize.height))

  if (job.coverImagePath) {
    await sharp(job.coverImagePath)
      .resize(preset.coverSize.width, preset.coverSize.height, { fit: 'cover', position: 'centre' })
      .composite([{ input: overlay, top: 0, left: 0 }])
      .png()
      .toFile(outputPath)
    return outputPath
  }

  await sharp(Buffer.from(placeholderCoverSvg(job.meta, preset.coverSize.width, preset.coverSize.height)))
    .composite([{ input: overlay, top: 0, left: 0 }])
    .png()
    .toFile(outputPath)
  return outputPath
}

function exportExtension(format: ExportFormat): string {
  return format === 'jpg' ? 'jpg' : format
}

function exportKindLabel(kind: ExportAssetType): string {
  if (kind === 'pages') return 'pages'
  if (kind === 'long') return 'long'
  if (kind === 'all') return 'all'
  return 'cover'
}

async function convertImage(inputPath: string, outputPath: string, format: ExportFormat): Promise<void> {
  if (format === 'png') {
    await copyFile(inputPath, outputPath)
    return
  }

  const pipeline = sharp(inputPath)
  if (format === 'jpg') {
    await pipeline.jpeg({ quality: 92, mozjpeg: true }).toFile(outputPath)
    return
  }
  await pipeline.webp({ quality: 92 }).toFile(outputPath)
}

async function findAssetsForExport(outputDir: string, meta: ArticleMeta, assetType: ExportAssetType): Promise<string[]> {
  const files = await readdir(outputDir)
  if (assetType === 'pages') {
    return files
      .filter((file) => /^page-\d{3}\.png$/.test(file))
      .sort()
      .map((file) => join(outputDir, file))
  }

  if (assetType === 'long') {
    const longPath = join(outputDir, 'long.png')
    return existsSync(longPath) ? [longPath] : []
  }

  if (assetType === 'all') {
    const pagePaths = files
      .filter((file) => /^page-\d{3}\.png$/.test(file))
      .sort()
      .map((file) => join(outputDir, file))
    const longPath = join(outputDir, 'long.png')
    const coverPath = join(outputDir, coverFileName(meta))
    const fallbackCoverPath = join(outputDir, 'cover_vertical.png')
    return [
      ...(existsSync(coverPath) ? [coverPath] : existsSync(fallbackCoverPath) ? [fallbackCoverPath] : []),
      ...pagePaths,
      ...(existsSync(longPath) ? [longPath] : [])
    ]
  }

  const coverPath = join(outputDir, coverFileName(meta))
  if (existsSync(coverPath)) return [coverPath]
  const fallback = join(outputDir, 'cover_vertical.png')
  return existsSync(fallback) ? [fallback] : []
}

async function exportAssets(job: RenderJob, settings: ExportSettings): Promise<string[]> {
  const sourcePaths = await findAssetsForExport(job.outputDir, job.meta, settings.assetType)
  if (!sourcePaths.length) {
    throw new Error('没有找到可导出的图片，请先完成生成流程。')
  }

  const exportDir = join(job.outputDir, 'exports')
  await ensureDirectory(exportDir)
  const ext = exportExtension(settings.format)
  const kind = exportKindLabel(settings.assetType)
  const exportedPaths: string[] = []

  for (const [index, sourcePath] of sourcePaths.entries()) {
    const parsed = parse(sourcePath)
    const suffix = settings.assetType === 'pages' ? `-${(index + 1).toString().padStart(3, '0')}` : ''
    const allName = settings.assetType === 'all' ? `-${parsed.name.replace(/^cover_/, 'cover-')}` : ''
    const outputPath = join(exportDir, `${settings.platform}-${kind}${suffix}${allName}.${ext}`)
    await convertImage(sourcePath, outputPath, settings.format)
    exportedPaths.push(outputPath)
  }

  return exportedPaths
}

async function cleanLongRenderPages(tempDir: string): Promise<void> {
  await ensureDirectory(tempDir)
  const files = await readdir(tempDir)
  await Promise.all(
    files
      .filter((file) => /^long-page-\d{3}\.png$/.test(file))
      .map((file) => unlink(join(tempDir, file)).catch(() => undefined))
  )
}

async function createLongImage(job: RenderJob): Promise<string> {
  const template = getTemplate(job.templateId)
  const parsed = parseMarkdown(job.markdown, job.templateId)
  const blocks = withFallbackTitle(parsed.blocks, job.meta)
  const pages = paginateBlocks(blocks, template)
  const tempDir = join(job.outputDir, '.long-render')
  await cleanLongRenderPages(tempDir)

  const images = await Promise.all(
    pages.map(async (page) => {
      const input = join(tempDir, `long-page-${page.index.toString().padStart(3, '0')}.png`)
      const html = renderArticlePageHtml(job.meta, page, template, {
        variant: 'long',
        pageCount: pages.length
      })
      await captureHtmlToPng(html, input)
      const metadata = await sharp(input).metadata()
      return {
        input,
        width: metadata.width ?? PAGE_WIDTH,
        height: metadata.height ?? PAGE_HEIGHT
      }
    })
  )

  const width = Math.max(...images.map((image) => image.width))
  const height = images.reduce((sum, image) => sum + image.height, 0)
  let top = 0
  const composite = images.map((image) => {
    const item = { input: image.input, top, left: 0 }
    top += image.height
    return item
  })
  const outputPath = join(job.outputDir, 'long.png')

  await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: '#ffffff'
    }
  })
    .composite(composite)
    .png()
    .toFile(outputPath)

  await Promise.all(images.map((image) => unlink(image.input).catch(() => undefined)))
  return outputPath
}

function normalizeRepository(value: string | undefined): string | null {
  if (!value) return null
  const trimmed = value.trim()
  if (/^[\w.-]+\/[\w.-]+$/.test(trimmed)) return trimmed
  const match = trimmed.match(/github\.com[:/]([^/\s]+)\/([^/\s.]+)(?:\.git)?/i)
  return match ? `${match[1]}/${match[2]}` : null
}

async function readPackageMetadata(): Promise<PackageMetadata | null> {
  const candidates = [join(process.cwd(), 'package.json'), join(app.getAppPath(), 'package.json')]
  for (const candidate of candidates) {
    try {
      return JSON.parse(await readFile(candidate, 'utf8')) as PackageMetadata
    } catch {
      // Try the next likely package location.
    }
  }
  return null
}

async function updateRepository(): Promise<string | null> {
  const fromEnv = normalizeRepository(process.env.IP_IMAGE_CONVERTER_UPDATE_REPOSITORY)
  if (fromEnv) return fromEnv

  const metadata = await readPackageMetadata()
  const custom = normalizeRepository(metadata?.ipImageConverter?.updateRepository)
  if (custom) return custom

  const repository =
    typeof metadata?.repository === 'string' ? metadata.repository : metadata?.repository?.url
  return normalizeRepository(repository)
}

function normalizeVersion(value: string | undefined): string {
  return (value ?? '0.0.0').trim().replace(/^v/i, '').split(/[+-]/)[0]
}

function compareVersions(left: string, right: string): number {
  const leftParts = normalizeVersion(left).split('.').map((part) => Number.parseInt(part, 10) || 0)
  const rightParts = normalizeVersion(right).split('.').map((part) => Number.parseInt(part, 10) || 0)
  const length = Math.max(leftParts.length, rightParts.length, 3)
  for (let index = 0; index < length; index += 1) {
    const delta = (leftParts[index] ?? 0) - (rightParts[index] ?? 0)
    if (delta !== 0) return delta > 0 ? 1 : -1
  }
  return 0
}

async function checkForUpdate(): Promise<UpdateCheckResult> {
  const currentVersion = app.getVersion()
  const repository = await updateRepository()
  if (!repository) {
    return {
      status: 'not-configured',
      currentVersion,
      available: false,
      message: '未配置 GitHub 更新仓库。'
    }
  }

  try {
    const response = await fetch(`https://api.github.com/repos/${repository}/releases/latest`, {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'IP-Image-Converter'
      }
    })

    if (!response.ok) {
      return {
        status: 'unavailable',
        currentVersion,
        available: false,
        repository,
        message: `GitHub Releases 暂不可用：${response.status}`
      }
    }

    const release = (await response.json()) as {
      tag_name?: string
      name?: string
      html_url?: string
    }
    const latestVersion = normalizeVersion(release.tag_name || release.name)
    const available = compareVersions(latestVersion, currentVersion) > 0
    return {
      status: 'ok',
      currentVersion,
      latestVersion,
      available,
      releaseUrl: release.html_url,
      repository
    }
  } catch (caught) {
    return {
      status: 'error',
      currentVersion,
      available: false,
      repository,
      message: caught instanceof Error ? caught.message : String(caught)
    }
  }
}

function registerIpc(): void {
  ipcMain.handle('importMarkdownFile', async () => {
    const options: OpenDialogOptions = {
      title: '导入 Markdown',
      properties: ['openFile'],
      filters: [{ name: 'Markdown', extensions: ['md', 'markdown'] }]
    }
    const result = mainWindow
      ? await dialog.showOpenDialog(mainWindow, options)
      : await dialog.showOpenDialog(options)

    if (result.canceled || !result.filePaths[0]) return null
    const filePath = result.filePaths[0]
    return {
      filePath,
      content: await readFile(filePath, 'utf8')
    }
  })

  ipcMain.handle('selectCoverImage', async () => {
    const options: OpenDialogOptions = {
      title: '选择封面底图',
      properties: ['openFile'],
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }]
    }
    const result = mainWindow
      ? await dialog.showOpenDialog(mainWindow, options)
      : await dialog.showOpenDialog(options)

    if (result.canceled || !result.filePaths[0]) return null
    return result.filePaths[0]
  })

  ipcMain.handle('saveProject', async (_event, payload: SaveProjectPayload): Promise<ProjectInfo> => {
    const meta = buildArticleMeta(payload)
    const projectName = `${timestamp()}-${slugify(meta.title)}`
    const projectDir = join(projectsRoot(), projectName)
    const outputDir = join(projectDir, 'output')
    const sourcePath = join(projectDir, 'source.md')
    const configPath = join(projectDir, 'config.json')

    await ensureDirectory(outputDir)
    await writeFile(sourcePath, payload.markdown, 'utf8')
    await writeFile(
      configPath,
      JSON.stringify(
        {
          meta,
          coverImagePath: payload.coverImagePath ?? null,
          tags: payload.tags ?? [],
          coverPrompt: payload.coverPrompt ?? '',
          exportSettings: payload.exportSettings ?? null,
          outputDir
        },
        null,
        2
      ),
      'utf8'
    )

    return { projectDir, outputDir, sourcePath, configPath }
  })

  ipcMain.handle('renderPages', async (_event, job: RenderJob) => {
    await cleanGeneratedPages(job.outputDir)
    const template = getTemplate(job.templateId)
    const parsed = parseMarkdown(job.markdown, job.templateId)
    const blocks = withFallbackTitle(parsed.blocks, job.meta)
    const pages = paginateBlocks(blocks, template)
    const pagePaths: string[] = []

    for (const page of pages) {
      const outputPath = join(job.outputDir, `page-${page.index.toString().padStart(3, '0')}.png`)
      const html = renderArticlePageHtml(job.meta, page, template)
      await captureHtmlToPng(html, outputPath)
      pagePaths.push(outputPath)
    }

    return { pagePaths, pageCount: pagePaths.length }
  })

  ipcMain.handle('renderCover', async (_event, job: RenderJob) => {
    const coverPath = await createCover(job)
    return { coverPath }
  })

  ipcMain.handle('composeLongImage', async (_event, job: RenderJob) => {
    const longImagePath = await createLongImage(job)
    return { longImagePath }
  })

  ipcMain.handle('exportAssets', async (_event, job: RenderJob, settings: ExportSettings) => {
    const exportedPaths = await exportAssets(job, settings)
    return { exportedPaths, outputDir: join(job.outputDir, 'exports') }
  })

  ipcMain.handle('openOutputFolder', async (_event, path: string) => {
    await shell.openPath(path)
  })

  ipcMain.handle('openExternalUrl', async (_event, url: string) => {
    await shell.openExternal(url)
  })

  ipcMain.handle('revealPath', async (_event, path: string) => {
    const info = await stat(path).catch(() => null)
    if (!info) return
    if (info.isDirectory()) {
      await shell.openPath(path)
      return
    }
    shell.showItemInFolder(path)
  })

  ipcMain.handle('checkForUpdate', async () => checkForUpdate())
}

app.whenReady().then(() => {
  app.setName('IP-image-conventer')
  app.setAppUserModelId('com.local.ip-image-conventer')
  Menu.setApplicationMenu(null)
  registerIpc()
  createMainWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
