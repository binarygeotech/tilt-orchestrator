# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- System tray menu with dynamic project and Tilt status display
- Tray menu controls for Start/Stop/Restart Tilt operations
- Service management from tray menu (Enable/Disable, Open in Editor)
- "Remove from Recent Projects" functionality with confirmation dialog
- Native Tauri splash screen with gradient design
- About page with application features and technology stack
- Two tests for tray API functions (`updateTrayMenu`)
- One test for `removeRecentProject` API function
- Initial project setup with Tauri + React + TypeScript
- Multi-platform desktop application support (macOS, Linux, Windows)
- Project management with multiple environments (dev, staging, prod)
- Service configuration with Docker, Kubernetes, Helm, and Kustomize support
- Real-time Tilt log viewer with auto-scroll
- Git repository cloning with branch selection
- IDE integration for opening services in code editor
- Comprehensive test suites for frontend and backend
- GitHub Actions workflows for automated testing and releases

### Changed
- TrayIconProvider now prevents duplicate tray icon rendering
- ProjectView component requires TrayIconProvider wrapper for proper initialization

### Fixed
- Tray icon duplicate rendering on app reload
- Initial tray icon rendering showing 2 icons
- Test mock path for ProjectView component tests

### Features
- Visual project creation and management
- Multi-environment service configuration
- Template-based Tiltfile and K8s manifest generation
- Auto-generated .env files and ConfigMaps
- Service dependency management and validation
- Tilt process lifecycle management (start/stop/restart)
- Dark/Light theme support
- Settings persistence with auto-load recent projects

### Documentation
- Complete README with setup instructions
- Testing guide (README_TESTS.md)
- Architecture documentation
- Contributing guidelines
- GitHub issue and PR templates

---

## Release Notes

Automated changelogs are generated for each release based on commit history. See the [Releases](https://github.com/binarygeotech/tilt-orchestrator/releases) page for version-specific changes.

### Commit Message Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New features → appears in "Features" section
- `fix:` Bug fixes → appears in "Bug Fixes" section
- `docs:` Documentation → appears in "Documentation" section
- `chore:` Maintenance → appears in "Maintenance" section
- `refactor:` Code refactoring
- `test:` Test additions/updates
- `style:` Code style changes
