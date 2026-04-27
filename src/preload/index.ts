import { contextBridge, ipcRenderer } from 'electron'
import type { IpImageConverterApi, RenderJob, SaveProjectPayload } from '../shared/types'

const api: IpImageConverterApi = {
  importMarkdownFile: () => ipcRenderer.invoke('importMarkdownFile'),
  selectCoverImage: () => ipcRenderer.invoke('selectCoverImage'),
  saveProject: (payload: SaveProjectPayload) => ipcRenderer.invoke('saveProject', payload),
  renderPages: (job: RenderJob) => ipcRenderer.invoke('renderPages', job),
  renderCover: (job: RenderJob) => ipcRenderer.invoke('renderCover', job),
  composeLongImage: (job: RenderJob) => ipcRenderer.invoke('composeLongImage', job),
  exportAssets: (job, settings) => ipcRenderer.invoke('exportAssets', job, settings),
  openOutputFolder: (path: string) => ipcRenderer.invoke('openOutputFolder', path),
  openExternalUrl: (url: string) => ipcRenderer.invoke('openExternalUrl', url),
  revealPath: (path: string) => ipcRenderer.invoke('revealPath', path),
  checkForUpdate: () => ipcRenderer.invoke('checkForUpdate')
}

contextBridge.exposeInMainWorld('ipWriter', api)
