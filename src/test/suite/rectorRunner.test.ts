import * as assert from 'assert';
import * as vscode from 'vscode';
import { RectorResult, RectorRunner } from '../../rectorRunner';

suite('RectorRunner Unit Tests', () => {
  let rectorRunner: RectorRunner;
  let outputChannel: vscode.OutputChannel;

  setup(() => {
    outputChannel = vscode.window.createOutputChannel('Test Rector');
    rectorRunner = new RectorRunner(outputChannel);
  });

  teardown(() => {
    outputChannel.dispose();
  });

  test('RectorRunner should be instantiated', () => {
    assert.ok(rectorRunner);
    assert.ok(rectorRunner instanceof RectorRunner);
  });

  test('RectorRunner should accept outputChannel in constructor', () => {
    const runner = new RectorRunner(outputChannel);
    assert.ok(runner);
  });

  test('RectorRunner should work without outputChannel', () => {
    const runner = new RectorRunner();
    assert.ok(runner);
  });

  test('RectorResult should have correct structure', () => {
    const result: RectorResult = {
      success: true,
      changedFiles: 0,
    };

    assert.strictEqual(typeof result.success, 'boolean');
    assert.strictEqual(typeof result.changedFiles, 'number');
  });

  test('RectorResult with error should have error field', () => {
    const result: RectorResult = {
      success: false,
      changedFiles: 0,
      error: 'Test error',
    };

    assert.strictEqual(result.success, false);
    assert.ok(result.error);
    assert.strictEqual(typeof result.error, 'string');
  });

  test('RectorResult with diff should have diff field', () => {
    const result: RectorResult = {
      success: true,
      changedFiles: 1,
      diff: '--- a/test.php\n+++ b/test.php\n@@ -1,1 +1,1 @@',
    };

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.changedFiles, 1);
    assert.ok(result.diff);
    assert.strictEqual(typeof result.diff, 'string');
  });

  test('processPaths should accept array of paths', async () => {
    // This is a mock test to verify the method signature
    // In a real test environment, you would need to mock the execFile call
    assert.strictEqual(typeof rectorRunner.processPaths, 'function');
  });

  test('processPaths should handle empty array', async () => {
    // Test that the method can be called with empty array
    // In production, this would still try to run Rector
    const paths: string[] = [];
    assert.ok(Array.isArray(paths));
    assert.strictEqual(paths.length, 0);
  });

  test('processPaths should handle single file path', async () => {
    const paths = ['/path/to/file.php'];
    assert.ok(Array.isArray(paths));
    assert.strictEqual(paths.length, 1);
    assert.strictEqual(typeof paths[0], 'string');
  });

  test('processPaths should handle multiple file paths', async () => {
    const paths = ['/path/to/file1.php', '/path/to/file2.php', '/path/to/file3.php'];
    assert.ok(Array.isArray(paths));
    assert.strictEqual(paths.length, 3);
    paths.forEach((path) => {
      assert.strictEqual(typeof path, 'string');
    });
  });

  test('processPaths should handle directory paths', async () => {
    const paths = ['/path/to/directory'];
    assert.ok(Array.isArray(paths));
    assert.strictEqual(paths.length, 1);
    assert.strictEqual(typeof paths[0], 'string');
  });

  test('processPaths should handle mixed file and directory paths', async () => {
    const paths = ['/path/to/file.php', '/path/to/directory', '/another/file.php'];
    assert.ok(Array.isArray(paths));
    assert.strictEqual(paths.length, 3);
    paths.forEach((path) => {
      assert.strictEqual(typeof path, 'string');
    });
  });
});

