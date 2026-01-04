import { invoke } from "@tauri-apps/api/core"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { updateTrayMenu } from "../../api/tray"
import type { Project } from "../../types/project"

vi.mock("@tauri-apps/api/core")

describe("Tray API Functions", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mockProject: Project = {
    project: {
      name: "test-project",
      workspace_path: "/test/workspace",
      services_path: "repos",
      tilt: {
        mode: "root",
      },
    },
    environments: {
      dev: {
        services: [],
        shared_env: {},
      },
    },
  }

  describe("updateTrayMenu", () => {
    it("should update tray menu with project, env, and tilt state", async () => {
      vi.mocked(invoke).mockResolvedValue(undefined)

      const tiltState = {
        status: "running",
        is_running: true,
        web_ui_url: "http://localhost:10350",
      }

      await updateTrayMenu(mockProject, "dev", tiltState)

      expect(invoke).toHaveBeenCalledWith("update_tray_menu", {
        project: mockProject,
        env: "dev",
        tiltState: tiltState,
      })
    })

    it("should handle null values for project, env, and tilt state", async () => {
      vi.mocked(invoke).mockResolvedValue(undefined)

      await updateTrayMenu(null, null, null)

      expect(invoke).toHaveBeenCalledWith("update_tray_menu", {
        project: null,
        env: null,
        tiltState: null,
      })
    })
  })
})
