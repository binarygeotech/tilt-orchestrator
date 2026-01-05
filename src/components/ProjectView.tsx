import { useCallback, useEffect, useRef, useState } from "react"
import {
  generateTiltfiles,
  getTiltLogs,
  getTiltState,
  // removeRecentProject,
  startTilt,
  stopTilt,
} from "@/api/api"
import { useAppState } from "@/providers/AppStateProvider"
import { useTrayIcon } from "@/providers/TrayIconProvider"
import { invoke } from "@tauri-apps/api/core"
import { listen } from "@tauri-apps/api/event"
import { ask, message } from "@tauri-apps/plugin-dialog"
import { openUrl } from "@tauri-apps/plugin-opener"
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Database,
  File,
  FolderOpen,
  GitBranch,
  Link2,
  Loader2,
  Play,
  RefreshCw,
  RotateCw,
  Settings,
  Square,
  Terminal,
} from "lucide-react"

import { Project, Service } from "@/types/project"
import { TiltLog, TiltStatus } from "@/types/tilt"

import { Badge } from "./ui/badge"
import { Button } from "./ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card"
import { Checkbox } from "./ui/checkbox"
import { Label } from "./ui/label"

interface ProjectViewProps {
  project: Project
  onBack: () => void
  onEdit: () => void
}
const TILT_STATUS_INTERVAL = 3000

