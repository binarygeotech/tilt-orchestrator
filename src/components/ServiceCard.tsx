import {
  Database as DatabaseIcon,
  GitBranch,
  Package,
  Settings,
  Trash2,
} from "lucide-react"

import { Service } from "@/types/project"

import { Badge } from "./ui/badge"
import { Button } from "./ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Switch } from "./ui/switch"

interface ServiceCardProps {
  service: Service
  onToggle: (enabled: boolean) => void
  onDelete: () => void
  onEdit?: () => void
  project: any // Full project object for IPC
}

export default function ServiceCard({
  service,
  onToggle,
  onDelete,
  onEdit,
}: ServiceCardProps) {
  const getDeploymentType = () => {
    if (service.docker) return { type: "Docker", icon: Package }
    if (service.k8s) return { type: "Kubernetes", icon: DatabaseIcon }
    if (service.helm) return { type: "Helm", icon: Package }
    if (service.kustomize) return { type: "Kustomize", icon: Package }
    return { type: "Unknown", icon: Package }
  }

  const deployment = getDeploymentType()
  const DeploymentIcon = deployment.icon

  return (
    <Card
      className={`transition-opacity ${!service.enabled ? "opacity-60" : ""}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <DeploymentIcon className="h-5 w-5 text-slate-600 dark:text-slate-400" />
            <div>
              <CardTitle className="text-base">{service.name}</CardTitle>
              <div className="mt-1 flex gap-2">
                <Badge variant="outline" className="text-xs">
                  {deployment.type}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  Port: {service.port}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={service.enabled} onCheckedChange={onToggle} />
            {onEdit && (
              <Button variant="ghost" size="icon" onClick={onEdit}>
                <Settings className="h-4 w-4" />
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={onDelete}>
              <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        {service.repo && (
          <div className="space-y-1 text-sm">
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
              <GitBranch className="h-3 w-3" />
              <span className="font-medium">Repo:</span>
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
        {service.path && (
          <div className="text-sm text-slate-600 dark:text-slate-400">
            <span className="font-medium">Local Path:</span> {service.path}
          </div>
        )}
        {service.depends_on && service.depends_on.length > 0 && (
          <div className="text-sm text-slate-600 dark:text-slate-400">
            <span className="font-medium">Dependencies:</span>{" "}
            {service.depends_on.map((dep) => (
              <Badge key={dep} variant="outline" className="ml-1 text-xs">
                {dep}
              </Badge>
            ))}
          </div>
        )}
        {service.env && Object.keys(service.env).length > 0 && (
          <div className="text-sm text-slate-600 dark:text-slate-400">
            <span className="font-medium">Env vars:</span>{" "}
            {Object.keys(service.env).length}
          </div>
        )}
        {service.docker && (
          <div className="text-sm text-slate-600 dark:text-slate-400">
            <span className="font-medium">Dockerfile:</span>{" "}
            {service.docker.dockerfile}
          </div>
        )}
        {service.helm && (
          <div className="text-sm text-slate-600 dark:text-slate-400">
            <span className="font-medium">Chart:</span> {service.helm.chart}
          </div>
        )}
        {service.k8s && (
          <div className="text-sm text-slate-600 dark:text-slate-400">
            <span className="font-medium">Manifests:</span>{" "}
            {service.k8s.manifests}
          </div>
        )}
        {service.kustomize && (
          <div className="text-sm text-slate-600 dark:text-slate-400">
            <span className="font-medium">Kustomize:</span>{" "}
            {service.kustomize.path}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
