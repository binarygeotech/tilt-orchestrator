import * as matchers from "@testing-library/jest-dom/matchers"
import { cleanup } from "@testing-library/react"
import { afterEach, beforeEach, expect, vi } from "vitest"

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers)

// Mock Tauri API
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}))

// Mock Tauri Event API
vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(() => Promise.resolve(() => {})),
}))

// Mock Tauri Dialog API
vi.mock("@tauri-apps/plugin-dialog", () => ({
  ask: vi.fn(() => Promise.resolve(true)),
  message: vi.fn(() => Promise.resolve()),
}))

// Mock window.__TAURI_INTERNALS__
beforeEach(() => {
  Object.defineProperty(window, "__TAURI_INTERNALS__", {
    value: {
      invoke: vi.fn(),
      transformCallback: vi.fn((callback) => callback),
    },
    writable: true,
    configurable: true,
  })
})

// Cleanup after each test
afterEach(() => {
  cleanup()
})
