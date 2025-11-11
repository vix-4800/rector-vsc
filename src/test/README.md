# Rector VSCode Extension - Tests

This directory contains tests for the Rector VSCode extension.

## Test Structure

- `suite/` - Integration tests that run within VS Code
  - `extension.test.ts` - Tests for extension activation and commands
  - `rectorRunner.test.ts` - Tests for RectorRunner class
  - `diffViewManager.test.ts` - Tests for DiffViewManager class
- `runTest.ts` - Test runner configuration
- `suite/index.ts` - Test suite configuration

## Running Tests

### All Tests

```bash
npm test
```

### Compile and Watch

```bash
npm run watch
```

### Lint

```bash
npm run lint
```

## Test Coverage

The tests cover:

- Extension activation and deactivation
- Command registration
- Configuration settings
- Basic functionality of RectorRunner and DiffViewManager

## Adding New Tests

1. Create a new test file in `src/test/suite/` with `.test.ts` extension
2. Import the necessary modules and use Mocha's `suite` and `test` functions
3. Tests will be automatically discovered and run

Example:

```typescript
import * as assert from 'assert';
import * as vscode from 'vscode';

suite('My Test Suite', () => {
  test('My test', () => {
    assert.strictEqual(1 + 1, 2);
  });
});
```
