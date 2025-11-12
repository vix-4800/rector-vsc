import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Extension Test Suite', () => {
  vscode.window.showInformationMessage('Start all tests.');

  test('Extension should be present', () => {
    const extension = vscode.extensions.getExtension('vix.rector-vscode');
    assert.ok(extension, 'Extension should be installed');
  });

  test('Extension should activate', async () => {
    const extension = vscode.extensions.getExtension('vix.rector-vscode');
    assert.ok(extension, 'Extension should be installed');

    await extension.activate();
    assert.strictEqual(extension.isActive, true, 'Extension should be active');
  });

  test('Should register all commands', async () => {
    const extension = vscode.extensions.getExtension('vix.rector-vscode');
    assert.ok(extension);

    await extension.activate();

    const commands = await vscode.commands.getCommands(true);
    const rectorCommands = [
      'rector.processFile',
      'rector.processFileWithDiff',
      'rector.processFiles',
      'rector.clearCache',
      'rector.showOutput',
      'rector.applyDiffChanges',
      'rector.discardDiffChanges',
    ];

    for (const cmd of rectorCommands) {
      assert.ok(commands.includes(cmd), `Command ${cmd} should be registered`);
    }
  });

  test('Should have correct configuration', () => {
    const config = vscode.workspace.getConfiguration('rector');

    // Check if configuration properties exist
    assert.strictEqual(typeof config.get('enabled'), 'boolean');
    assert.strictEqual(typeof config.get('executablePath'), 'string');
    assert.strictEqual(typeof config.get('enableAutofix'), 'boolean');
    assert.strictEqual(typeof config.get('showDiffOnSave'), 'boolean');
    assert.strictEqual(typeof config.get('clearCacheBeforeRun'), 'boolean');
  });

  test('Should have default configuration values', () => {
    const config = vscode.workspace.getConfiguration('rector');

    assert.strictEqual(config.get('enabled'), true);
    assert.strictEqual(config.get('executablePath'), 'rector');
    assert.strictEqual(config.get('enableAutofix'), false);
    assert.strictEqual(config.get('showDiffOnSave'), false);
    assert.strictEqual(config.get('clearCacheBeforeRun'), false);
  });
});
