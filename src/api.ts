import { invoke } from "@tauri-apps/api/core"

import { Project } from "./types/project"
import { TiltStatus } from "./types/tilt"

export async function createProject(
  name: string,
  workspace: string,
  services_path: string
): Promise<Project> {
  return invoke("call_backend", {
    command: "createProject",
    args: {
      name,
      workspace_path: workspace,
      services_path,
    },
  }) as Promise<Project>
}

export async function openProject(workspace_path: string): Promise<any> {
  return invoke("call_backend", {
    command: "openProject",
    args: { workspace_path },
  }) as Promise<Project>
}

export async function updateProject(
  workspace_path: string,
  project: Project
): Promise<Project> {
  return invoke("call_backend", {
    command: "updateProject",
    args: {
      workspace_path,
      project,
    },
  }) as Promise<Project>
}

export async function updateService(
  workspace_path: string,
  env: string,
  serviceName: string,
  service: any
): Promise<Project> {
  return invoke("call_backend", {
    command: "updateService",
    args: {
      workspace_path,
      env,
      service_name: serviceName,
      service,
    },
  }) as Promise<Project>
}

export async function openInEditor(
  projectPath: string,
  servicePath: string,
  editor?: string
) {
  return invoke("call_backend", {
    command: "openInEditor",
    args: {
      project: { workspacePath: projectPath },
      repoName: servicePath,
      editor,
    },
  })
}

export async function generateTiltfiles(project: Project, env: string) {
  return invoke("call_backend", {
    command: "generateTiltfiles",
    args: { project, env },
  })
}

export async function startTilt(project: Project, env: string) {
  return invoke("call_backend", {
    command: "startTilt",
    args: { project, env },
  })
}

export async function stopTilt(project: Project, env: string) {
  return invoke("call_backend", {
    command: "stopTilt",
    args: { project, env },
  })
}

export async function restartTilt(project: Project, env: string) {
  return invoke("call_backend", {
    command: "restartTilt",
    args: { project, env },
  })
}

export async function getTiltState(project: Project, env: string) {
  const response = invoke("call_backend", {
    command: "reconcileTiltState",
    args: { project, env },
  }) as Promise<string>

  return (await response).includes("status")
    ? (JSON.parse(await response) as TiltStatus)
    : response
}

export async function getTiltLogs(
  project: Project,
  env: string,
  lines?: number
) {
  return invoke("call_backend", {
    command: "getTiltLogs",
    args: { project, env, lines },
  }) as Promise<string>
}

export async function reorderServices(
  project: Project,
  env: string,
  newOrder: string[]
) {
  return invoke("reorderServices", { project, env, newOrder })
}

export async function cloneRepo(url: string, path: string, branch?: string) {
  return invoke("cloneRepo", { url, path, branch })
}

export function getRecentProjects() {
  return invoke<
    {
      name: string
      path: string
      last_opened: string
    }[]
  >("get_recent_projects")
}
