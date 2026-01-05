import { useEffect, useState } from "react"

import { initializeExistingProject } from "../api/api"
import { Project } from "../types/project"

interface ConfigureExistingProjectProps {
  projectPath: string
  onInitialized: (project: Project) => void
  onCancel: () => void
}

export default function ConfigureExistingProject({
  projectPath,
  onInitialized,
  onCancel,
}: ConfigureExistingProjectProps) {
  const [servicesPath, setServicesPath] = useState("repos")
  const [projectName, setProjectName] = useState("")
  const [isInitializing, setIsInitializing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Extract project name from directory path
    const pathParts = projectPath.split(/[/\\]/)
    const dirName =
      pathParts[pathParts.length - 1] || pathParts[pathParts.length - 2]
    setProjectName(dirName)
  }, [projectPath])

  const handleInitialize = async () => {
    if (!servicesPath.trim()) {
      setError("Services path cannot be empty")
      return
    }

    setIsInitializing(true)
    setError(null)

    try {
      const project = await initializeExistingProject(projectPath, servicesPath)
      const normalizedProject: Project =
        typeof project === "string" ? (JSON.parse(project) as Project) : (project as Project)
      onInitialized(normalizedProject)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to initialize project"
      )
    } finally {
      setIsInitializing(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
        <h1 className="mb-2 text-center text-3xl font-bold">
          Initialize Project for Tilt Orchestrator
        </h1>
        <p className="mb-6 text-center text-gray-600">
          Configure the project settings to get started
        </p>

        <div className="space-y-4">
          <div>
            <label
              htmlFor="projectPath"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Project Path
            </label>
            <input
              id="projectPath"
              type="text"
              value={projectPath}
              disabled
              className="w-full rounded-md border border-gray-300 bg-gray-100 px-3 py-2 text-gray-500"
            />
          </div>

          <div>
            <label
              htmlFor="projectName"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Project Name
            </label>
            <input
              id="projectName"
              type="text"
              value={projectName}
              disabled
              className="w-full rounded-md border border-gray-300 bg-gray-100 px-3 py-2 text-gray-500"
            />
            <p className="mt-1 text-sm text-gray-500">
              Auto-detected from directory name
            </p>
          </div>

          <div>
            <label
              htmlFor="servicesPath"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Services Path
            </label>
            <input
              id="servicesPath"
              type="text"
              value={servicesPath}
              onChange={(e) => setServicesPath(e.target.value)}
              placeholder="e.g., repos, services, src"
              disabled={isInitializing}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
            />
            <p className="mt-1 text-sm text-gray-500">
              Relative path to the directory containing your microservices
            </p>
          </div>

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="rounded-md border border-blue-200 bg-blue-50 p-3">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> If an existing Tiltfile or tilt/ directory
              is found, it will be backed up with a .backup extension.
            </p>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={onCancel}
            disabled={isInitializing}
            className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleInitialize}
            disabled={isInitializing}
            className="flex flex-1 items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isInitializing ? (
              <>
                <svg
                  className="mr-2 -ml-1 h-4 w-4 animate-spin text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Initializing...
              </>
            ) : (
              "Initialize"
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
