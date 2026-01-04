import { useEffect, useMemo, useState } from "react"
import { cloneRepo } from "@/api/api"
import { Download, GitBranch, Loader2, Plus, Trash2 } from "lucide-react"

import { Service } from "@/types/project"

import { Button } from "./ui/button"
import { Checkbox } from "./ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select"

interface AddServiceDialogProps {
  onAddService: (service: Service) => void
  existingServices?: Service[]
  projectServicesPath?: string
  initialService?: Service
  isEditing?: boolean
  onClose?: () => void
}

export default function AddServiceDialog({
  onAddService,
  existingServices = [],
  projectServicesPath = "",
  initialService,
  isEditing = false,
  onClose,
}: AddServiceDialogProps) {
  const [open, setOpen] = useState(isEditing)
  const [service, setService] = useState<Partial<Service>>(
    initialService || {
      name: "",
      port: 8080,
      enabled: true,
      env: {},
      repo: { url: "", branch: "main" },
    }
  )
  const [deploymentTypes, setDeploymentTypes] = useState<
    Array<"docker" | "k8s" | "helm" | "kustomize">
  >([])
  const [envVars, setEnvVars] = useState<Array<{ key: string; value: string }>>(
    []
  )
  const [dependencies, setDependencies] = useState<string[]>([])
  const [shouldClone, setShouldClone] = useState(true)
  const [isCloning, setIsCloning] = useState(false)
  const [cloneError, setCloneError] = useState<string>("")
  const [hasRepo, setHasRepo] = useState<boolean>(false)

  // Initialize form when editing
  useEffect(() => {
    if (initialService) {
      setService(initialService)
      setOpen(true)

      // Set deployment types
      const types: Array<"docker" | "k8s" | "helm" | "kustomize"> = []
      if (initialService.docker) types.push("docker")
      if (initialService.k8s) types.push("k8s")
      if (initialService.helm) types.push("helm")
      if (initialService.kustomize) types.push("kustomize")
      setDeploymentTypes(types)

      // Set env vars
      if (initialService.env) {
        setEnvVars(
          Object.entries(initialService.env).map(([key, value]) => ({
            key,
            value,
          }))
        )
      }

      // Set dependencies
      if (initialService.depends_on) {
        setDependencies(initialService.depends_on)
      }

      // Set repo flag
      setHasRepo(!!initialService.repo)
    }
  }, [initialService])

  const servicePath = useMemo(() => {
    return `${projectServicesPath}/${service.name}`
  }, [projectServicesPath, service.name])

  const handleAddEnvVar = () => {
    setEnvVars([...envVars, { key: "", value: "" }])
  }

  const handleRemoveEnvVar = (index: number) => {
    setEnvVars(envVars.filter((_, i) => i !== index))
  }

  const handleEnvVarChange = (
    index: number,
    field: "key" | "value",
    value: string
  ) => {
    const updated = [...envVars]
    updated[index][field] = value
    setEnvVars(updated)
  }

  const handleAddDependency = (serviceName: string) => {
    if (serviceName && !dependencies.includes(serviceName)) {
      setDependencies([...dependencies, serviceName])
    }
  }

  const handleRemoveDependency = (serviceName: string) => {
    setDependencies(dependencies.filter((d) => d !== serviceName))
  }

  const handleSubmit = async () => {
    if (!service.name || (hasRepo && !service.repo?.url)) {
      return
    }

    setCloneError("")

    // Clone repository if needed
    if (hasRepo && shouldClone && service.repo?.url) {
      setIsCloning(true)
      try {
        const targetPath = servicePath
        await cloneRepo(service.repo.url, targetPath, service.repo.branch)
      } catch (error: any) {
        setCloneError(`Failed to clone repository: ${error}`)
        setIsCloning(false)
        return
      }
      setIsCloning(false)
    }

    const env = envVars.reduce(
      (acc, { key, value }) => {
        if (key) acc[key] = value
        return acc
      },
      {} as Record<string, string>
    )

    const newService: Service = {
      name: service.name || "",
      port: service.port || 8080,
      enabled: service.enabled !== false,
      env,
      depends_on: dependencies.length > 0 ? dependencies : undefined,
      path: service.path || (shouldClone ? service.name : undefined),
      repo: hasRepo ? service.repo : undefined,
    }

    // Add all selected deployment configs
    if (deploymentTypes.includes("docker") && service.docker) {
      newService.docker = service.docker
    }
    if (deploymentTypes.includes("k8s") && service.k8s) {
      newService.k8s = service.k8s
    }
    if (deploymentTypes.includes("helm") && service.helm) {
      newService.helm = service.helm
    }
    if (deploymentTypes.includes("kustomize") && service.kustomize) {
      newService.kustomize = service.kustomize
    }

    onAddService(newService)

    // Reset form
    setService({
      name: "",
      port: 8080,
      enabled: true,
      env: {},
      repo: { url: "", branch: "main" },
    })
    setEnvVars([])
    setDependencies([])
    setDeploymentTypes([])
    setShouldClone(true)
    setCloneError("")
    setOpen(false)

    if (isEditing && onClose) {
      onClose()
    }
  }

  const handleCancel = () => {
    setOpen(false)
    if (isEditing && onClose) {
      onClose()
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        setOpen(newOpen)
        if (!newOpen && isEditing && onClose) {
          onClose()
        }
      }}
    >
      {!isEditing && (
        <DialogTrigger asChild>
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add Service
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Service" : "Add New Service"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the service configuration"
              : "Configure a new service for this environment"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="service-name">Service Name *</Label>
              <Input
                id="service-name"
                placeholder="my-service"
                value={service.name}
                onChange={(e) =>
                  setService({ ...service, name: e.target.value })
                }
                disabled={isEditing}
                className={isEditing ? "bg-slate-50 dark:bg-slate-900" : ""}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="service-port">Port *</Label>
              <Input
                id="service-port"
                type="number"
                placeholder="8080"
                value={service.port}
                onChange={(e) =>
                  setService({
                    ...service,
                    port: parseInt(e.target.value) || 8080,
                  })
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="service-path">Local Path (optional)</Label>
            <Input
              id="service-path"
              placeholder={`${servicePath}${service.name ? "" : "my-service"}`}
              value={service.path || ""}
              onChange={(e) => setService({ ...service, path: e.target.value })}
            />
            {cloneError && (
              <p className="text-sm text-red-600 dark:text-red-400">
                {cloneError}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="has-repo"
                checked={hasRepo}
                onCheckedChange={(checked) => setHasRepo(!!checked)}
              />
              <Label
                htmlFor="has-repo"
                className="flex cursor-pointer items-center gap-2"
              >
                Service is from an existing git repository
              </Label>
            </div>
          </div>

          {/* Repository Info */}
          {hasRepo && (
            <div className="space-y-4 rounded-lg border bg-slate-50 p-4 dark:bg-slate-900">
              <div className="flex items-center gap-2">
                <GitBranch className="h-4 w-4" />
                <h4 className="font-medium">Repository Configuration *</h4>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="repo-url">Repository URL *</Label>
                  <Input
                    id="repo-url"
                    placeholder="https://github.com/org/repo.git"
                    value={service.repo?.url || ""}
                    onChange={(e) =>
                      setService({
                        ...service,
                        repo: {
                          url: e.target.value,
                          branch: service.repo?.branch || "main",
                        },
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="repo-branch">Branch</Label>
                  <Input
                    id="repo-branch"
                    placeholder="main"
                    value={service.repo?.branch || "main"}
                    onChange={(e) =>
                      setService({
                        ...service,
                        repo: {
                          url: service.repo?.url || "",
                          branch: e.target.value,
                        },
                      })
                    }
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="should-clone"
                    checked={shouldClone}
                    onCheckedChange={(checked) => setShouldClone(!!checked)}
                  />
                  <Label
                    htmlFor="should-clone"
                    className="flex cursor-pointer items-center gap-2"
                  >
                    <Download className="h-3 w-3" />
                    Clone repository when adding service
                  </Label>
                </div>
                {cloneError && (
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {cloneError}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Deployment Types */}
          <div className="space-y-3 rounded-lg border p-4">
            <Label>Deployment Types (select one or more)</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="docker-type"
                  checked={deploymentTypes.includes("docker")}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setDeploymentTypes([...deploymentTypes, "docker"])
                      if (!service.docker) {
                        setService({
                          ...service,
                          docker: { context: ".", dockerfile: "Dockerfile" },
                        })
                      }
                    } else {
                      setDeploymentTypes(
                        deploymentTypes.filter((t) => t !== "docker")
                      )
                    }
                  }}
                />
                <Label htmlFor="docker-type" className="cursor-pointer">
                  Docker
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="k8s-type"
                  checked={deploymentTypes.includes("k8s")}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setDeploymentTypes([...deploymentTypes, "k8s"])
                      if (!service.k8s) {
                        setService({ ...service, k8s: { manifests: "k8s" } })
                      }
                    } else {
                      setDeploymentTypes(
                        deploymentTypes.filter((t) => t !== "k8s")
                      )
                    }
                  }}
                />
                <Label htmlFor="k8s-type" className="cursor-pointer">
                  Kubernetes
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="helm-type"
                  checked={deploymentTypes.includes("helm")}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setDeploymentTypes([...deploymentTypes, "helm"])
                      if (!service.helm) {
                        setService({
                          ...service,
                          helm: { chart: "", namespace: "default" },
                        })
                      }
                    } else {
                      setDeploymentTypes(
                        deploymentTypes.filter((t) => t !== "helm")
                      )
                    }
                  }}
                />
                <Label htmlFor="helm-type" className="cursor-pointer">
                  Helm
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="kustomize-type"
                  checked={deploymentTypes.includes("kustomize")}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setDeploymentTypes([...deploymentTypes, "kustomize"])
                      if (!service.kustomize) {
                        setService({
                          ...service,
                          kustomize: { path: "kustomize" },
                        })
                      }
                    } else {
                      setDeploymentTypes(
                        deploymentTypes.filter((t) => t !== "kustomize")
                      )
                    }
                  }}
                />
                <Label htmlFor="kustomize-type" className="cursor-pointer">
                  Kustomize
                </Label>
              </div>
            </div>
          </div>

          {/* Deployment Config */}
          {deploymentTypes.includes("docker") && (
            <div className="space-y-4 rounded-lg border bg-blue-50 p-4 dark:bg-blue-950">
              <h4 className="font-medium">Docker Configuration</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Context Path *</Label>
                  <Input
                    placeholder="."
                    value={service.docker?.context || ""}
                    onChange={(e) =>
                      setService({
                        ...service,
                        docker: {
                          context: e.target.value,
                          dockerfile: service.docker?.dockerfile || "",
                        },
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Dockerfile Name *</Label>
                  <Input
                    placeholder="Dockerfile"
                    value={service.docker?.dockerfile || ""}
                    onChange={(e) =>
                      setService({
                        ...service,
                        docker: {
                          dockerfile: e.target.value,
                          context: service.docker?.context || "",
                        },
                      })
                    }
                  />
                </div>
              </div>
            </div>
          )}

          {deploymentTypes.includes("k8s") && (
            <div className="space-y-4 rounded-lg border bg-green-50 p-4 dark:bg-green-950">
              <h4 className="font-medium">Kubernetes Configuration</h4>
              <div className="space-y-2">
                <Label>Manifests Path</Label>
                <Input
                  placeholder="k8s"
                  value={service.k8s?.manifests || ""}
                  onChange={(e) =>
                    setService({
                      ...service,
                      k8s: { manifests: e.target.value },
                    })
                  }
                />
              </div>
            </div>
          )}

          {deploymentTypes.includes("helm") && (
            <div className="space-y-4 rounded-lg border bg-purple-50 p-4 dark:bg-purple-950">
              <h4 className="font-medium">Helm Configuration</h4>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Chart *</Label>
                  <Input
                    placeholder="my-chart"
                    value={service.helm?.chart || ""}
                    onChange={(e) =>
                      setService({
                        ...service,
                        helm: {
                          chart: e.target.value,
                          namespace: service.helm?.namespace || "default",
                        },
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Namespace *</Label>
                  <Input
                    placeholder="default"
                    value={service.helm?.namespace || ""}
                    onChange={(e) =>
                      setService({
                        ...service,
                        helm: {
                          chart: service.helm?.chart || "",
                          namespace: e.target.value,
                        },
                      })
                    }
                  />
                </div>
              </div>
            </div>
          )}

          {deploymentTypes.includes("kustomize") && (
            <div className="space-y-4 rounded-lg border bg-orange-50 p-4 dark:bg-orange-950">
              <h4 className="font-medium">Kustomize Configuration</h4>
              <div className="space-y-2">
                <Label>Kustomization Path *</Label>
                <Input
                  placeholder="kustomize"
                  value={service.kustomize?.path || ""}
                  onChange={(e) =>
                    setService({
                      ...service,
                      kustomize: { path: e.target.value },
                    })
                  }
                />
              </div>
            </div>
          )}

          {/* Dependencies */}
          <div className="space-y-2">
            <Label>Dependencies</Label>
            <div className="mb-2 flex flex-wrap gap-2">
              {dependencies.map((dep) => (
                <div
                  key={dep}
                  className="flex items-center gap-1 rounded bg-slate-100 px-2 py-1 dark:bg-slate-800"
                >
                  <span className="text-sm">{dep}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0"
                    onClick={() => handleRemoveDependency(dep)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
            <Select onValueChange={handleAddDependency}>
              <SelectTrigger>
                <SelectValue placeholder="Select service dependency" />
              </SelectTrigger>
              <SelectContent>
                {existingServices
                  .filter(
                    (s) =>
                      s.name !== service.name && !dependencies.includes(s.name)
                  )
                  .map((s) => (
                    <SelectItem key={s.name} value={s.name}>
                      {s.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* Environment Variables */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Service Environment Variables</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddEnvVar}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Variable
              </Button>
            </div>
            <div className="space-y-2">
              {envVars.map((envVar, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    placeholder="KEY"
                    value={envVar.key}
                    onChange={(e) =>
                      handleEnvVarChange(index, "key", e.target.value)
                    }
                  />
                  <Input
                    placeholder="value"
                    value={envVar.value}
                    onChange={(e) =>
                      handleEnvVarChange(index, "value", e.target.value)
                    }
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveEnvVar(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Enabled Toggle */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="enabled"
              checked={service.enabled !== false}
              onCheckedChange={(checked) =>
                setService({ ...service, enabled: !!checked })
              }
            />
            <Label htmlFor="enabled" className="cursor-pointer">
              Enable this service
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isCloning}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              !service.name || (hasRepo && !service.repo?.url) || isCloning
            }
          >
            {isCloning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Cloning Repository...
              </>
            ) : isEditing ? (
              "Update Service"
            ) : (
              "Add Service"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
