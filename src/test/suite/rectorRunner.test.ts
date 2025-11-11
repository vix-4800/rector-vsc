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
});
