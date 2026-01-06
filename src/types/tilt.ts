export interface TiltStatus {
  status: string
}

export interface TiltLog {
  logs: string[]
}

export interface TiltInstallation {
  installed: boolean
  path: string | null
  version: string | null
}
