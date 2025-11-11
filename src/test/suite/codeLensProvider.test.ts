import * as assert from 'assert';
import * as vscode from 'vscode';
import { RectorCodeLensProvider } from '../../codeLensProvider';

suite('RectorCodeLensProvider Test Suite', () => {
  let provider: RectorCodeLensProvider;

  setup(() => {
    provider = new RectorCodeLensProvider();
  });

  test('Should provide CodeLens for PHP files when enabled', async () => {
    const document = await vscode.workspace.openTextDocument({
      language: 'php',
      content: '<?php\nclass Test {}\n',
    });

    const codeLenses = provider.provideCodeLenses(
      document,
      new vscode.CancellationTokenSource().token
    );

    if (Array.isArray(codeLenses)) {
      assert.ok(codeLenses.length > 0, 'Should provide at least one CodeLens');
      assert.strictEqual(codeLenses.length, 2, 'Should provide exactly 2 CodeLens buttons');

      const firstLens = codeLenses[0];
      assert.ok(firstLens.command, 'First CodeLens should have a command');
      assert.strictEqual(
        firstLens.command?.command,
        'rector.processFile',
        'First CodeLens should run rector.processFile'
      );

      const secondLens = codeLenses[1];
      assert.ok(secondLens.command, 'Second CodeLens should have a command');
      assert.strictEqual(
        secondLens.command?.command,
        'rector.processFileWithDiff',
        'Second CodeLens should run rector.processFileWithDiff'
      );
    }
  });

  test('Should not provide CodeLens for non-PHP files', async () => {
    const document = await vscode.workspace.openTextDocument({
      language: 'javascript',
      content: 'console.log("test");',
    });

    const codeLenses = provider.provideCodeLenses(
      document,
      new vscode.CancellationTokenSource().token
    );

    if (Array.isArray(codeLenses)) {
      assert.strictEqual(codeLenses.length, 0, 'Should not provide CodeLens for non-PHP files');
    }
  });

  test('Should not provide CodeLens when disabled in config', async () => {
    const config = vscode.workspace.getConfiguration('rector');
    await config.update('enableCodeLens', false, vscode.ConfigurationTarget.Global);

    const document = await vscode.workspace.openTextDocument({
      language: 'php',
      content: '<?php\nclass Test {}\n',
    });

    const codeLenses = provider.provideCodeLenses(
      document,
      new vscode.CancellationTokenSource().token
    );

    if (Array.isArray(codeLenses)) {
      assert.strictEqual(codeLenses.length, 0, 'Should not provide CodeLens when disabled');
    }

    await config.update('enableCodeLens', true, vscode.ConfigurationTarget.Global);
  });

  test('CodeLens should be positioned at the top of the document', async () => {
    const document = await vscode.workspace.openTextDocument({
      language: 'php',
      content: '<?php\nclass Test {}\n',
    });

    const codeLenses = provider.provideCodeLenses(
      document,
      new vscode.CancellationTokenSource().token
    );

    if (Array.isArray(codeLenses) && codeLenses.length > 0) {
      const firstLens = codeLenses[0];
      assert.strictEqual(firstLens.range.start.line, 0, 'CodeLens should be at line 0');
      assert.strictEqual(firstLens.range.start.character, 0, 'CodeLens should be at character 0');
    }
  });
});
