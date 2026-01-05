# Tilt and Editor Path Configuration Feature

## Overview

Added comprehensive configuration for Tilt and Code Editor executable paths with validation. The app now checks for Tilt configuration on startup and guides users through setup.

![Settings Screen with Configuration](../screenshots/settings.png)

## Backend Changes

### 1. App State Model (`src-tauri/src/app_state/model.rs`)
Added new fields to `Preferences`:
- `tilt_path: Option<String>` - Full path to Tilt executable
- `editor_path: Option<String>` - Full path to code editor executable

### 2. Tilt Manager (`src-tauri/src/backend/tilt_manager.rs`)
- Added `validate_executable_path()` - Validates any executable by checking its version
- Updated `start_tilt()` - Now accepts optional `tilt_path_override` parameter
  - Validates provided path before use
  - Falls back to auto-detection if no path provided
  - Shows helpful error if Tilt not found
- Updated `restart_tilt()` - Passes tilt_path to start function

### 3. IPC Handler (`src-tauri/src/backend/ipc.rs`)
- Added `validateExecutablePath` command - Validates executable paths from frontend
- Updated `startTilt` - Loads tilt_path from app state and passes to function
- Updated `restartTilt` - Loads tilt_path from app state
- Updated `openInEditor` - Uses editor_path with fallback to default_editor
  - Priority: explicit param > editor_path > default_editor

## Frontend Changes

### 1. Types (`src/types/app.ts`)
Updated `AppState.preferences` interface:
```typescript
preferences: {
  auto_open_last_project: boolean
  default_editor?: string | null
  tilt_path?: string | null        // New
  editor_path?: string | null      // New
}
```

### 2. API (`src/api/api.ts`)
Added `validateExecutablePath(path: string)` - Validates executable paths with version check

### 3. Settings Component (`src/components/Settings.tsx`)
Complete redesign with:

**Tilt Configuration Section:**
- Input field for Tilt executable path
- Real-time validation with visual feedback (green/red border, icons)
- Shows version info on successful validation
- Comprehensive installation instructions
  - How to find Tilt path (which/where commands)
  - Installation commands for macOS, Linux, Windows
  - Link to official documentation

**Editor Configuration Section:**
- Input field for Editor executable path with validation
- Fallback to Default Editor Command field
- Real-time validation with visual feedback
- Instructions for finding editor path

**Visual Indicators:**
- Loading spinner during validation
- CheckCircle (green) for valid paths
- XCircle (red) for invalid paths
- Version display for validated executables

### 4. App Startup (`src/App.tsx`)
Added `checkTiltConfiguration()` on app start:
- Loads app state
- If `tilt_path` is set:
  - Validates the path
  - If invalid: Shows warning dialog and opens Settings
- If `tilt_path` is not set:
  - Shows info dialog and opens Settings
- User cannot proceed without valid Tilt configuration

## User Flow

### First Launch (No Tilt Configured):
1. App starts
2. Dialog: "Please configure the Tilt executable path in Settings..."
3. Settings page opens automatically
4. User enters Tilt path (or follows installation instructions)
5. Path validated in real-time
6. User saves settings
7. Can now use the app

### Subsequent Launches (Tilt Configured):
1. App starts
2. Validates configured Tilt path
3. If valid: Proceeds normally
4. If invalid: Shows warning and opens Settings

### Running Tilt:
- Uses configured `tilt_path` from settings
- Falls back to auto-detection if not configured
- Shows clear error if Tilt not found

### Opening Editor:
- Priority: explicit editor param > `editor_path` > `default_editor`
- Allows per-action override while respecting global config

## Installation Instructions Included

### macOS:
```bash
# Find Tilt
which tilt

# Install Tilt
brew install tilt-dev/tap/tilt
```

### Linux:
```bash
# Find Tilt
which tilt

# Install Tilt
curl -fsSL https://raw.githubusercontent.com/tilt-dev/tilt/master/scripts/install.sh | bash
```

### Windows:
```cmd
REM Find Tilt
where tilt

REM Install Tilt (PowerShell)
iex ((new-object net.webclient).DownloadString('https://raw.githubusercontent.com/tilt-dev/tilt/master/scripts/install.ps1'))
```

## Validation Logic

Both Tilt and Editor paths are validated by:
1. Attempting to run `<path> version`
2. Checking if command succeeds
3. Capturing version output
4. Displaying validation result to user

This ensures:
- Path points to a real executable
- Executable is accessible
- Executable responds to version command
- User gets immediate feedback

## Benefits

1. **User-Friendly**: Clear guidance and error messages
2. **Robust**: Validates all paths before use
3. **Flexible**: Supports custom installations and multiple editors
4. **Educational**: Teaches users how to find paths and install tools
5. **Reliable**: Prevents runtime errors from missing executables
6. **Cross-Platform**: Works on macOS, Linux, and Windows

## Testing

1. Start app without Tilt configured → Opens Settings automatically
2. Enter invalid Tilt path → Shows error with red indicator
3. Enter valid Tilt path → Shows success with green checkmark and version
4. Save settings → Settings persisted
5. Start Tilt → Uses configured path
6. Open editor → Uses configured editor path

## Future Enhancements

- Auto-detect Tilt on first launch
- Multiple Tilt versions support
- Editor workspace settings override
- Path history/suggestions
