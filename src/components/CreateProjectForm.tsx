import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { FolderOpen, ArrowLeft, Loader2 } from 'lucide-react';
import { Project } from '@/types/project';

interface CreateProjectFormProps {
  onBack: () => void;
  onProjectCreated: (project: Project) => void;
}

export default function CreateProjectForm({ onBack, onProjectCreated }: CreateProjectFormProps) {
  const [projectName, setProjectName] = useState('');
  const [workspacePath, setWorkspacePath] = useState('');
  const [servicesPath, setServicesPath] = useState('repos');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSelectWorkspace = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: 'Select Workspace Directory',
      });

      if (selected && typeof selected === 'string') {
        setWorkspacePath(selected);
        if (!projectName) {
          const name = selected.split('/').pop() || '';
          setProjectName(name);
        }
      }
    } catch (error) {
      console.error('Failed to select workspace:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const project = await invoke<Project>('call_backend', {
        command: 'createProject',
        args: {
          name: projectName,
          workspace_path: workspacePath,
          services_path: servicesPath,
        },
      });

      await invoke('add_recent_project_cmd', {
        name: projectName,
        path: workspacePath,
      });

      onProjectCreated(project);
    } catch (error: any) {
      setError(error?.toString() || 'Failed to create project');
      console.error('Failed to create project:', error);
    } finally {
      setLoading(false);
    }
  };

  const isValid = projectName.trim() && workspacePath.trim() && servicesPath.trim();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <Button variant="ghost" onClick={onBack} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Create New Project</CardTitle>
            <CardDescription>
              Set up a new Tilt orchestrator project for managing your microservices
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="project-name">Project Name</Label>
                <Input
                  id="project-name"
                  placeholder="my-awesome-project"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="workspace-path">Workspace Path</Label>
                <div className="flex gap-2">
                  <Input
                    id="workspace-path"
                    placeholder="/path/to/workspace"
                    value={workspacePath}
                    onChange={(e) => setWorkspacePath(e.target.value)}
                    required
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSelectWorkspace}
                  >
                    <FolderOpen className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  The root directory where your project will be created
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="services-path">Services Directory Name</Label>
                <Input
                  id="services-path"
                  placeholder="repos"
                  value={servicesPath}
                  onChange={(e) => setServicesPath(e.target.value)}
                  required
                />
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  The subdirectory name for storing service repositories
                </p>
              </div>

              <div className="flex gap-3">
                <Button type="submit" disabled={!isValid || loading} className="flex-1">
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Project
                </Button>
                <Button type="button" variant="outline" onClick={onBack}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
