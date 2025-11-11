import * as vscode from 'vscode';
import { DiffViewManager } from './diffViewManager';
import { RectorRunner } from './rectorRunner';

export function activate(context: vscode.ExtensionContext) {
  console.log('Rector extension is now active');

  // Create output channel for logging
  const outputChannel = vscode.window.createOutputChannel('PHP Rector');
  outputChannel.appendLine('PHP Rector extension activated');
  outputChannel.appendLine('---');

  const rectorRunner = new RectorRunner(outputChannel);
  const diffViewManager = new DiffViewManager();

  // Register command to process file directly
  const processFileCommand = vscode.commands.registerCommand('rector.processFile', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('No active editor');
      return;
    }

    if (editor.document.languageId !== 'php') {
      vscode.window.showErrorMessage('This command only works with PHP files');
      return;
    }

    await editor.document.save();

    try {
      vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'Running Rector...',
          cancellable: false,
        },
        async () => {
          const result = await rectorRunner.processFile(editor.document.uri.fsPath, false);

          if (result.success) {
            if (result.changedFiles > 0) {
              vscode.window.showInformationMessage(
                `Rector: ${result.changedFiles} file(s) changed`
              );
              // Reload the file
              const document = await vscode.workspace.openTextDocument(editor.document.uri);
              await vscode.window.showTextDocument(document);
            } else {
              vscode.window.showInformationMessage('Rector: No changes needed');
            }
          } else {
            vscode.window.showErrorMessage(`Rector failed: ${result.error}`);
          }
        }
      );
    } catch (error) {
      vscode.window.showErrorMessage(`Rector error: ${error}`);
    }
  });

  // Register command to process file with diff view
  const processFileWithDiffCommand = vscode.commands.registerCommand(
    'rector.processFileWithDiff',
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage('No active editor');
        return;
      }

      if (editor.document.languageId !== 'php') {
        vscode.window.showErrorMessage('This command only works with PHP files');
        return;
      }

      await editor.document.save();

      try {
        vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: 'Running Rector...',
            cancellable: false,
          },
          async () => {
            const result = await rectorRunner.processFile(editor.document.uri.fsPath, true);

            if (result.success) {
              if (result.changedFiles > 0 && result.diff) {
                // Show diff view
                await diffViewManager.showDiff(editor.document.uri, result.diff, async () => {
                  // Apply changes callback
                  await rectorRunner.processFile(editor.document.uri.fsPath, false);
                  const document = await vscode.workspace.openTextDocument(editor.document.uri);
                  await vscode.window.showTextDocument(document);
                  vscode.window.showInformationMessage('Rector changes applied');
                });
              } else {
                vscode.window.showInformationMessage('Rector: No changes needed');
              }
            } else {
              vscode.window.showErrorMessage(`Rector failed: ${result.error}`);
            }
          }
        );
      } catch (error) {
        vscode.window.showErrorMessage(`Rector error: ${error}`);
      }
    }
  );

  // Register command to clear cache
  const clearCacheCommand = vscode.commands.registerCommand('rector.clearCache', async () => {
    try {
      await rectorRunner.clearCache();
      vscode.window.showInformationMessage('Rector cache cleared');
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to clear cache: ${error}`);
    }
  });

  // Register command to show output channel
  const showOutputCommand = vscode.commands.registerCommand('rector.showOutput', () => {
    outputChannel.show();
  });

  // Register commands for status bar buttons
  const applyDiffChangesCommand = vscode.commands.registerCommand(
    'rector.applyDiffChanges',
    () => {
      diffViewManager.handleApplyChoice();
    }
  );

  const discardDiffChangesCommand = vscode.commands.registerCommand(
    'rector.discardDiffChanges',
    () => {
      diffViewManager.handleDiscardChoice();
    }
  );

  // Auto-fix on save
  const onSaveListener = vscode.workspace.onDidSaveTextDocument(async (document) => {
    const config = vscode.workspace.getConfiguration('rector');
    const enabled = config.get<boolean>('enabled', true);
    const autofix = config.get<boolean>('enableAutofix', false);
    const showDiff = config.get<boolean>('showDiffOnSave', false);

    if (!enabled || document.languageId !== 'php') {
      return;
    }

    if (autofix) {
      if (showDiff) {
        // Show diff before applying
        vscode.commands.executeCommand('rector.processFileWithDiff');
      } else {
        // Apply directly
        const result = await rectorRunner.processFile(document.uri.fsPath, false);
        if (result.success && result.changedFiles > 0) {
          const doc = await vscode.workspace.openTextDocument(document.uri);
          await vscode.window.showTextDocument(doc);
        }
      }
    }
  });

  context.subscriptions.push(
    outputChannel,
    diffViewManager,
    processFileCommand,
    processFileWithDiffCommand,
    clearCacheCommand,
    showOutputCommand,
    applyDiffChangesCommand,
    discardDiffChangesCommand,
    onSaveListener
  );
}

export function deactivate() {}
