import { app, BrowserWindow, dialog, ipcMain } from 'electron'
import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import type { AppUpdater, ProgressInfo, UpdateInfo } from 'electron-updater'
import type { UpdateState } from '../shared/types'
import { createUpdateState, isDownloadableUpdate, normalizeReleaseNotes, updatePromptChoice } from '../shared/update'

const require = createRequire(import.meta.url)
const { autoUpdater } = require('electron-updater') as typeof import('electron-updater')

type FallbackChecker = () => Promise<UpdateState>

let getMainWindow: (() => BrowserWindow | null) | null = null
let fallbackChecker: FallbackChecker | null = null
let initialized = false
let startupCheckScheduled = false
let promptedForVersion: string | null = null
let state: UpdateState = createUpdateState(app.getVersion())

function publish(nextState: UpdateState): UpdateState {
  state = nextState
  const window = getMainWindow?.()
  if (window && !window.isDestroyed()) {
    window.webContents.send('updateState', state)
  }
  return state
}

function patchState(partial: Partial<UpdateState>): UpdateState {
  return publish(
    createUpdateState(app.getVersion(), {
      ...state,
      ...partial
    })
  )
}

function isPortableBuild(): boolean {
  return Boolean(process.env.PORTABLE_EXECUTABLE_FILE)
}

function hasUpdaterMetadata(): boolean {
  return existsSync(join(process.resourcesPath, 'app-update.yml'))
}

function unsupportedState(message: string): UpdateState {
  return patchState({
    status: 'unsupported',
    available: false,
    message
  })
}

async function getDevelopmentUpdateState(message: string): Promise<UpdateState> {
  if (!fallbackChecker) return unsupportedState(message)

  const fallback = await fallbackChecker()
  return patchState({
    ...fallback,
    status: 'unsupported',
    message: fallback.available
      ? `${message}。检测到 ${fallback.latestVersion ?? '新版本'}，但当前环境无法自动安装。`
      : message
  })
}

function releaseState(updateInfo: UpdateInfo): Partial<UpdateState> {
  return {
    latestVersion: updateInfo.version,
    available: true,
    releaseName: updateInfo.releaseName ?? undefined,
    releaseNotes: normalizeReleaseNotes(updateInfo.releaseNotes)
  }
}

async function promptForUpdate(updateInfo: UpdateInfo): Promise<void> {
  if (promptedForVersion === updateInfo.version) return
  promptedForVersion = updateInfo.version

  const window = getMainWindow?.()
  const options: Electron.MessageBoxOptions = {
    type: 'info',
    buttons: ['立即更新', '稍后'],
    defaultId: 0,
    cancelId: 1,
    title: '发现新版本',
    message: `发现新版本 ${updateInfo.version}`,
    detail: `当前版本 ${app.getVersion()}。同意后会自动下载、安装并重启应用，无需手动操作。`
  }
  const result = window && !window.isDestroyed() ? await dialog.showMessageBox(window, options) : await dialog.showMessageBox(options)

  if (updatePromptChoice(result.response) === 'download') {
    await startUpdateDownload()
    return
  }

  patchState({
    status: 'available',
    message: '已暂时忽略本次更新提示。'
  })
}

function bindUpdaterEvents(updater: AppUpdater): void {
  updater.autoDownload = false
  updater.autoInstallOnAppQuit = false

  updater.on('checking-for-update', () => {
    patchState({
      status: 'checking',
      available: false,
      message: '正在检查 GitHub Releases 更新。'
    })
  })

  updater.on('update-available', (updateInfo: UpdateInfo) => {
    patchState({
      status: 'available',
      message: '发现可安装的新版本。',
      ...releaseState(updateInfo)
    })
    void promptForUpdate(updateInfo)
  })

  updater.on('update-not-available', (updateInfo: UpdateInfo) => {
    patchState({
      status: 'not-available',
      latestVersion: updateInfo.version,
      available: false,
      releaseName: updateInfo.releaseName ?? undefined,
      releaseNotes: normalizeReleaseNotes(updateInfo.releaseNotes),
      message: '当前已经是最新版本。'
    })
  })

  updater.on('download-progress', (progress: ProgressInfo) => {
    patchState({
      status: 'downloading',
      available: true,
      message: '正在下载更新包。',
      progress: {
        percent: progress.percent,
        bytesPerSecond: progress.bytesPerSecond,
        transferred: progress.transferred,
        total: progress.total
      }
    })
  })

  updater.on('update-downloaded', (updateInfo: UpdateInfo) => {
    patchState({
      status: 'downloaded',
      message: '更新已下载完成，即将自动安装并重启。',
      ...releaseState(updateInfo)
    })
    patchState({
      status: 'installing',
      message: '正在退出并安装新版本。'
    })
    updater.quitAndInstall(true, true)
  })

  updater.on('error', (error: Error) => {
    patchState({
      status: 'error',
      available: false,
      message: error.message
    })
  })
}

function isUpdaterSupported(): string | null {
  if (!app.isPackaged) return '开发模式无法自动安装更新'
  if (process.platform !== 'win32') return '当前系统暂未启用自动安装更新'
  if (isPortableBuild()) return '便携版不支持静默自动安装，请使用 NSIS 安装版'
  if (!hasUpdaterMetadata()) return '缺少 app-update.yml，无法定位自动更新源'
  return null
}

export function initializeAutoUpdater(options: {
  getWindow: () => BrowserWindow | null
  fallbackCheck: FallbackChecker
}): void {
  getMainWindow = options.getWindow
  fallbackChecker = options.fallbackCheck
  if (initialized) return
  initialized = true
  bindUpdaterEvents(autoUpdater)
}

export async function checkForAppUpdate(): Promise<UpdateState> {
  const unsupported = isUpdaterSupported()
  if (unsupported) return getDevelopmentUpdateState(unsupported)

  try {
    patchState({
      status: 'checking',
      available: false,
      message: '正在检查 GitHub Releases 更新。'
    })
    await autoUpdater.checkForUpdates()
    return state
  } catch (caught) {
    return patchState({
      status: 'error',
      available: false,
      message: caught instanceof Error ? caught.message : String(caught)
    })
  }
}

export async function startUpdateDownload(): Promise<UpdateState> {
  const unsupported = isUpdaterSupported()
  if (unsupported) return unsupportedState(unsupported)
  if (!isDownloadableUpdate(state)) {
    return patchState({
      message: state.status === 'downloading' ? state.message : '当前没有可下载的更新。'
    })
  }

  patchState({
    status: 'downloading',
    message: '正在准备下载更新包。'
  })
  await autoUpdater.downloadUpdate()
  return state
}

export function getUpdateState(): UpdateState {
  return state
}

export function dismissUpdate(): UpdateState {
  return patchState({
    status: 'idle',
    available: false,
    message: undefined,
    progress: undefined
  })
}

export function scheduleStartupUpdateCheck(delayMs = 3000): void {
  if (startupCheckScheduled) return
  startupCheckScheduled = true
  setTimeout(() => {
    void checkForAppUpdate()
  }, delayMs)
}

export function registerUpdaterIpc(): void {
  ipcMain.handle('checkForUpdate', async () => checkForAppUpdate())
  ipcMain.handle('startUpdateDownload', async () => startUpdateDownload())
  ipcMain.handle('getUpdateState', async () => getUpdateState())
  ipcMain.handle('dismissUpdate', async () => dismissUpdate())
}
