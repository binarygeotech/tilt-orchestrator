export interface RecentProject {
  name: string
  path: string
  last_opened: string
}

export interface AppState {
  window: {
    width: number
    height: number
    x: number | null
    y: number | null
  }
  recent_projects: RecentProject[]
  preferences: {
    auto_open_last_project: boolean
    default_editor?: string | null
  }
}
