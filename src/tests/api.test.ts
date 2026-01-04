import { invoke } from "@tauri-apps/api/core"
import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  createProject,
  generateTiltfiles,
  getTiltLogs,
  getTiltState,
  openProject,
  removeRecentProject,
  startTilt,
  stopTilt,
  updateProject,
  updateService,
} from "../api/api"
import type { Project } from "../types/project"

vi.mock("@tauri-apps/api/core")

describe("API Functions", () => {
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

  describe("createProject", () => {
    it("should create a project with correct parameters", async () => {
      vi.mocked(invoke).mockResolvedValue(mockProject)

      const result = await createProject(
        "test-project",
        "/test/workspace",
        "repos"
      )

      expect(invoke).toHaveBeenCalledWith("call_backend", {
        command: "createProject",
        args: {
          name: "test-project",
          workspace_path: "/test/workspace",
          services_path: "repos",
        },
      })
      expect(result).toEqual(mockProject)
    })
  })

  describe("openProject", () => {
    it("should open a project with workspace path", async () => {
      vi.mocked(invoke).mockResolvedValue(mockProject)

      const result = await openProject("/test/workspace")

      expect(invoke).toHaveBeenCalledWith("call_backend", {
        command: "openProject",
        args: { workspace_path: "/test/workspace" },
      })
      expect(result).toEqual(mockProject)
    })
  })

  describe("updateProject", () => {
    it("should update a project", async () => {
      vi.mocked(invoke).mockResolvedValue(mockProject)

      const result = await updateProject("/test/workspace", mockProject)

      expect(invoke).toHaveBeenCalledWith("call_backend", {
        command: "updateProject",
        args: {
          workspace_path: "/test/workspace",
          project: mockProject,
        },
      })
      expect(result).toEqual(mockProject)
    })
  })

  describe("updateService", () => {
    it("should update a service", async () => {
      const mockService = { name: "test-service", port: 3000, enabled: true }
      vi.mocked(invoke).mockResolvedValue(mockProject)

      const result = await updateService(
        "/test/workspace",
        "dev",
        "test-service",
        mockService
      )

      expect(invoke).toHaveBeenCalledWith("call_backend", {
        command: "updateService",
        args: {
          workspace_path: "/test/workspace",
          env: "dev",
          service_name: "test-service",
          service: mockService,
        },
      })
      expect(result).toEqual(mockProject)
    })
  })

  describe("Tilt operations", () => {
    describe("startTilt", () => {
      it("should start Tilt with project and environment", async () => {
        vi.mocked(invoke).mockResolvedValue(undefined)

        await startTilt(mockProject, "dev")

        expect(invoke).toHaveBeenCalledWith("call_backend", {
          command: "startTilt",
          args: {
            project: mockProject,
            env: "dev",
          },
        })
      })
    })

    describe("stopTilt", () => {
      it("should stop Tilt with project and environment", async () => {
        vi.mocked(invoke).mockResolvedValue(undefined)

        await stopTilt(mockProject, "dev")

        expect(invoke).toHaveBeenCalledWith("call_backend", {
          command: "stopTilt",
          args: {
            project: mockProject,
            env: "dev",
          },
        })
      })
    })

    describe("getTiltState", () => {
      it("should get Tilt state", async () => {
        const mockState = { status: "running" }
        vi.mocked(invoke).mockResolvedValue(mockState)

        const result = await getTiltState(mockProject, "dev")

        expect(invoke).toHaveBeenCalledWith("call_backend", {
          command: "reconcileTiltState",
          args: {
            project: mockProject,
            env: "dev",
          },
        })
        expect(result).toEqual(mockState)
      })
    })

    describe("getTiltLogs", () => {
      it("should get Tilt logs with default limit", async () => {
        const mockLogs = JSON.stringify({ logs: ["log1", "log2"] })
        vi.mocked(invoke).mockResolvedValue(mockLogs)

        const result = await getTiltLogs(mockProject, "dev")

        expect(invoke).toHaveBeenCalledWith("call_backend", {
          command: "getTiltLogs",
          args: {
            project: mockProject,
            env: "dev",
            lines: undefined,
          },
        })
        expect(result).toEqual(mockLogs)
      })

      it("should get Tilt logs with custom limit", async () => {
        const mockLogs = JSON.stringify({ logs: ["log1"] })
        vi.mocked(invoke).mockResolvedValue(mockLogs)

        await getTiltLogs(mockProject, "dev", 100)

        expect(invoke).toHaveBeenCalledWith("call_backend", {
          command: "getTiltLogs",
          args: {
            project: mockProject,
            env: "dev",
            lines: 100,
          },
        })
      })
    })

    describe("generateTiltfiles", () => {
      it("should generate Tiltfiles", async () => {
        vi.mocked(invoke).mockResolvedValue(undefined)

        await generateTiltfiles(mockProject, "dev")

        expect(invoke).toHaveBeenCalledWith("call_backend", {
          command: "generateTiltfiles",
          args: {
            project: mockProject,
            env: "dev",
          },
        })
      })
    })

    describe("removeRecentProject", () => {
      it("should remove a project from recent projects", async () => {
        vi.mocked(invoke).mockResolvedValue(undefined)

        await removeRecentProject("/test/workspace")

        expect(invoke).toHaveBeenCalledWith("remove_recent_project_cmd", {
          path: "/test/workspace",
        })
      })
    })
  })
})
