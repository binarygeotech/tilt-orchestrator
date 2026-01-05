import { useState, useEffect } from "react"
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
    const dirName = pathParts[pathParts.length - 1] || pathParts[pathParts.length - 2]
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
      onInitialized(JSON.parse(project as any))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to initialize project")
    } finally {
      setIsInitializing(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-md p-8">
        <h1 className="text-3xl font-bold text-center mb-2">
          Initialize Project for Tilt Orchestrator
        </h1>
        <p className="text-gray-600 text-center mb-6">
          Configure the project settings to get started
        </p>

        <div className="space-y-4">
          <div>
            <label
              htmlFor="projectPath"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Project Path
            </label>
            <input
              id="projectPath"
              type="text"
              value={projectPath}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-500"
            />
          </div>

          <div>
            <label
              htmlFor="projectName"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Project Name
            </label>
            <input
              id="projectName"
              type="text"
              value={projectName}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-500"
            />
            <p className="text-sm text-gray-500 mt-1">
              Auto-detected from directory name
            </p>
          </div>

          <div>
            <label
              htmlFor="servicesPath"
              className="block text-sm font-medium text-gray-700 mb-1"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-sm text-gray-500 mt-1">
              Relative path to the directory containing your microservices
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> If an existing Tiltfile or tilt/ directory is found,
              it will be backed up with a .backup extension.
            </p>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onCancel}
            disabled={isInitializing}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleInitialize}
            disabled={isInitializing}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isInitializing ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
