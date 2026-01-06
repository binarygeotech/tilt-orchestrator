import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import * as api from "../../api/api"
import ProjectView from "../../components/ProjectView"
import { AppStateProvider } from "../../providers/AppStateProvider"
import { TrayIconProvider } from "../../providers/TrayIconProvider"
import type { Project } from "../../types/project"

vi.mock("../../api/api")
vi.mock("@tauri-apps/plugin-dialog", () => ({
  ask: vi.fn(() => Promise.resolve(true)),
  message: vi.fn(() => Promise.resolve()),
}))

const mockProject: Project = {
  project: {
    name: "Test Project",
    workspace_path: "/test/workspace",
    services_path: "repos",
    tilt: {
      mode: "root",
    },
  },
  environments: {
    dev: {
      services: [
        {
          name: "test-service",
          port: 3000,
          enabled: true,
          docker: {
            context: ".",
            dockerfile: "Dockerfile",
          },
          env: {
            API_KEY: "test-key",
          },
        },
      ],
      shared_env: {
        SHARED_VAR: "shared-value",
      },
    },
    prod: {
      services: [],
      shared_env: {},
    },
  },
}

const mockAppState = {
  preferences: {
    default_editor: "code",
  },
  recent_projects: [],
}

describe("ProjectView", () => {
  const mockOnBack = vi.fn()
  const mockOnEdit = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.getTiltState).mockResolvedValue("stopped")
    vi.mocked(api.getTiltLogs).mockResolvedValue(JSON.stringify({ logs: [] }))
  })

  const renderComponent = () => {
    return render(
      <TrayIconProvider>
        <AppStateProvider>
          <ProjectView
            project={mockProject}
            onBack={mockOnBack}
            onEdit={mockOnEdit}
          />
        </AppStateProvider>
      </TrayIconProvider>
    )
  }

  it("should render project information", () => {
    renderComponent()

    expect(screen.getByText("Test Project")).toBeInTheDocument()
    expect(screen.getByText(/\/test\/workspace/)).toBeInTheDocument()
  })

  it("should render environment selector", () => {
    renderComponent()

    expect(screen.getByRole("button", { name: /dev/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /prod/i })).toBeInTheDocument()
  })

  it("should switch environments", () => {
    renderComponent()

    const prodButton = screen.getByRole("button", { name: /prod/i })
    fireEvent.click(prodButton)

    expect(screen.queryByText("test-service")).not.toBeInTheDocument()
  })

  it("should display services in the selected environment", () => {
    renderComponent()

    expect(screen.getByText("test-service")).toBeInTheDocument()
    expect(screen.getByText(/Port:/)).toBeInTheDocument()
    expect(screen.getByText("3000")).toBeInTheDocument()
    expect(screen.getByText("Docker")).toBeInTheDocument()
  })

  it("should display shared environment variables", () => {
    renderComponent()

    expect(screen.getByText("Shared Environment Variables")).toBeInTheDocument()
    expect(screen.getByText("SHARED_VAR")).toBeInTheDocument()
    expect(screen.getByText("shared-value")).toBeInTheDocument()
  })

  it("should call onBack when back button is clicked", () => {
    renderComponent()

    const backButton = screen.getByRole("button", { name: /back/i })
    fireEvent.click(backButton)

    expect(mockOnBack).toHaveBeenCalledOnce()
  })

  it("should call onEdit when edit button is clicked", () => {
    renderComponent()

    const editButton = screen.getByRole("button", { name: /edit project/i })
    fireEvent.click(editButton)

    expect(mockOnEdit).toHaveBeenCalledOnce()
  })

  describe("Tilt Controls", () => {
    it("should start Tilt when start button is clicked", async () => {
      vi.mocked(api.startTilt).mockResolvedValue(undefined)
      renderComponent()

      const startButtons = screen.getAllByRole("button", {
        name: /start tilt/i,
      })
      fireEvent.click(startButtons[0])

      await waitFor(() => {
        expect(api.startTilt).toHaveBeenCalledWith(mockProject, "dev")
      })
    })

    it("should update Tiltfiles when button is clicked", async () => {
      vi.mocked(api.generateTiltfiles).mockResolvedValue(undefined)
      renderComponent()

      const updateButton = screen.getByRole("button", {
        name: /update tiltfiles/i,
      })
      fireEvent.click(updateButton)

      await waitFor(() => {
        expect(api.generateTiltfiles).toHaveBeenCalledWith(mockProject, "dev")
      })
    })
  })

  describe("Terminal Output", () => {
    it("should display terminal section", () => {
      renderComponent()

      expect(screen.getByText("Tilt Output")).toBeInTheDocument()
    })

    it("should toggle terminal visibility", () => {
      renderComponent()

      const toggleButton = screen.getByRole("button", { name: /hide/i })
      fireEvent.click(toggleButton)

      expect(screen.getByRole("button", { name: /show/i })).toBeInTheDocument()
    })

    it("should display logs when fetched", async () => {
      const mockLogs = JSON.stringify({ logs: ["Log line 1", "Log line 2"] })

      // Mock Tilt state to be running after start
      let tiltState = "stopped"
      vi.mocked(api.getTiltState).mockImplementation(async () => tiltState)
      vi.mocked(api.getTiltLogs).mockResolvedValue(mockLogs)
      vi.mocked(api.startTilt).mockImplementation(async () => {
        tiltState = "running"
      })

      renderComponent()

      // Start Tilt
      const startButtons = screen.getAllByRole("button", {
        name: /start tilt/i,
      })
      fireEvent.click(startButtons[0])

      // Wait for Tilt to start
      await waitFor(() => {
        expect(api.startTilt).toHaveBeenCalledWith(mockProject, "dev")
      })

      // Wait for status check to show running state
      await waitFor(
        () => {
          expect(api.getTiltState).toHaveBeenCalled()
        },
        { timeout: 3000 }
      )

      // Wait for logs to be fetched and displayed
      await waitFor(
        () => {
          expect(screen.getByText(/Log line 1/)).toBeInTheDocument()
          expect(screen.getByText(/Log line 2/)).toBeInTheDocument()
        },
        { timeout: 5000 }
      )
    })
  })

  describe("Service Actions", () => {
    it("should show disabled badge for disabled services", () => {
      const projectWithDisabledService = {
        ...mockProject,
        environments: {
          dev: {
            services: [
              {
                ...mockProject.environments.dev.services[0],
                enabled: false,
              },
            ],
            shared_env: {},
          },
        },
      }

      render(
        <TrayIconProvider>
          <AppStateProvider>
            <ProjectView
              project={projectWithDisabledService}
              onBack={mockOnBack}
              onEdit={mockOnEdit}
            />
          </AppStateProvider>
        </TrayIconProvider>
      )

      expect(screen.getByText("Disabled")).toBeInTheDocument()
    })

    it("should display no services message when environment is empty", () => {
      renderComponent()

      const prodButton = screen.getByRole("button", { name: /prod/i })
      fireEvent.click(prodButton)

      expect(screen.getByText("No services configured")).toBeInTheDocument()
    })
  })
})