export default function ProjectView({
  project,
  onBack,
  onEdit,
}: ProjectViewProps) {
  const { state: appState } = useAppState() // await invoke<AppState>('get_app_state');
  const [selectedEnv, setSelectedEnv] = useState<string>(
    Object.keys(project.environments)[0] || "dev"
  )
  const [tiltStatus, setTiltStatus] = useState<
    "stopped" | "running" | "starting" | "stopping"
  >("stopped")
  const [isCheckingStatus, setIsCheckingStatus] = useState(false)
  const [tiltLogs, setTiltLogs] = useState<string[]>([])
  const [showTerminal, setShowTerminal] = useState(true)
  const [terminalAutoScroll, setTerminalAutoScroll] = useState(true)
  const terminalRef = useRef<HTMLPreElement>(null)
  const [tiltInterval, setTiltInterval] = useState<any>(null)
  const [isUpdatingTiltfiles, setIsUpdatingTiltfiles] = useState(false)
  const [isRestarting, setIsRestarting] = useState(false)
  const terminalAutoScrollRef = useRef(terminalAutoScroll)
  const [tiltWebUi, setTiltWebUi] = useState<string>("")
  const { setTrayIcon } = useTrayIcon()
  const tiltIntervalRef = useRef<any>(null)

  const currentEnv = project.environments[selectedEnv]

  const handleStartTilt = async () => {
    try {
      if (
        currentEnv &&
        (!currentEnv.services.length ||
          !currentEnv.services.some((svc) => svc.enabled))
      ) {
        return await message(
          "Add or enable at least one service to start Tilt",
          {
            title: "Start Tilt",
            kind: "info",
          }
        )
      }

      setTiltStatus("starting")
      await startTilt(project, selectedEnv)
      setTiltStatus("running")

      if (tiltIntervalRef.current) {
        clearInterval(tiltIntervalRef.current)
      }

      initTiltCheckerInterval()
    } catch (error) {
      console.error("Failed to start Tilt:", error)
      setTiltStatus("stopped")
      await message(`Failed to start Tilt: ${error}`, {
        title: "Start Tilt",
        kind: "error",
      })
    }
  }

  const handleStopTilt = async () => {
    try {
      setTiltStatus("stopping")
      await stopTilt(project, selectedEnv)
      setTiltStatus("stopped")

      if (tiltInterval) {
        clearInterval(tiltInterval)
      }
    } catch (error) {
      console.error("Failed to stop Tilt:", error)
      setTiltStatus("running")
      await message(`Failed to stop Tilt: ${error}`, {
        title: "Stop Tilt Orchestrator",
        kind: "error",
      })
    }
  }

  const handleRefreshStatus = async () => {
    try {
      setIsCheckingStatus(true)
      const state = await getTiltState(project, selectedEnv)
      const tiltState =
        typeof state === "string" ? "stopped" : (state as TiltStatus).status

      setTiltStatus(tiltState as any | "running")
    } catch (error) {
      console.error("", error)
      await message(`Failed to get Tilt status: ${error}`, {
        title: "Tilt Status",
        kind: "error",
      })
    } finally {
      setIsCheckingStatus(false)
    }
  }

  const initTiltCheckerInterval = () => {
    if (tiltIntervalRef.current || tiltStatus === "stopped") {
      return
    }

    const interval = setInterval(async () => {
      await handleRefreshStatus()
      if (tiltStatus === "running") {
        await fetchLogs()
      }
    }, TILT_STATUS_INTERVAL)

    tiltIntervalRef.current = interval

    setTiltInterval(interval)
  }

  const handleBackButton = async () => {
    if (tiltStatus === "running") {
      const response = await ask(
        "Tilt is currently running, closing the project will stop Tilt process. Do you want to proceed?",
        {
          title: "Tilt is Running",
          okLabel: "Yes, proceed",
          kind: "warning",
        }
      )

      if (!response) {
        return
      }

      await handleStopTilt()
    }

    setTrayIcon({
      current_project: null,
      env: "",
      tilt_status: null,
    })

    if (tiltIntervalRef.current) {
      clearInterval(tiltIntervalRef.current)
    }

    if (onBack) {
      onBack()
    }
  }

  const applyTerminalAutoScroll = useCallback(() => {
    // Auto-scroll to bottom
    if (terminalAutoScrollRef.current && terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }

    if (tiltStatus === "running" && !tiltIntervalRef.current) {
      initTiltCheckerInterval()
    }
  }, [terminalAutoScroll])

  const fetchLogs = async () => {
    try {
      const logs = await getTiltLogs(project, selectedEnv, 500)
      setTiltLogs((JSON.parse(logs) as TiltLog).logs)

      applyTerminalAutoScroll()
    } catch (error) {
      console.error("Failed to fetch logs:", error)
      await message("Unable to fetch tilt logs", { title: "Tilt Logs" })
    }
  }

  const handleOpenTiltWebUi = async () => {
    try {
      await openUrl(tiltWebUi)
    } catch (err) {
      await message("Opening Tilt Web Ui failed", {
        title: "Tilt Web UI",
      })
    }
  }

  const handleUpdateTiltfiles = async () => {
    try {
      await ask(
        "This process will re-generate all Tiltfiles from the most recent project configurations. The process cannot be reversed. Do you which to continue?",
        {
          title: "Update Tiltfiles",
          okLabel: "Yes, proceed",
          kind: "warning",
        }
      ).then(async (response: boolean) => {
        if (response) {
          setIsUpdatingTiltfiles(true)
          await generateTiltfiles(project, selectedEnv)
        }
      })
    } catch (error) {
      console.error("Failed to update Tiltfiles:", error)
      await message("Failed to update Tiltfiles", {
        title: "Update Tiltfiles",
      })
    } finally {
      setIsUpdatingTiltfiles(false)
    }
  }

  // const handleRemoveFromRecent = async () => {
  //     try {
  //         const confirmed = await ask(
  //             `Remove "${project.project.name}" from recent projects?`,
  //             {
  //                 title: "Remove from Recent",
  //                 kind: "warning",
  //                 okLabel: "Remove",
  //             }
  //         )

  //         if (confirmed) {
  //             await removeRecentProject(project.project.workspace_path)

  //             // Navigate back after removing
  //             if (onBack) {
  //                 onBack()
  //             }
  //         }
  //     } catch (error) {
  //         console.error("Failed to remove from recent:", error)
  //         await message("Failed to remove project from recent list", {
  //             title: "Tilt Orchestrator",
  //         })
  //     }
  // }

  const handleRestartTilt = async () => {
    try {
      setIsRestarting(true)
      // Stop Tilt first
      await stopTilt(project, selectedEnv)
      setTiltStatus("stopped")

      // Wait a moment before restarting
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Start Tilt again
      setTiltStatus("starting")
      await startTilt(project, selectedEnv)
      setTiltStatus("running")
    } catch (error) {
      console.error("Failed to restart Tilt:", error)
      setTiltStatus("stopped")
      await message(`Failed to restart Tilt: ${error}`, {
        title: "Restart Tilt",
        kind: "error",
      })
    } finally {
      setIsRestarting(false)
    }
  }

  const handleOpenInEditor = async (service: Service) => {
    try {
      // Get editor preference from app state
      const editor = appState.preferences.default_editor || undefined

      const servicePath = service.path || service.name
      await invoke("call_backend", {
        command: "openInEditor",
        args: {
          project,
          repo_name: servicePath,
          editor,
        },
      })
    } catch (error) {
      console.error("Failed to open in editor:", error)
      await message(`Failed to open service in editor: ${error}`, {
        title: "Open Service",
        kind: "error",
      })
    }
  }

  useEffect(() => {
    if (!tiltIntervalRef.current) {
      initTiltCheckerInterval()
    } else if (tiltStatus === "stopped" && tiltIntervalRef.current) {
      clearInterval(tiltIntervalRef.current)
      tiltIntervalRef.current = null
    }

    return () => {
      if (tiltIntervalRef.current) {
        clearInterval(tiltIntervalRef.current)
        tiltIntervalRef.current = null
      }
    }
  }, [tiltStatus])

  // Handle terminal autoscroll controller
  useEffect(() => {
    terminalAutoScrollRef.current = terminalAutoScroll
  }, [terminalAutoScroll])

  useEffect(() => {
    if (!tiltWebUi && tiltStatus === "running" && tiltLogs.length) {
      const tiltInfoLine = tiltLogs[0]
      const match = tiltInfoLine.match(/https?:\/\/\S+/)

      setTiltWebUi(match ? match[0] : "")
    } else if (tiltWebUi && tiltStatus !== "running") {
      setTiltWebUi("")
    }
  }, [tiltLogs, tiltWebUi, tiltStatus])

  useEffect(() => {
    setTrayIcon({
      current_project: project,
      env: selectedEnv,
      tilt_status: {
        is_running: tiltStatus === "running",
        status: tiltStatus,
        web_ui_url: tiltWebUi,
      },
    })
  }, [project, tiltWebUi, tiltStatus, selectedEnv])

  // Initial log fetch
  useEffect(() => {
    handleRefreshStatus()
    // fetchLogs()
  }, [selectedEnv])

  const initListeners = async () => {
    const startTiltListener = await listen("start-tilt", async (_) => {
      await handleStartTilt()
    })

    const stopTiltListener = await listen("stop-tilt", async (_) => {
      await handleStopTilt()
    })

    const restartTiltListener = await listen("restart-tilt", async (_) => {
      await handleRestartTilt()
    })

    const openServiceInEditor = await listen(
      "open-service-in-editor",
      async (event) => {
        const serviceName = event.payload
        const service = project.environments[selectedEnv].services.find(
          (service) => service.name === serviceName
        )

        if (service) {
          await handleOpenInEditor(service)
        }
      }
    )

    // const disableService = await listen("toggle-service", async (event) => {
    //     console.log('Disable service', event)
    // });

    return [
      startTiltListener,
      stopTiltListener,
      restartTiltListener,
      openServiceInEditor,
      // disableService,
    ]
  }

  const listeners = useRef<Array<() => any> | null>(null)

  useEffect(() => {
    let cancelled = false

    const setup = async () => {
      listeners.current?.forEach((unlisten) => unlisten())
      listeners.current = null

      const l = await initListeners()

      if (!cancelled) {
        listeners.current = l
      } else {
        l.forEach((unlisten) => unlisten())
      }
    }

    setup()

    return () => {
      cancelled = true
      listeners.current?.forEach((unlisten) => unlisten())
      listeners.current = null
    }
  }, [selectedEnv])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8 dark:from-slate-900 dark:to-slate-800">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={handleBackButton}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div className="flex gap-2">
            {/* <Button
                            variant="ghost"
                            onClick={handleRemoveFromRecent}
                            title="Remove from recent projects"
                        >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Remove from Recent
                        </Button> */}
            <Button onClick={onEdit}>
              <Settings className="mr-2 h-4 w-4" />
              Edit Project
            </Button>
          </div>
        </div>

        {/* Project Info */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">
                  {project.project.name}
                </CardTitle>
                <CardDescription className="mt-2">
                  Project dashboard and controls
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="flex items-center gap-3 text-sm">
                <FolderOpen className="h-4 w-4 text-slate-500" />
                <div>
                  <div className="font-medium text-slate-600 dark:text-slate-400">
                    Workspace
                  </div>
                  <div className="text-xs break-all text-slate-500 dark:text-slate-500">
                    {project.project.workspace_path}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Database className="h-4 w-4 text-slate-500" />
                <div>
                  <div className="font-medium text-slate-600 dark:text-slate-400">
                    Tilt Mode
                  </div>
                  <div className="text-slate-500 dark:text-slate-500">
                    {project.project.tilt.mode}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <FolderOpen className="h-4 w-4 text-slate-500" />
                <div>
                  <div className="font-medium text-slate-600 dark:text-slate-400">
                    Services Path
                  </div>
                  <div className="text-slate-500 dark:text-slate-500">
                    {project.project.services_path || "repos"}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Environment Selector */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Environment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              {Object.keys(project.environments).map((env) => (
                <Button
                  key={env}
                  variant={selectedEnv === env ? "default" : "outline"}
                  onClick={() => setSelectedEnv(env)}
                  className="capitalize"
                >
                  {env}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Tilt Controls */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Tilt Controls</CardTitle>
                <CardDescription>
                  Manage Tilt for the {selectedEnv} environment
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant={tiltStatus !== "running" ? "default" : "secondary"}
                  className="capitalize"
                >
                  {tiltStatus}
                </Badge>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleRefreshStatus}
                  disabled={tiltStatus === "stopped"}
                >
                  <RefreshCw
                    className={`h-4 w-4 ${isCheckingStatus ? "animate-spin" : ""}`}
                  />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={handleStartTilt}
                disabled={tiltStatus === "running" || tiltStatus === "starting"}
                variant="default"
              >
                {tiltStatus === "starting" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Starting...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Start Tilt
                  </>
                )}
              </Button>
              <Button
                onClick={handleStopTilt}
                disabled={tiltStatus !== "running" && tiltStatus !== "stopping"}
                variant="destructive"
                className="text-white"
              >
                {tiltStatus === "stopping" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Stopping...
                  </>
                ) : (
                  <>
                    <Square className="mr-2 h-4 w-4" />
                    Stop Tilt
                  </>
                )}
              </Button>
              <Button
                onClick={handleRestartTilt}
                disabled={tiltStatus !== "running"}
                variant="outline"
              >
                {isRestarting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Restarting...
                  </>
                ) : (
                  <>
                    <RotateCw className="mr-2 h-4 w-4" />
                    Restart Tilt
                  </>
                )}
              </Button>
              <Button
                onClick={handleUpdateTiltfiles}
                disabled={isUpdatingTiltfiles}
                variant="outline"
              >
                {isUpdatingTiltfiles ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <File className="mr-2 h-4 w-4" />
                    Update Tiltfiles
                  </>
                )}
              </Button>
              {!!tiltWebUi && (
                <Button onClick={handleOpenTiltWebUi} variant="outline">
                  <>
                    <Link2 className="mr-2 h-4 w-4" />
                    Open Web UI
                  </>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Services List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Services</CardTitle>
            <CardDescription>
              {currentEnv.services.length} service
              {currentEnv.services.length !== 1 ? "s" : ""} in {selectedEnv}{" "}
              environment
            </CardDescription>
          </CardHeader>
          <CardContent>
            {currentEnv.services.length > 0 ? (
              <div className="space-y-4">
                {currentEnv.services.map((service, idx) => (
                  <Card
                    key={`${service.name}-${idx}`}
                    className="bg-slate-50 dark:bg-slate-900"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-base">
                            {service.name}
                          </CardTitle>
                          {!service.enabled && (
                            <Badge variant="secondary" className="text-xs">
                              Disabled
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenInEditor(service)}
                            title="Open in Editor"
                          >
                            <FolderOpen className="h-4 w-4" />
                          </Button>

                          <Badge variant="outline">
                            {service.docker
                              ? "Docker"
                              : service.k8s
                                ? "Kubernetes"
                                : service.helm
                                  ? "Helm"
                                  : service.kustomize
                                    ? "Kustomize"
                                    : "Unknown"}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-0">
                      {/* Repository */}
                      {service.repo && (
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                            <GitBranch className="h-3 w-3" />
                            <span className="font-medium">Repository:</span>
                          </div>
                          <div className="pl-5 text-xs break-all text-slate-500 dark:text-slate-500">
                            {service.repo.url}
                            {service.repo.branch && (
                              <Badge variant="outline" className="ml-2 text-xs">
                                {service.repo.branch}
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Local Path */}
                      {service.path && (
                        <div className="text-sm text-slate-600 dark:text-slate-400">
                          <span className="font-medium">Local Path:</span>{" "}
                          {service.path}
                        </div>
                      )}

                      {/* Port */}
                      {service.port && (
                        <div className="text-sm text-slate-600 dark:text-slate-400">
                          <span className="font-medium">Port:</span>{" "}
                          {service.port}
                        </div>
                      )}

                      {/* Deployment Details */}
                      {service.docker && service.docker.dockerfile && (
                        <div className="text-sm text-slate-600 dark:text-slate-400">
                          <span className="font-medium">Dockerfile:</span>{" "}
                          {service.docker.dockerfile}
                        </div>
                      )}
                      {service.k8s && service.k8s.manifests && (
                        <div className="text-sm text-slate-600 dark:text-slate-400">
                          <span className="font-medium">K8s Manifests:</span>{" "}
                          {service.k8s.manifests}
                        </div>
                      )}
                      {service.helm && service.helm.chart && (
                        <div className="text-sm text-slate-600 dark:text-slate-400">
                          <span className="font-medium">Helm Chart:</span>{" "}
                          {service.helm.chart}
                        </div>
                      )}
                      {service.kustomize && service.kustomize.path && (
                        <div className="text-sm text-slate-600 dark:text-slate-400">
                          <span className="font-medium">Kustomize Path:</span>{" "}
                          {service.kustomize.path}
                        </div>
                      )}

                      {/* Dependencies */}
                      {service.depends_on && service.depends_on.length > 0 && (
                        <div className="text-sm">
                          <span className="font-medium text-slate-600 dark:text-slate-400">
                            Dependencies:
                          </span>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {service.depends_on.map(
                              (dep: string, i: number) => (
                                <Badge
                                  key={i}
                                  variant="secondary"
                                  className="text-xs"
                                >
                                  {dep}
                                </Badge>
                              )
                            )}
                          </div>
                        </div>
                      )}

                      {/* Environment Variables */}
                      {service.env && Object.keys(service.env).length > 0 && (
                        <div className="text-sm">
                          <span className="font-medium text-slate-600 dark:text-slate-400">
                            Environment Variables:{" "}
                            {Object.keys(service.env).length}
                          </span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-slate-500 dark:text-slate-400">
                <Database className="mx-auto mb-4 h-12 w-12 opacity-50" />
                <p className="mb-1 text-lg font-medium">
                  No services configured
                </p>
                <p className="text-sm">
                  Click "Edit Project" to add services to this environment
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Shared Environment Variables */}
        {currentEnv.shared_env &&
          Object.keys(currentEnv.shared_env).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Shared Environment Variables
                </CardTitle>
                <CardDescription>
                  Variables shared across all services in {selectedEnv}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(currentEnv.shared_env).map(([key, value]) => (
                    <div key={key} className="flex items-start gap-3 text-sm">
                      <code className="rounded bg-slate-100 px-2 py-1 font-mono text-xs dark:bg-slate-800">
                        {key}
                      </code>
                      <span className="text-slate-500 dark:text-slate-400">
                        =
                      </span>
                      <code className="flex-1 rounded bg-slate-100 px-2 py-1 font-mono text-xs break-all dark:bg-slate-800">
                        {value}
                      </code>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

        {/* Terminal Output */}
        <Card className="sticky bottom-0">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4" />
                <CardTitle className="text-lg">Tilt Output</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                {showTerminal && (
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="toggle-auto-scroll"
                      checked={terminalAutoScroll}
                      onCheckedChange={(checked) => {
                        setTerminalAutoScroll(checked as boolean)
                      }}
                    />
                    <Label
                      htmlFor="toggle-auto-scroll"
                      className="flex cursor-pointer items-center gap-2"
                    >
                      Auto-scroll
                    </Label>
                  </div>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowTerminal(!showTerminal)}
                >
                  {showTerminal ? (
                    <>
                      <ChevronDown className="mr-1 h-4 w-4" />
                      Hide
                    </>
                  ) : (
                    <>
                      <ChevronUp className="mr-1 h-4 w-4" />
                      Show
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          {showTerminal && (
            <CardContent>
              <div className="overflow-hidden rounded-lg bg-slate-950 p-4 font-mono text-xs text-green-400">
                <pre
                  ref={terminalRef}
                  className="scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900 max-h-96 overflow-y-auto break-words whitespace-pre-wrap"
                >
                  {tiltLogs?.join("\n") ||
                    "No logs available. Start Tilt to see output..."}
                </pre>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  )
}
