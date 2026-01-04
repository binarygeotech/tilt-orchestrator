import { invoke } from "@tauri-apps/api/core"

import type { Project } from "@/types/project"

export interface TiltState {
  status: string
  is_running: boolean
  web_ui_url?: string
}

/**
 * Update the system tray menu with current project, environment, and Tilt state
 */
export async function updateTrayMenu(
  project: Project | null,
  env: string | null,
  tiltState: TiltState | null
): Promise<void> {
  await invoke("update_tray_menu", {
    project,
    env,
    tiltState,
  })
}
