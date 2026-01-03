import { useEffect, useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
    ArrowLeft,
    Settings,
    Database,
    FolderOpen,
    GitBranch,
    Play,
    Square,
    Loader2,
    RefreshCw,
    Terminal,
    ChevronDown,
    ChevronUp,
    File,
    RotateCw,
    Link2
} from 'lucide-react';
import { Project, Service } from '@/types/project';
import { startTilt, stopTilt, getTiltState, getTiltLogs, generateTiltfiles } from '@/api';
import { invoke } from '@tauri-apps/api/core';
import { useAppState } from '@/providers/appstate-provider';
import { TiltLog, TiltStatus } from '@/types/tilt';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { openUrl } from '@tauri-apps/plugin-opener';
import { message } from '@tauri-apps/plugin-dialog';

interface ProjectViewProps {
    project: Project;
    onBack: () => void;
    onEdit: () => void;
}

export default function ProjectView({ project, onBack, onEdit }: ProjectViewProps) {
    const { state: appState } = useAppState(); // await invoke<AppState>('get_app_state');
    const [selectedEnv, setSelectedEnv] = useState<string>(
        Object.keys(project.environments)[0] || 'dev'
    );
    const [tiltStatus, setTiltStatus] = useState<'stopped' | 'running' | 'starting' | 'stopping'>('stopped');
    const [isCheckingStatus, setIsCheckingStatus] = useState(false);
    const [tiltLogs, setTiltLogs] = useState<string[]>([]);
    const [showTerminal, setShowTerminal] = useState(true);
    const [terminalAutoScroll, setTerminalAutoScroll] = useState(true);
    const terminalRef = useRef<HTMLPreElement>(null);
    const [tiltInterval, setTiltInterval] = useState<any>(null);
    const [isUpdatingTiltfiles, setIsUpdatingTiltfiles] = useState(false);
    const [isRestarting, setIsRestarting] = useState(false);
    const terminalAutoScrollRef = useRef(terminalAutoScroll)
    const [titleWebUi, setTiltWebUi] = useState<string>('')

    const currentEnv = project.environments[selectedEnv];

    const handleStartTilt = async () => {
        try {
            setTiltStatus('starting');
            await startTilt(project, selectedEnv);
            setTiltStatus('running');
        } catch (error) {
            console.error('Failed to start Tilt:', error);
            setTiltStatus('stopped');
        }
    };

    const handleStopTilt = async () => {
        try {
            setTiltStatus('stopping');
            await stopTilt(project, selectedEnv);
            setTiltStatus('stopped');

            if (tiltInterval) {
                clearInterval(tiltInterval)
            }
        } catch (error) {
            console.error('Failed to stop Tilt:', error);
            setTiltStatus('running');
        }
    };

    const handleRefreshStatus = async () => {
        try {
            setIsCheckingStatus(true);
            const state = await getTiltState(project, selectedEnv);
            const tiltState = typeof state === 'string' ? "stopped" : (state as TiltStatus).status;

            setTiltStatus(tiltState as any | 'running');
        } catch (error) {
            console.error('Failed to get Tilt status:', error);
        } finally {
            setIsCheckingStatus(false);
        }
    };

    const initTiltCheckerInterval = () => {
        const interval = setInterval(async () => {
            await handleRefreshStatus()
            if (tiltStatus === 'running') {
                await fetchLogs()
            }
        }, 3000)

        setTiltInterval(interval);
    }

    const applyTerminalAutoScroll = useCallback(() => {
        if (tiltInterval) {
            clearInterval(tiltInterval)
        }

        // Auto-scroll to bottom
        if (terminalAutoScrollRef.current && terminalRef.current) {
            terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
        }

        if (tiltStatus === "running") {
            initTiltCheckerInterval()
        }

    }, [terminalAutoScroll])

    const fetchLogs = async () => {
        try {
            const logs = await getTiltLogs(project, selectedEnv, 500);
            setTiltLogs((JSON.parse(logs) as TiltLog).logs);

            applyTerminalAutoScroll();
        } catch (error) {
            console.error('Failed to fetch logs:', error);
        }
    };

    const handleOpenTiltWebUi = async () => {
        try {
            await openUrl(titleWebUi);
        } catch (err) {
            await message('Opening Tilt Web Ui failed', { title: "Tilt Web UI" })
        }
    }

    const handleUpdateTiltfiles = async () => {
        try {
            setIsUpdatingTiltfiles(true);
            await generateTiltfiles(project, selectedEnv);
        } catch (error) {
            console.error('Failed to update Tiltfiles:', error);
        } finally {
            setIsUpdatingTiltfiles(false);
        }
    };

    const handleRestartTilt = async () => {
        try {
            setIsRestarting(true);
            // Stop Tilt first
            await stopTilt(project, selectedEnv);
            setTiltStatus('stopped');

            // Wait a moment before restarting
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Start Tilt again
            setTiltStatus('starting');
            await startTilt(project, selectedEnv);
            setTiltStatus('running');
        } catch (error) {
            console.error('Failed to restart Tilt:', error);
            setTiltStatus('stopped');
        } finally {
            setIsRestarting(false);
        }
    };

    const handleOpenInEditor = async (service: Service) => {
        try {
            // Get editor preference from app state
            const editor = appState.preferences.default_editor || undefined;

            const servicePath = service.path || service.name;
            await invoke('call_backend', {
                command: 'openInEditor',
                args: {
                    project,
                    repo_name: servicePath,
                    editor,
                },
            });
        } catch (error) {
            console.error('Failed to open in editor:', error);
        }
    };

    useEffect(() => {
        initTiltCheckerInterval();

        return () => {
            if (tiltInterval) {
                clearInterval(tiltInterval)
            }
        }
    }, [tiltStatus]);

    // Handle terminal autoscroll controller
    useEffect(() => {
        terminalAutoScrollRef.current = terminalAutoScroll;
    }, [terminalAutoScroll]);

    useEffect(() => {
        console.log(titleWebUi, tiltStatus, tiltLogs.length)
        if (!titleWebUi && tiltStatus === 'running' && tiltLogs.length) {
            const tiltInfoLine = tiltLogs[0]
            const match = tiltInfoLine.match(/https?:\/\/\S+/);

            setTiltWebUi(match ? match[0] : '')
        }
    }, [tiltLogs, titleWebUi, tiltStatus])

    // Initial log fetch
    useEffect(() => {
        fetchLogs();
    }, [selectedEnv]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-8">
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <Button variant="ghost" onClick={onBack}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back
                    </Button>
                    <Button onClick={onEdit}>
                        <Settings className="mr-2 h-4 w-4" />
                        Edit Project
                    </Button>
                </div>

                {/* Project Info */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-2xl">{project.project.name}</CardTitle>
                                <CardDescription className="mt-2">
                                    Project dashboard and controls
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="flex items-center gap-3 text-sm">
                                <FolderOpen className="h-4 w-4 text-slate-500" />
                                <div>
                                    <div className="font-medium text-slate-600 dark:text-slate-400">
                                        Workspace
                                    </div>
                                    <div className="text-slate-500 dark:text-slate-500 text-xs break-all">
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
                                        {project.project.services_path || 'repos'}
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
                                    variant={selectedEnv === env ? 'default' : 'outline'}
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
                                    variant={tiltStatus === 'running' ? 'default' : 'secondary'}
                                    className="capitalize"
                                >
                                    {tiltStatus}
                                </Badge>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={handleRefreshStatus}
                                    disabled={isCheckingStatus}
                                >
                                    <RefreshCw className={`h-4 w-4 ${isCheckingStatus ? 'animate-spin' : ''}`} />
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="flex gap-3 flex-wrap">
                            <Button
                                onClick={handleStartTilt}
                                disabled={tiltStatus === 'running' || tiltStatus === 'starting'}
                                variant="default"
                            >
                                {tiltStatus === 'starting' ? (
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
                                disabled={tiltStatus !== 'running' && tiltStatus !== 'stopping'}
                                variant="destructive"
                            >
                                {tiltStatus === 'stopping' ? (
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
                                disabled={tiltStatus !== 'running' || isRestarting}
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
                            {!!titleWebUi && (<Button
                                onClick={handleOpenTiltWebUi}
                                variant="outline"
                            >
                                <>
                                    <Link2 className="mr-2 h-4 w-4" />
                                    Open Web UI
                                </>
                            </Button>)}
                        </div>
                    </CardContent>
                </Card>

                {/* Services List */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Services</CardTitle>
                        <CardDescription>
                            {currentEnv.services.length} service{currentEnv.services.length !== 1 ? 's' : ''} in {selectedEnv} environment
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {currentEnv.services.length > 0 ? (
                            <div className="space-y-4">
                                {currentEnv.services.map((service, idx) => (
                                    <Card key={`${service.name}-${idx}`} className="bg-slate-50 dark:bg-slate-900">
                                        <CardHeader className="pb-3">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <CardTitle className="text-base">{service.name}</CardTitle>
                                                    {!service.enabled && (
                                                        <Badge variant="secondary" className="text-xs">
                                                            Disabled
                                                        </Badge>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Button variant="ghost" size="icon" onClick={() => handleOpenInEditor(service)} title="Open in Editor">
                                                        <FolderOpen className="h-4 w-4" />
                                                    </Button>

                                                    <Badge variant="outline">
                                                        {service.docker ? 'Docker' :
                                                            service.k8s ? 'Kubernetes' :
                                                                service.helm ? 'Helm' :
                                                                    service.kustomize ? 'Kustomize' : 'Unknown'}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="pt-0 space-y-3">
                                            {/* Repository */}
                                            {service.repo && (
                                                <div className="text-sm space-y-1">
                                                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                                                        <GitBranch className="h-3 w-3" />
                                                        <span className="font-medium">Repository:</span>
                                                    </div>
                                                    <div className="pl-5 text-xs text-slate-500 dark:text-slate-500 break-all">
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
                                                    <span className="font-medium">Local Path:</span> {service.path}
                                                </div>
                                            )}

                                            {/* Port */}
                                            {service.port && (
                                                <div className="text-sm text-slate-600 dark:text-slate-400">
                                                    <span className="font-medium">Port:</span> {service.port}
                                                </div>
                                            )}

                                            {/* Deployment Details */}
                                            {service.docker && service.docker.dockerfile && (
                                                <div className="text-sm text-slate-600 dark:text-slate-400">
                                                    <span className="font-medium">Dockerfile:</span> {service.docker.dockerfile}
                                                </div>
                                            )}
                                            {service.k8s && service.k8s.manifests && (
                                                <div className="text-sm text-slate-600 dark:text-slate-400">
                                                    <span className="font-medium">K8s Manifests:</span> {service.k8s.manifests}
                                                </div>
                                            )}
                                            {service.helm && service.helm.chart && (
                                                <div className="text-sm text-slate-600 dark:text-slate-400">
                                                    <span className="font-medium">Helm Chart:</span> {service.helm.chart}
                                                </div>
                                            )}
                                            {service.kustomize && service.kustomize.path && (
                                                <div className="text-sm text-slate-600 dark:text-slate-400">
                                                    <span className="font-medium">Kustomize Path:</span> {service.kustomize.path}
                                                </div>
                                            )}

                                            {/* Dependencies */}
                                            {service.depends_on && service.depends_on.length > 0 && (
                                                <div className="text-sm">
                                                    <span className="font-medium text-slate-600 dark:text-slate-400">
                                                        Dependencies:
                                                    </span>
                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                        {service.depends_on.map((dep: string, i: number) => (
                                                            <Badge key={i} variant="secondary" className="text-xs">
                                                                {dep}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Environment Variables */}
                                            {service.env && Object.keys(service.env).length > 0 && (
                                                <div className="text-sm">
                                                    <span className="font-medium text-slate-600 dark:text-slate-400">
                                                        Environment Variables: {Object.keys(service.env).length}
                                                    </span>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center text-slate-500 dark:text-slate-400 py-12">
                                <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                <p className="text-lg font-medium mb-1">No services configured</p>
                                <p className="text-sm">Click "Edit Project" to add services to this environment</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Shared Environment Variables */}
                {currentEnv.shared_env && Object.keys(currentEnv.shared_env).length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Shared Environment Variables</CardTitle>
                            <CardDescription>
                                Variables shared across all services in {selectedEnv}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {Object.entries(currentEnv.shared_env).map(([key, value]) => (
                                    <div key={key} className="flex items-start gap-3 text-sm">
                                        <code className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-xs font-mono">
                                            {key}
                                        </code>
                                        <span className="text-slate-500 dark:text-slate-400">=</span>
                                        <code className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-xs font-mono flex-1 break-all">
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
                                {showTerminal && (<div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="toggle-auto-scroll"
                                        checked={terminalAutoScroll}
                                        onCheckedChange={(checked) => {
                                            setTerminalAutoScroll(checked as boolean)
                                        }}
                                    />
                                    <Label htmlFor="toggle-auto-scroll" className="cursor-pointer flex items-center gap-2">
                                        Auto-scroll {JSON.stringify(terminalAutoScroll)}
                                    </Label>
                                </div>)}
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowTerminal(!showTerminal)}
                                >
                                    {showTerminal ? (
                                        <>
                                            <ChevronDown className="h-4 w-4 mr-1" />
                                            Hide
                                        </>
                                    ) : (
                                        <>
                                            <ChevronUp className="h-4 w-4 mr-1" />
                                            Show
                                        </>
                                    )}
                                </Button>
                            </div>

                        </div>
                    </CardHeader>
                    {showTerminal && (
                        <CardContent>
                            <div className="bg-slate-950 text-green-400 p-4 rounded-lg font-mono text-xs overflow-hidden">
                                <pre
                                    ref={terminalRef}
                                    className="whitespace-pre-wrap break-words max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900"
                                >
                                    {tiltLogs?.join("\n") || 'No logs available. Start Tilt to see output...'}
                                </pre>
                            </div>
                        </CardContent>
                    )}
                </Card>
            </div>
        </div>
    );
}
