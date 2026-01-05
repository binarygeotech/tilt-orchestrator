import { useEffect, useState } from "react"
import { checkTiltInstalled, removeRecentProject } from "@/api/api"
import { useAppState } from "@/providers/AppStateProvider"
import { invoke } from "@tauri-apps/api/core"
import { ask, message, open } from "@tauri-apps/plugin-dialog"
import { Clock, FolderOpen, Info, Plus, Settings, Trash2 } from "lucide-react"

import { AppState, RecentProject } from "@/types/app"

import { Button } from "./ui/button"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "./ui/card"
import { Checkbox } from "./ui/checkbox"
import { TiltInstallation } from "@/types/tilt"

interface LandingScreenProps {
    onCreateProject: () => void
    onOpenProject: (path: string, name: string) => void
    onOpenSettings: () => void
    onOpenAbout: () => void
}

export default function LandingScreen({
    onCreateProject,
    onOpenProject,
    onOpenSettings,
    onOpenAbout,
}: LandingScreenProps) {
    const [appState, setAppState] = useState<AppState | null>(null)
    const [autoOpen, setAutoOpen] = useState(false)
    const { state: contextState, setAppState: setState } = useAppState()
    const [tiltInstallation, setTiltInstallation] = useState<TiltInstallation>()

    useEffect(() => {
        loadAppState()
    }, [])

    useEffect(() => {
        if (
            autoOpen &&
            appState?.recent_projects.length &&
            !contextState.app_started
        ) {
            setState({
                ...appState,
                app_started: true,
            })

            handleRecentProjectClick(appState?.recent_projects[0])
        }
    }, [appState, contextState])

    const loadAppState = async () => {
        try {
            const installation: TiltInstallation = !tiltInstallation ? await checkTiltInstalled()
                .then((response: any) => {
                    if (typeof response === 'string') {
                        const _installation = JSON.parse(response)
                        setTiltInstallation(_installation)

                        return _installation
                    } else {
                        return {
                            installed: false
                        }
                    }
                }) : tiltInstallation


            if (installation.installed) {
                const state = await invoke<AppState>("get_app_state")
                setAppState(state)
                setAutoOpen(state.preferences.auto_open_last_project)

                setState({
                    recent_projects: state.recent_projects,
                    preferences: state.preferences,
                    app_started: contextState.app_started || false,
                })
            } else {
                // await message("Tilt is not installed. Please install it from https://docs.tilt.dev/install.html", {
                //     title: "Tilt Not found",
                //     kind: "warning"
                // })
            }
        } catch (error) {
            console.error("Failed to load app state:", error)
        }
    }

    const handleRemoveFromRecent = async (project: RecentProject) => {
        try {
            const confirmed = await ask(
                `Remove "${project.name}" from recent projects?`,
                {
                    title: "Remove from Recent",
                    kind: "warning",
                    okLabel: "Remove",
                }
            )

            if (confirmed) {
                await removeRecentProject(project.path).then(async () => {
                    await loadAppState()
                })
            }
        } catch (error) {
            console.error("Failed to remove from recent:", error)
            await message("Failed to remove project from recent list", {
                title: "Tilt Orchestrator",
            })
        }
    }

    const handleAutoOpenChange = async (checked: boolean) => {
        setAutoOpen(checked)
        try {
            await invoke("update_preferences", {
                preferences: {
                    auto_open_last_project: checked,
                },
            })
        } catch (error) {
            console.error("Failed to update preferences:", error)
        }
    }

    const handleOpenProject = async () => {
        try {
            const selected = await open({
                directory: true,
                multiple: false,
                title: "Select Project Directory",
            })

            if (selected && typeof selected === "string") {
                const name = selected.split("/").pop() || "Untitled"
                await invoke("add_recent_project_cmd", { name, path: selected })
                onOpenProject(selected, name)
            }
        } catch (error) {
            console.error("Failed to open project:", error)
        }
    }

    const handleRecentProjectClick = async (project: RecentProject) => {
        try {
            await invoke("add_recent_project_cmd", {
                name: project.name,
                path: project.path,
            })
            onOpenProject(project.path, project.name)
        } catch (error) {
            console.error("Failed to open recent project:", error)
        }
    }

    const formatDate = (dateString: string) => {
        const date = new Date(dateString)
        return (
            date.toLocaleDateString() +
            " " +
            date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8 dark:from-slate-900 dark:to-slate-800">
            <div className="mx-auto max-w-4xl space-y-8">
                {/* Header */}
                <div className="space-y-2 text-center">
                    <div className="mb-4 flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={onOpenAbout}>
                            <Info className="mr-2 h-4 w-4" />
                            About
                        </Button>
                        <Button variant="ghost" size="sm" onClick={onOpenSettings}>
                            <Settings className="mr-2 h-4 w-4" />
                            Settings
                        </Button>
                    </div>
                    <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100">
                        Tilt Orchestrator
                    </h1>
                    <p className="text-slate-600 dark:text-slate-400">
                        Manage your microservices development environment
                    </p>
                </div>

                {/* Quick Actions */}
                <Card>
                    <CardHeader>
                        <CardTitle>Quick Actions</CardTitle>
                        <CardDescription>
                            Start a new project or open an existing one
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <Button
                            onClick={onCreateProject}
                            className="h-24 flex-col space-y-2"
                            variant="outline"
                        >
                            <Plus className="h-8 w-8" />
                            <span>Create New Project</span>
                        </Button>
                        <Button
                            onClick={handleOpenProject}
                            className="h-24 flex-col space-y-2"
                            variant="outline"
                        >
                            <FolderOpen className="h-8 w-8" />
                            <span>Open Project</span>
                        </Button>
                    </CardContent>
                </Card>

                {/* Recent Projects */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Clock className="h-5 w-5" />
                            Recent Projects
                        </CardTitle>
                        <CardDescription>Your recently opened projects</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {appState?.recent_projects &&
                            appState.recent_projects.length > 0 ? (
                            appState.recent_projects.slice(0, 10).map((project, index) => (
                                <div
                                    key={index}
                                    className="cursor-pointer rounded-lg border border-slate-200 p-4 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                                >
                                    <div className="flex items-start justify-between">
                                        <div
                                            className="flex-1 space-y-1"
                                            onClick={() => handleRecentProjectClick(project)}
                                        >
                                            <h4 className="font-semibold text-slate-900 dark:text-slate-100">
                                                {project.name}
                                            </h4>
                                            <p className="text-sm text-slate-600 dark:text-slate-400">
                                                {project.path}
                                            </p>
                                        </div>
                                        <div className="flex flex-col items-end justify-between">
                                            <span className="text-xs text-slate-500 dark:text-slate-500">
                                                {formatDate(project.last_opened)}
                                            </span>

                                            <Button
                                                variant="ghost"
                                                size={"sm"}
                                                onClick={() => handleRemoveFromRecent(project)}
                                                title="Remove from recent projects"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                                {/* Remove from Recent */}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="py-8 text-center text-slate-500 dark:text-slate-400">
                                No recent projects
                            </p>
                        )}
                    </CardContent>
                </Card>

                {/* Preferences */}
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="auto-open"
                                checked={autoOpen}
                                onCheckedChange={handleAutoOpenChange}
                            />
                            <label
                                htmlFor="auto-open"
                                className="text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                                Automatically open the most recent project on startup
                            </label>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
