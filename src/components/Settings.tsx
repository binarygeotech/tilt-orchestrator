import { useEffect, useState } from "react"
import { validateExecutablePath } from "@/api/api"
import { invoke } from "@tauri-apps/api/core"
import {
  ArrowLeft,
  CheckCircle2,
  Code,
  ExternalLink,
  Loader2,
  Save,
  Settings as SettingsIcon,
  Terminal,
  XCircle,
} from "lucide-react"

import { AppState } from "@/types/app"

import { Button } from "./ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card"
import { Checkbox } from "./ui/checkbox"
import { Input } from "./ui/input"
import { Label } from "./ui/label"

interface SettingsProps {
  onBack: () => void
}

export default function Settings({ onBack }: SettingsProps) {
  const [editorPath, setEditorPath] = useState("")
  const [tiltPath, setTiltPath] = useState("")
  const [autoOpenLastProject, setAutoOpenLastProject] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState("")
  const [validatingTilt, setValidatingTilt] = useState(false)
  const [validatingEditor, setValidatingEditor] = useState(false)
  const [tiltValidation, setTiltValidation] = useState<{
    valid: boolean
    version?: string
    error?: string
  } | null>(null)
  const [editorValidation, setEditorValidation] = useState<{
    valid: boolean
    version?: string
    error?: string
  } | null>(null)
  const [currentTiltVersion, setCurrentTiltVersion] = useState<string | null>(
    null
  )

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const state = await invoke<AppState>("get_app_state")
      setEditorPath(state.preferences.editor_path || "")
      setTiltPath(state.preferences.tilt_path || "")
      setAutoOpenLastProject(state.preferences.auto_open_last_project)

      // Validate existing paths and get version
      if (state.preferences.tilt_path) {
        const result = await validateTiltPath(state.preferences.tilt_path)
        if (result) {
          setCurrentTiltVersion(result.version || null)
        }
      }
      if (state.preferences.editor_path) {
        validateEditorPath(state.preferences.editor_path)
      }
    } catch (error) {
      console.error("Failed to load settings:", error)
    }
  }

  const validateTiltPath = async (path: string) => {
    if (!path.trim()) {
      setTiltValidation(null)
      setCurrentTiltVersion(null)
      return null
    }

    setValidatingTilt(true)
    try {
      const rawResult = await validateExecutablePath(path)
      let result: any

      if (typeof rawResult === "string") {
        try {
          result = JSON.parse(rawResult)
        } catch (parseError: any) {
          // Surface parsing issues to the existing error handler
          throw new Error(
            `Failed to parse tilt validation result: ${String(rawResult)}`
          )
        }
      } else {
        // Assume a non-string response is already a parsed object
        result = rawResult
      }
      setTiltValidation({ valid: true, version: result.version })
      setCurrentTiltVersion(result.version)
      return { valid: true, version: result.version }
    } catch (error: any) {
      setTiltValidation({ valid: false, error: error.toString() })
      setCurrentTiltVersion(null)
      return { valid: false, error: error.toString() }
    } finally {
      setValidatingTilt(false)
    }
  }

  const validateEditorPath = async (path: string) => {
    if (!path.trim()) {
      setEditorValidation(null)
      return
    }

    setValidatingEditor(true)
    try {
      const result = await validateExecutablePath(path)
      setEditorValidation({ valid: true, version: result.version })
    } catch (error: any) {
      setEditorValidation({ valid: false, error: error.toString() })
    } finally {
      setValidatingEditor(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setSaveMessage("")

    try {
      await invoke("update_preferences", {
        preferences: {
          auto_open_last_project: autoOpenLastProject,
          default_editor: null,
          tilt_path: tiltPath || null,
          editor_path: editorPath || null,
        },
      })

      setSaveMessage("Settings saved successfully!")
      setTimeout(() => setSaveMessage(""), 3000)
    } catch (error: any) {
      setSaveMessage(`Failed to save: ${error.toString()}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8 dark:from-slate-900 dark:to-slate-800">
      <div className="mx-auto max-w-4xl space-y-6">
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
                  Save Settings
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Settings Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <SettingsIcon className="h-5 w-5" />
              <CardTitle>Application Settings</CardTitle>
            </div>
            <CardDescription>
              Configure your Tilt Orchestrator preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Tilt Settings */}
            <div className="space-y-4 rounded-lg border border-blue-200 bg-blue-50/50 p-4 dark:border-blue-800 dark:bg-blue-950/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Terminal className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <h3 className="font-semibold">Tilt Configuration</h3>
                </div>
                {currentTiltVersion && (
                  <span className="text-xs text-slate-600 dark:text-slate-400">
                    Current: {currentTiltVersion}
                  </span>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="tilt-path">Tilt Executable Path</Label>
                <div className="relative">
                  <Input
                    id="tilt-path"
                    placeholder="/usr/local/bin/tilt or C:\path\to\tilt.exe"
                    value={tiltPath}
                    onChange={(e) => {
                      setTiltPath(e.target.value)
                      setTiltValidation(null)
                    }}
                    onBlur={(e) => validateTiltPath(e.target.value)}
                    className={
                      tiltValidation
                        ? tiltValidation.valid
                          ? "border-green-500"
                          : "border-red-500"
                        : ""
                    }
                  />
                  {validatingTilt && (
                    <Loader2 className="absolute top-3 right-3 h-4 w-4 animate-spin text-slate-400" />
                  )}
                  {!validatingTilt && tiltValidation && (
                    <>
                      {tiltValidation.valid ? (
                        <CheckCircle2 className="absolute top-3 right-3 h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="absolute top-3 right-3 h-4 w-4 text-red-500" />
                      )}
                    </>
                  )}
                </div>
                {tiltValidation && tiltValidation.valid && (
                  <p className="text-xs text-green-600 dark:text-green-400">
                    ✓ Valid Tilt installation: {tiltValidation.version}
                  </p>
                )}
                {tiltValidation && !tiltValidation.valid && (
                  <p className="text-xs text-red-600 dark:text-red-400">
                    ✗ {tiltValidation.error}
                  </p>
                )}
                <div className="space-y-2 rounded-md bg-white p-3 text-xs dark:bg-slate-900">
                  <p className="font-semibold text-slate-700 dark:text-slate-300">
                    How to find your Tilt path:
                  </p>
                  <ul className="ml-4 list-disc space-y-1 text-slate-600 dark:text-slate-400">
                    <li>
                      <strong>macOS/Linux:</strong> Run{" "}
                      <code className="rounded bg-slate-200 px-1 dark:bg-slate-800">
                        which tilt
                      </code>{" "}
                      in Terminal
                    </li>
                    <li>
                      <strong>Windows:</strong> Run{" "}
                      <code className="rounded bg-slate-200 px-1 dark:bg-slate-800">
                        where tilt
                      </code>{" "}
                      in Command Prompt
                    </li>
                  </ul>
                  <div className="mt-2 border-t pt-2">
                    <p className="font-semibold text-slate-700 dark:text-slate-300">
                      Don't have Tilt installed?
                    </p>
                    <ul className="ml-4 list-disc space-y-1 text-slate-600 dark:text-slate-400">
                      <li>
                        <strong>macOS:</strong>{" "}
                        <code className="rounded bg-slate-200 px-1 dark:bg-slate-800">
                          brew install tilt-dev/tap/tilt
                        </code>
                      </li>
                      <li>
                        <strong>Linux:</strong>{" "}
                        <code className="rounded bg-slate-200 px-1 dark:bg-slate-800">
                          curl -fsSL
                          https://raw.githubusercontent.com/tilt-dev/tilt/master/scripts/install.sh
                          | bash
                        </code>
                      </li>
                      <li className="flex items-center gap-1">
                        <strong>Windows/Others:</strong> Visit{" "}
                        <a
                          href="https://docs.tilt.dev/install.html"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-blue-600 hover:underline dark:text-blue-400"
                        >
                          docs.tilt.dev/install.html
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Editor Settings */}
            <div className="space-y-4 rounded-lg border p-4">
              <div className="flex items-center gap-2">
                <Code className="h-4 w-4" />
                <h3 className="font-semibold">Code Editor</h3>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="editor-path">Editor Executable Path</Label>
                  <div className="relative">
                    <Input
                      id="editor-path"
                      placeholder="/usr/local/bin/code or C:\Program Files\...\Code.exe"
                      value={editorPath}
                      onChange={(e) => {
                        setEditorPath(e.target.value)
                        setEditorValidation(null)
                      }}
                      onBlur={(e) => validateEditorPath(e.target.value)}
                      className={
                        editorValidation
                          ? editorValidation.valid
                            ? "border-green-500"
                            : "border-red-500"
                          : ""
                      }
                    />
                    {validatingEditor && (
                      <Loader2 className="absolute top-3 right-3 h-4 w-4 animate-spin text-slate-400" />
                    )}
                    {!validatingEditor && editorValidation && (
                      <>
                        {editorValidation.valid ? (
                          <CheckCircle2 className="absolute top-3 right-3 h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="absolute top-3 right-3 h-4 w-4 text-red-500" />
                        )}
                      </>
                    )}
                  </div>
                  {editorValidation && editorValidation.valid && (
                    <p className="text-xs text-green-600 dark:text-green-400">
                      ✓ Valid editor: {editorValidation.version}
                    </p>
                  )}
                  {editorValidation && !editorValidation.valid && (
                    <p className="text-xs text-red-600 dark:text-red-400">
                      ✗ {editorValidation.error}
                    </p>
                  )}
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Full path to your code editor executable. Use{" "}
                    <code>which code</code> (macOS/Linux) or{" "}
                    <code>where code</code> (Windows) to find it.
                  </p>
                </div>
              </div>
            </div>

            {/* Project Settings */}
            <div className="space-y-4 rounded-lg border p-4">
              <div className="flex items-center gap-2">
                <SettingsIcon className="h-4 w-4" />
                <h3 className="font-semibold">Project Preferences</h3>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="auto-open"
                  checked={autoOpenLastProject}
                  onCheckedChange={(checked) =>
                    setAutoOpenLastProject(!!checked)
                  }
                />
                <Label htmlFor="auto-open" className="cursor-pointer">
                  Automatically open the most recent project on startup
                </Label>
              </div>
            </div>

            {/* Info Section */}
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                <strong>Tip:</strong> Configure Tilt and Editor paths for
                seamless integration. The app will automatically use these paths
                when starting Tilt or opening service directories.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
