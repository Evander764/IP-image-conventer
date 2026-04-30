import type { UpdateState, UpdateStatus } from './types'

export function createUpdateState(currentVersion: string, partial: Partial<UpdateState> = {}): UpdateState {
  return {
    status: 'idle',
    currentVersion,
    available: false,
    ...partial
  }
}

export function isDownloadableUpdate(state: UpdateState): boolean {
  return state.status === 'available' && state.available
}

export function updatePromptChoice(response: number): 'download' | 'dismiss' {
  return response === 0 ? 'download' : 'dismiss'
}

export function updateStatusLabel(status: UpdateStatus): string {
  const labels: Record<UpdateStatus, string> = {
    idle: '等待检查更新',
    checking: '正在检查更新',
    available: '发现新版本',
    downloading: '正在下载更新',
    downloaded: '更新下载完成',
    installing: '正在安装更新',
    'not-available': '已是最新版本',
    unavailable: '更新服务不可用',
    error: '更新失败',
    unsupported: '当前环境不支持自动安装'
  }
  return labels[status]
}

export function normalizeReleaseNotes(notes: unknown): string | undefined {
  if (!notes) return undefined
  if (typeof notes === 'string') return notes.trim() || undefined
  if (Array.isArray(notes)) {
    const text = notes
      .map((item) => {
        if (typeof item === 'string') return item
        if (item && typeof item === 'object') {
          const record = item as { version?: string; note?: string }
          return [record.version, record.note].filter(Boolean).join('\n')
        }
        return ''
      })
      .filter(Boolean)
      .join('\n\n')
    return text.trim() || undefined
  }
  return undefined
}
