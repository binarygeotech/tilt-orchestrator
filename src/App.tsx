import { useEffect, useState } from "react"
import { AppStateProvider } from "@/providers/AppStateProvider"
import { invoke } from "@tauri-apps/api/core"
import { message } from "@tauri-apps/plugin-dialog"

import { Project } from "@/types/project"
import About from "@/components/About"
import CreateProjectForm from "@/components/CreateProjectForm"
import LandingScreen from "@/components/LandingScreen"
import ProjectManagement from "@/components/ProjectManagement"
import ProjectView from "@/components/ProjectView"
import Settings from "@/components/Settings"
import { ThemeProvider } from "@/components/ThemeProvider"
import ThemeToggle from "@/components/ThemeToggle"

import { openProject } from "./api/api"
import { TrayIconProvider } from "./providers/TrayIconProvider"

type Screen =
  | "landing"
  | "create-project"
  | "project-view"
  | "project-management"
  | "settings"
  | "about"

const SPLASHSCREEN_TIMEOUT = 2000

function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>("landing")
  const [currentProject, setCurrentProject] = useState<Project | null>(null)

  useEffect(() => {
    // Close splashscreen when React app is ready
    setTimeout(() => {
      invoke("close_splashscreen").catch(console.error)
    }, SPLASHSCREEN_TIMEOUT)
  }, [])

  const handleCreateProject = () => {
    setCurrentScreen("create-project")
  }

  const handleOpenProject = async (path: string, _name: string) => {
    try {
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
