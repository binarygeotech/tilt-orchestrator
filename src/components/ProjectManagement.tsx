import { useState } from "react"
import { updateProject } from "@/api/api"
import { message } from "@tauri-apps/plugin-dialog"
import { ArrowLeft, Database, Loader2, Save, Settings } from "lucide-react"

import { Project, Service } from "@/types/project"

import AddServiceDialog from "./AddServiceDialog"
import EnvVarEditor from "./EnvVarEditor"
import ServiceCard from "./ServiceCard"
import { Button } from "./ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Separator } from "./ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"

interface ProjectManagementProps {
  project: Project
  onBack: () => void
  onSave?: (project: Project) => void
}

export default function ProjectManagement({
  project: initialProject,
  onBack,
  onSave,
}: ProjectManagementProps) {
  const [project, setProject] = useState(initialProject)
  const [projectName, setProjectName] = useState(initialProject.project.name)
  const [selectedEnv, setSelectedEnv] = useState<string>(
    Object.keys(initialProject.environments)[0] || "dev"
  )
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState("")
  const [editingService, setEditingService] = useState<{
    index: number
    service: Service
  } | null>(null)

  const currentEnv = project.environments[selectedEnv]

  const handleProjectNameChange = () => {
    setProject({
      ...project,
      project: {
        ...project.project,
        name: projectName,
      },
    })
  }

  const handleSharedEnvChange = (envVars: Record<string, string>) => {
    setProject({
      ...project,
      environments: {
        ...project.environments,
        [selectedEnv]: {
          ...currentEnv,
          shared_env: envVars,
        },
      },
    })
  }

  const handleAddService = (service: Service) => {
    setProject({
      ...project,
      environments: {
        ...project.environments,
        [selectedEnv]: {
          ...currentEnv,
          services: [...currentEnv.services, service],
        },
      },
    })
  }

  const handleToggleService = (index: number, enabled: boolean) => {
    const updatedServices = [...currentEnv.services]
    updatedServices[index] = { ...updatedServices[index], enabled }
    setProject({
      ...project,
      environments: {
        ...project.environments,
        [selectedEnv]: {
          ...currentEnv,
          services: updatedServices,
        },
      },
    })
  }

  const handleDeleteService = (index: number) => {
    const updatedServices = currentEnv.services.filter((_, i) => i !== index)
    setProject({
      ...project,
      environments: {
        ...project.environments,
        [selectedEnv]: {
          ...currentEnv,
          services: updatedServices,
        },
      },
    })
  }

  const handleEditService = (index: number) => {
    setEditingService({ index, service: currentEnv.services[index] })
  }

  const handleUpdateService = (updatedService: Service) => {
    if (editingService === null) return

    const updatedServices = [...currentEnv.services]
    updatedServices[editingService.index] = updatedService

    setProject({
      ...project,
      environments: {
        ...project.environments,
        [selectedEnv]: {
          ...currentEnv,
          services: updatedServices,
        },
      },
    })

    setEditingService(null)
  }

  const handleSave = async () => {
    setSaving(true)
    setSaveMessage("")

    try {
      await updateProject(project.project.workspace_path, project)

      setSaveMessage("Project saved successfully!")
      setTimeout(() => setSaveMessage(""), 3000)

      await message("Project updated successfully.", {
        title: "Tilt Orchestrator",
        kind: "info",
      })

      // Call onSave callback if provided
      if (onSave) {
        onSave(project)
      }
    } catch (error: any) {
      setSaveMessage(`Failed to save: ${error.toString()}`)

      await message(`Failed to save: ${error.toString()}`, {
        title: "Tilt Orchestrator",
        kind: "error",
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8 dark:from-slate-900 dark:to-slate-800">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div className="flex items-center gap-3">
            {saveMessage && (
              <span
                className={`text-sm ${
                  saveMessage.includes("Failed")
                    ? "text-red-600 dark:text-red-400"
                    : "text-green-600 dark:text-green-400"
                }`}
              >
                {saveMessage}
              </span>
            )}
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Project Info */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              <CardTitle>Project Settings</CardTitle>
            </div>
            <CardDescription>
              Configure your project properties and settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="project-name">Project Name</Label>
                <div className="flex gap-2">
                  <Input
                    id="project-name"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    onBlur={handleProjectNameChange}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Workspace Path</Label>
                <Input
                  value={project.project.workspace_path}
                  disabled
                  className="bg-slate-50 dark:bg-slate-900"
                />
              </div>

              <div className="space-y-2">
                <Label>Tilt Mode</Label>
                <Input
                  value={project.project.tilt.mode}
                  disabled
                  className="bg-slate-50 dark:bg-slate-900"
                />
              </div>

              <div className="space-y-2">
                <Label>Services Path</Label>
                <Input
                  value={project.project.services_path || "repos"}
                  disabled
                  className="bg-slate-50 dark:bg-slate-900"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Environment Tabs */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              <CardTitle>Environments</CardTitle>
            </div>
            <CardDescription>
              Select an environment to configure its settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={selectedEnv} onValueChange={setSelectedEnv}>
              <TabsList className="grid w-full grid-cols-3">
                {Object.keys(project.environments).map((env) => (
                  <TabsTrigger key={env} value={env} className="capitalize">
                    {env}
                  </TabsTrigger>
                ))}
              </TabsList>

              {Object.entries(project.environments).map(
                ([envName, envData]) => (
                  <TabsContent
                    key={envName}
                    value={envName}
                    className="mt-6 space-y-6"
                  >
                    <div className="space-y-4">
                      <div>
                        <h3 className="mb-2 text-lg font-semibold">
                          Environment: {envName}
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          Configure shared environment variables and service
                          settings for {envName}
                        </p>
                      </div>

                      <Separator />

                      {/* Shared Environment Variables */}
                      <EnvVarEditor
                        title="Shared Environment Variables"
                        description="These variables are shared across all services in this environment"
                        envVars={envData.shared_env ?? {}}
                        onChange={handleSharedEnvChange}
                      />

                      {/* Services Info */}
                      <Card className="bg-slate-50 dark:bg-slate-900">
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base">
                              Services
                            </CardTitle>
                            <AddServiceDialog
                              onAddService={handleAddService}
                              existingServices={currentEnv.services}
                              projectServicesPath={`${project.project.workspace_path}/${project.project.services_path || "repos"}`}
                            />
                          </div>
                        </CardHeader>
                        <CardContent>
                          {envData.services.length > 0 ? (
                            <div className="space-y-3">
                              {envData.services.map((service, idx) => (
                                <ServiceCard
                                  key={`${service.name}-${idx}`}
                                  service={service}
                                  onToggle={(enabled) =>
                                    handleToggleService(idx, enabled)
                                  }
                                  onDelete={() => handleDeleteService(idx)}
                                  onEdit={() => handleEditService(idx)}
                                  project={project}
                                />
                              ))}
                            </div>
                          ) : (
                            <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                              No services configured yet. Click "Add Service" to
                              get started.
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>
                )
              )}
            </Tabs>
          </CardContent>
        </Card>

        {editingService && (
          <AddServiceDialog
            onAddService={handleUpdateService}
            initialService={editingService.service}
            isEditing={true}
            onClose={() => setEditingService(null)}
          />
        )}
      </div>
    </div>
  )
}
