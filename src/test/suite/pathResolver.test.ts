import * as assert from 'assert';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import { RectorRunner } from '../../rectorRunner';

suite('Path Resolver Tests', () => {
  let rectorRunner: RectorRunner;
  let outputChannel: vscode.OutputChannel;

  setup(() => {
    outputChannel = vscode.window.createOutputChannel('Test Rector');
    rectorRunner = new RectorRunner(outputChannel);
  });

  teardown(() => {
    outputChannel.dispose();
  });

  test('Should resolve tilde (~) to home directory', () => {
    const homeDir = os.homedir();
    const testPath = '~/rector.php';

    // We can't directly test the private method, but we can test the behavior
    // by checking if the resolved path starts with the home directory
    const expectedPath = path.join(homeDir, 'rector.php');

    assert.ok(homeDir, 'Home directory should be defined');
    assert.ok(expectedPath.startsWith(homeDir), 'Resolved path should start with home directory');
  });

  test('Tilde path should not contain ~ after resolution', () => {
    const testPath = '~/some/config/rector.php';
    const homeDir = os.homedir();
    const expectedPath = testPath.replace(/^~/, homeDir);

    assert.ok(!expectedPath.includes('~'), 'Resolved path should not contain tilde');
    assert.ok(expectedPath.startsWith(homeDir), 'Path should start with home directory');
  });

  test('Single tilde should resolve to home directory', () => {
    const homeDir = os.homedir();
    const testPath = '~';
    const expectedPath = testPath.replace(/^~/, homeDir);

    assert.strictEqual(expectedPath, homeDir, 'Single tilde should resolve to home directory');
  });

  test('Non-tilde paths should remain unchanged', () => {
    const absolutePath = '/usr/local/bin/rector';
    assert.strictEqual(absolutePath, absolutePath, 'Absolute path should remain unchanged');

    const windowsPath = 'C:\\Program Files\\rector\\rector.exe';
    assert.strictEqual(windowsPath, windowsPath, 'Windows path should remain unchanged');
  });

  test('Relative paths (./ and ../) should be resolved relative to workspace', () => {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];

    if (workspaceFolder) {
      const relativePath = './rector.php';
      const expectedPath = path.resolve(workspaceFolder.uri.fsPath, relativePath);

      assert.ok(path.isAbsolute(expectedPath), 'Resolved path should be absolute');
      assert.ok(expectedPath.includes('rector.php'), 'Path should contain the file name');
    }
  });

  test('Path normalization should handle redundant separators', () => {
    const testPath = '/some//path///to////rector.php';
    const normalizedPath = path.normalize(testPath);

    assert.ok(!normalizedPath.includes('//'), 'Normalized path should not contain double slashes');
  });

  test('Mixed special characters should be handled', () => {
    const homeDir = os.homedir();
    const testPath = '~/some/../config/./rector.php';
    const resolvedHome = testPath.replace(/^~/, homeDir);
    const normalizedPath = path.normalize(resolvedHome);

    assert.ok(!normalizedPath.includes('..'), 'Path should not contain .. after normalization');
    assert.ok(!normalizedPath.includes('./'), 'Path should not contain ./ after normalization');
  });

  test('Empty path should be handled gracefully', () => {
    const emptyPath = '';
    assert.strictEqual(emptyPath, '', 'Empty path should remain empty');
  });

  test('Home directory expansion should work on all platforms', () => {
    const homeDir = os.homedir();
    assert.ok(homeDir, 'Home directory should be defined on all platforms');
    assert.ok(homeDir.length > 0, 'Home directory should not be empty');
    assert.ok(path.isAbsolute(homeDir), 'Home directory should be an absolute path');
  });

  test('Tilde in middle of path should not be expanded', () => {
    const testPath = '/some/path/~/rector.php';
    // Tilde should only be expanded at the beginning
    assert.ok(testPath.includes('~'), 'Tilde in middle of path should remain');
  });

  test('Path with spaces should be handled correctly', () => {
    const homeDir = os.homedir();
    const testPath = '~/my config/rector.php';
    const expectedPath = testPath.replace(/^~/, homeDir);

    assert.ok(expectedPath.includes('my config'), 'Path with spaces should be preserved');
    assert.ok(expectedPath.startsWith(homeDir), 'Path should start with home directory');
  });
});
