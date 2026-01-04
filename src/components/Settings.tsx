import { useEffect, useState } from "react"
import { invoke } from "@tauri-apps/api/core"
import {
  ArrowLeft,
  Code,
  Loader2,
  Save,
  Settings as SettingsIcon,
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
  const [defaultEditor, setDefaultEditor] = useState("")
  const [autoOpenLastProject, setAutoOpenLastProject] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState("")

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const state = await invoke<AppState>("get_app_state")
      setDefaultEditor(state.preferences.default_editor || "")
      setAutoOpenLastProject(state.preferences.auto_open_last_project)
    } catch (error) {
      console.error("Failed to load settings:", error)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setSaveMessage("")

    try {
      await invoke("update_preferences", {
        preferences: {
          auto_open_last_project: autoOpenLastProject,
          default_editor: defaultEditor || null,
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
            {/* Editor Settings */}
            <div className="space-y-4 rounded-lg border p-4">
              <div className="flex items-center gap-2">
                <Code className="h-4 w-4" />
                <h3 className="font-semibold">Code Editor</h3>
              </div>
              <div className="space-y-2">
                <Label htmlFor="default-editor">Default Editor Command</Label>
                <Input
                  id="default-editor"
                  placeholder="code (for VS Code), cursor, subl, etc."
                  value={defaultEditor}
                  onChange={(e) => setDefaultEditor(e.target.value)}
                />
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Enter the command to open your preferred code editor.
                  Examples: <code>code</code> (VS Code), <code>cursor</code>{" "}
                  (Cursor), <code>subl</code> (Sublime Text), <code>vim</code>,
                  etc. Leave empty to use system default.
                </p>
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
                <strong>Tip:</strong> After setting your default editor, you can
                quickly open service directories from the project view or
                management screen using the folder icon on each service card.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
