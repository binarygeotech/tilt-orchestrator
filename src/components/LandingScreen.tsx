import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { FolderOpen, Plus, Clock, Settings, Info } from 'lucide-react';
import { AppState, RecentProject } from '@/types/app';
import { useAppState } from '@/providers/appstate-provider';

interface LandingScreenProps {
    onCreateProject: () => void;
    onOpenProject: (path: string, name: string) => void;
    onOpenSettings: () => void;
    onOpenAbout: () => void;
}

export default function LandingScreen({ onCreateProject, onOpenProject, onOpenSettings, onOpenAbout }: LandingScreenProps) {
    const [appState, setAppState] = useState<AppState | null>(null);
    const [autoOpen, setAutoOpen] = useState(false);
    const { state: contextState, setAppState: setState } = useAppState();

    useEffect(() => {
        loadAppState();
    }, []);

    useEffect(() => {
        if (autoOpen && appState?.recent_projects.length && !contextState.app_started) {
            setState({
                ...contextState,
                app_started: true,
            })

            handleRecentProjectClick(appState?.recent_projects[0])
        }

        // if (!contextState.app_started) {
        //     
        // }
    }, [appState, contextState])

    const loadAppState = async () => {
        try {
            const state = await invoke<AppState>('get_app_state');
            setAppState(state);
            setAutoOpen(state.preferences.auto_open_last_project);

            if (!contextState.recent_projects) {
                setState({
                    recent_projects: state.recent_projects,
                    preferences: {
                        auto_open_last_project: state.preferences.auto_open_last_project
                    },
                    app_started: contextState.app_started || false
                });
            }
        } catch (error) {
            console.error('Failed to load app state:', error);
        }
    };

    const handleAutoOpenChange = async (checked: boolean) => {
        setAutoOpen(checked);
        try {
            await invoke('update_preferences', {
                preferences: {
                    auto_open_last_project: checked,
                },
            });
        } catch (error) {
            console.error('Failed to update preferences:', error);
        }
    };

    const handleOpenProject = async () => {
        try {
            const selected = await open({
                directory: true,
                multiple: false,
                title: 'Select Project Directory',
            });

            if (selected && typeof selected === 'string') {
                const name = selected.split('/').pop() || 'Untitled';
                await invoke('add_recent_project_cmd', { name, path: selected });
                onOpenProject(selected, name);
            }
        } catch (error) {
            console.error('Failed to open project:', error);
        }
    };

    const handleRecentProjectClick = async (project: RecentProject) => {
        try {
            await invoke('add_recent_project_cmd', {
                name: project.name,
                path: project.path,
            });
            onOpenProject(project.path, project.name);
        } catch (error) {
            console.error('Failed to open recent project:', error);
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-8">
            <div className="max-w-4xl mx-auto space-y-8">
                {/* Header */}
                <div className="text-center space-y-2">
                    <div className="flex justify-end gap-2 mb-4">
                        <Button variant="ghost" size="sm" onClick={onOpenAbout}>
                            <Info className="h-4 w-4 mr-2" />
                            About
                        </Button>
                        <Button variant="ghost" size="sm" onClick={onOpenSettings}>
                            <Settings className="h-4 w-4 mr-2" />
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
                        <CardDescription>Start a new project or open an existing one</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        {appState?.recent_projects && appState.recent_projects.length > 0 ? (
                            appState.recent_projects.slice(0, 10).map((project, index) => (
                                <div
                                    key={index}
                                    onClick={() => handleRecentProjectClick(project)}
                                    className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="space-y-1">
                                            <h4 className="font-semibold text-slate-900 dark:text-slate-100">
                                                {project.name}
                                            </h4>
                                            <p className="text-sm text-slate-600 dark:text-slate-400">
                                                {project.path}
                                            </p>
                                        </div>
                                        <span className="text-xs text-slate-500 dark:text-slate-500">
                                            {formatDate(project.last_opened)}
                                        </span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-center text-slate-500 dark:text-slate-400 py-8">
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
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                                Automatically open the most recent project on startup
                            </label>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
