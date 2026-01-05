# Tilt Installation Check

This document describes the Tilt installation detection and configuration feature in Tilt Orchestrator.

![Settings Screen](../screenshots/settings.png)

## Backend Implementation

The backend now includes:
1. `check_tilt_installed()` - Checks if Tilt is installed using `which` (Unix/macOS) or `where` (Windows)
2. `start_tilt()` - Automatically checks for Tilt before starting and provides a helpful error message

## Frontend API

```typescript
import { checkTiltInstalled } from "./api/api"
import { TiltInstallation } from "./types/tilt"

// Check if Tilt is installed
const installation: TiltInstallation = await checkTiltInstalled()

if (installation.installed) {
  console.log(`Tilt is installed at: ${installation.path}`)
  console.log(`Version: ${installation.version}`)
} else {
  // Show installation guide
  alert("Tilt is not installed. Please install it from https://docs.tilt.dev/install.html")
}
```

## Example Usage in Component

```typescript
import { useEffect, useState } from "react"
import { checkTiltInstalled } from "../api/api"
import { TiltInstallation } from "../types/tilt"

function TiltChecker() {
  const [installation, setInstallation] = useState<TiltInstallation | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkTiltInstalled()
      .then(setInstallation)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div>Checking Tilt installation...</div>

  if (!installation?.installed) {
    return (
      <div className="alert alert-warning">
        <h3>Tilt is not installed</h3>
        <p>
          Please install Tilt to use this application.
          Visit{" "}
          <a
            href="https://docs.tilt.dev/install.html"
            target="_blank"
            rel="noopener noreferrer"
          >
            docs.tilt.dev/install.html
          </a>
        </p>
        <h4>Installation Instructions:</h4>
        <ul>
          <li>
            <strong>macOS:</strong> <code>brew install tilt-dev/tap/tilt</code>
          </li>
          <li>
            <strong>Linux:</strong> <code>curl -fsSL https://raw.githubusercontent.com/tilt-dev/tilt/master/scripts/install.sh | bash</code>
          </li>
          <li>
            <strong>Windows:</strong> <code>iex ((new-object net.webclient).DownloadString('https://raw.githubusercontent.com/tilt-dev/tilt/master/scripts/install.ps1'))</code>
          </li>
        </ul>
      </div>
    )
  }

  return (
    <div className="alert alert-success">
      <h3>✓ Tilt is installed</h3>
      <p>Path: {installation.path}</p>
      {installation.version && <p>Version: {installation.version}</p>}
    </div>
  )
}

export default TiltChecker
```

## Error Handling

When starting Tilt, if it's not installed, the error message will be:
```
Tilt is not installed. Please install Tilt from https://docs.tilt.dev/install.html
```

This error can be caught and displayed to the user with installation instructions.

## Permissions

The following shell commands are now allowed in the Tauri capabilities:
- `tilt` - To run Tilt
- `which` - To find Tilt path on Unix/macOS
- `where` - To find Tilt path on Windows
- `kill`, `tasklist`, `taskkill` - For process management
