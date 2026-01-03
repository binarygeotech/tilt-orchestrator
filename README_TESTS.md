# Testing Guide

This project includes comprehensive test suites for both frontend and backend code.

## Frontend Tests

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with UI
npm test:ui

# Run tests with coverage
npm test:coverage
```

### Test Files

- `src/tests/setup.ts` - Test setup and configuration
- `src/tests/api.test.ts` - API function tests
- `src/tests/components/ProjectView.test.tsx` - ProjectView component tests

### Technologies

- **Vitest**: Fast unit test framework
- **React Testing Library**: Component testing utilities
- **jsdom**: DOM implementation for Node.js

## Backend Tests

### Running Tests

```bash
cd src-tauri

# Run all tests
cargo test

# Run specific test module
cargo test generator_tests
cargo test tilt_manager_tests
cargo test project_manager_tests

# Run tests with output
cargo test -- --nocapture

# Run tests in parallel
cargo test -- --test-threads=4
```

### Test Files

- `src/backend/generator_tests.rs` - Tiltfile and K8s manifest generation tests
- `src/backend/tilt_manager_tests.rs` - Tilt process management tests
- `src/backend/project_manager_tests.rs` - Project CRUD operations tests (placeholder)

### Test Coverage

Backend tests cover:

#### Generator Tests
- Template rendering with placeholder replacement
- Root Tiltfile generation
- Service Tiltfile generation with Docker/K8s sections
- Service dependency handling
- Environment file generation
- K8s deployment YAML generation with ConfigMap, Deployment, and Service
- Resource limits and requests
- Service name handling (hyphens vs underscores)
- Shared environment variable merging

#### Tilt Manager Tests
- Log file path formatting
- Log retrieval with and without limits
- Empty and non-existent log file handling
- Tilt status serialization
- Multiple environment support

#### Project Manager Tests (Placeholder)
- Project creation with default environments
- Project file persistence
- Opening existing projects
- Updating project configuration
- Adding/removing environments
- Adding/updating/removing services
- Shared environment variable management

## Writing New Tests

### Frontend

Create test files with `.test.ts` or `.test.tsx` extension:

```typescript
import { describe, it, expect } from 'vitest'

describe('MyComponent', () => {
  it('should render correctly', () => {
    // Test implementation
  })
})
```

### Backend

Add test modules at the bottom of Rust files or in separate `*_tests.rs` files:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_my_function() {
        // Test implementation
    }

    #[tokio::test]
    async fn test_async_function() {
        // Async test implementation
    }
}
```

## Continuous Integration

Tests can be integrated into CI/CD pipelines:

```yaml
# GitHub Actions example
- name: Run frontend tests
  run: npm test

- name: Run backend tests
  run: cd src-tauri && cargo test
```

## Test Dependencies

### Frontend
- `vitest` - Test runner
- `@testing-library/react` - React component testing
- `@testing-library/jest-dom` - Custom matchers
- `jsdom` - DOM environment

### Backend
- `tempfile` - Temporary directories for testing
- `tokio-test` - Async testing utilities

## Best Practices

1. **Isolation**: Each test should be independent and not rely on others
2. **Cleanup**: Use `beforeEach`/`afterEach` (frontend) or proper setup/teardown (backend)
3. **Mocking**: Mock external dependencies (Tauri IPC, file system when appropriate)
4. **Coverage**: Aim for high coverage of critical paths
5. **Speed**: Keep tests fast - use in-memory operations when possible
6. **Descriptive**: Use clear test names that describe what is being tested
