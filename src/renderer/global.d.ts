import type { IpImageConverterApi } from '../shared/types'

declare global {
  interface Window {
    ipWriter: IpImageConverterApi
  }
}

export {}
