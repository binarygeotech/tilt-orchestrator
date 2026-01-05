import { useEffect, useState } from "react"
import { AppStateProvider } from "@/providers/AppStateProvider"
import { invoke } from "@tauri-apps/api/core"
import { ask, message } from "@tauri-apps/plugin-dialog"

import { AppState } from "@/types/app"
import { Project } from "@/types/project"
import About from "@/components/About"
import ConfigureExistingProject from "@/components/ConfigureExistingProject"
import CreateProjectForm from "@/components/CreateProjectForm"
import LandingScreen from "@/components/LandingScreen"
import ProjectManagement from "@/components/ProjectManagement"
import ProjectView from "@/components/ProjectView"
import Settings from "@/components/Settings"
import { ThemeProvider } from "@/components/ThemeProvider"
import ThemeToggle from "@/components/ThemeToggle"

import { isValidProject, openProject, validateExecutablePath } from "./api/api"
import { TrayIconProvider } from "./providers/TrayIconProvider"

type Screen =
  | "landing"
  | "create-project"
  | "configure-existing-project"
  | "project-view"
  | "project-management"
  | "settings"
  | "about"

const SPLASHSCREEN_TIMEOUT = 2000

function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>("landing")
  const [currentProject, setCurrentProject] = useState<Project | null>(null)
  const [hasCheckedTilt, setHasCheckedTilt] = useState(false)
  const [pendingProjectPath, setPendingProjectPath] = useState<string>("")

  useEffect(() => {
    // Close splashscreen when React app is ready
    setTimeout(() => {
      invoke("close_splashscreen").catch(console.error)
    }, SPLASHSCREEN_TIMEOUT)

    // Check if Tilt is configured (only once on mount)
    checkTiltConfiguration()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const checkTiltConfiguration = async () => {
    if (hasCheckedTilt) return
    setHasCheckedTilt(true)
    try {
      const state = await invoke<AppState>("get_app_state")

      // If tilt_path is set, validate it
      if (state.preferences.tilt_path) {
        try {
          await validateExecutablePath(state.preferences.tilt_path)
          // Valid tilt path
        } catch (error) {
          // Invalid tilt path - show settings
          await message(
            "The configured Tilt path is invalid. Please update it in Settings.",
            { title: "Tilt Configuration Required", kind: "warning" }
          )
          setCurrentScreen("settings")
        }
      } else {
        // No tilt path configured - show settings
        await message(
          "Please configure the Tilt executable path in Settings to use this application.",
          { title: "Tilt Configuration Required", kind: "info" }
        )
        setCurrentScreen("settings")
      }
    } catch (error) {
      console.error("Failed to check Tilt configuration:", error)
    }
  }

  const handleCreateProject = () => {
    setCurrentScreen("create-project")
  }

  const handleOpenProject = async (path: string, _name: string) => {
    try {
      // First check if it's a valid TO project
      const validation = await isValidProject(path).then((response: any) => {
        if (typeof response === "string") {
          return JSON.parse(response)
        } else {
          return response
        }
      })

      if (!validation.valid) {
        // Not a valid TO project - ask user if they want to initialize it
        const shouldInitialize = await ask(
          "This directory is not a valid Tilt Orchestrator project. Would you like to initialize it for Tilt Orchestrator?",
          {
            title: "Initialize Project?",
            kind: "info",
          }
        )

        if (shouldInitialize) {
          // Show configuration screen
          setPendingProjectPath(path)
          setCurrentScreen("configure-existing-project")
        }
        return
      }

      // Valid project - open it
      const project = await openProject(path)

      setCurrentProject(JSON.parse(project as string))
      setCurrentScreen("project-view")
    } catch (err) {
      // console.error("Failed to load project", err)
      await message("Failed to open project: " + err, {
        title: "Tilt Orchestrator",
        kind: "error",
      })
    }
  }

  const handleProjectCreated = (project: Project) => {
    setCurrentProject(project)
    setCurrentScreen("project-view")
  }

  const handleExistingProjectInitialized = (project: Project) => {
    setPendingProjectPath("")
    setCurrentProject(project)
    setCurrentScreen("project-view")
  }

  const handleCancelInitialization = () => {
    setPendingProjectPath("")
    setCurrentScreen("landing")
  }

  const handleEditProject = () => {
    setCurrentScreen("project-management")
  }

  const handleProjectSaved = (project: Project) => {
    setCurrentProject(project)
    setCurrentScreen("project-view")
  }

  const handleOpenSettings = () => {
    setCurrentScreen("settings")
  }

  const handleOpenAbout = () => {
    setCurrentScreen("about")
  }

  const handleBackToLanding = () => {
    setCurrentScreen("landing")
    setCurrentProject(null)
  }

  return (
    <AppStateProvider>
      <ThemeProvider>
        <TrayIconProvider>
          <div className="overflow-y-auto">
            <ThemeToggle />
            {currentScreen === "landing" && (
              <LandingScreen
                onCreateProject={handleCreateProject}
                onOpenProject={handleOpenProject}
                onOpenSettings={handleOpenSettings}
                onOpenAbout={handleOpenAbout}
              />
            )}
            {currentScreen === "create-project" && (
              <CreateProjectForm
                onBack={handleBackToLanding}
                onProjectCreated={handleProjectCreated}
              />
            )}
            {currentScreen === "configure-existing-project" && (
              <ConfigureExistingProject
                projectPath={pendingProjectPath}
                onInitialized={handleExistingProjectInitialized}
                onCancel={handleCancelInitialization}
              />
            )}
            {currentScreen === "settings" && (
              <Settings onBack={handleBackToLanding} />
            )}
            {currentScreen === "about" && (
              <About onBack={handleBackToLanding} />
            )}
            {currentScreen === "project-view" && currentProject && (
              <ProjectView
                project={currentProject}
                onBack={handleBackToLanding}
                onEdit={handleEditProject}
              />
            )}
            {currentScreen === "project-management" && currentProject && (
              <ProjectManagement
                project={currentProject}
                onBack={handleBackToLanding}
                onSave={handleProjectSaved}
              />
            )}
          </div>
        </TrayIconProvider>
      </ThemeProvider>
    </AppStateProvider>
  )
}

export default App
