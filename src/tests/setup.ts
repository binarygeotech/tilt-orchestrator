import * as matchers from "@testing-library/jest-dom/matchers"
import { cleanup } from "@testing-library/react"
import { afterEach, expect, vi } from "vitest"

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers)

// Mock Tauri API
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}))

// Cleanup after each test
afterEach(() => {
  cleanup()
})
