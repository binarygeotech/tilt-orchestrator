export interface Service {
  name: string
  path?: string // optional if repo is defined
  port: number
  enabled: boolean
  repo?: {
    url: string
    branch?: string
  }
  docker?: {
    context: string
    dockerfile: string
  }
  k8s?: {
    manifests: string
  }
  env?: Record<string, string>
  depends_on?: string[]
  helm?: {
    chart: string
    values?: Record<string, any>
    namespace?: string
  }
  kustomize?: {
    path: string
  }
}

export interface Project {
  project: {
    name: string
    workspace_path: string
    tilt: { mode: "root" | "per-repo" | "hybrid" }
    services_path?: string
  }
  environments: Record<
    string,
    {
      shared_env: Record<string, string>
      services: Service[]
    }
  >
}
