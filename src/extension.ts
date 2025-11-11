import * as vscode from 'vscode';
import { RectorCodeLensProvider } from './codeLensProvider';
import { DiffViewManager } from './diffViewManager';
import { RectorRunner } from './rectorRunner';

export function activate(context: vscode.ExtensionContext) {
  const outputChannel = vscode.window.createOutputChannel('PHP Rector');
  outputChannel.appendLine('PHP Rector extension activated');
  outputChannel.appendLine('---');

  const rectorRunner = new RectorRunner(outputChannel);
  const diffViewManager = new DiffViewManager();
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
      await diffViewManager.cleanupDiffState();
      vscode.window.showErrorMessage(`Rector error: ${error}`);
    }
  });

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
        const result = await rectorRunner.processFile(editor.document.uri.fsPath, true);

        if (result.success) {
          if (result.changedFiles > 0 && result.diff) {
            await diffViewManager.showDiff(editor.document.uri, result.diff, async () => {
              await rectorRunner.processFile(editor.document.uri.fsPath, false);
              const document = await vscode.workspace.openTextDocument(editor.document.uri);
              await vscode.window.showTextDocument(document);
            });
          } else {
            vscode.window.showInformationMessage('Rector: No changes needed');
          }
        } else {
          vscode.window.showErrorMessage(`Rector failed: ${result.error}`);
        }
      } catch (error) {
        await diffViewManager.cleanupDiffState();
        vscode.window.showErrorMessage(`Rector error: ${error}`);
      }
    }
  );

  const clearCacheCommand = vscode.commands.registerCommand('rector.clearCache', async () => {
    try {
      await rectorRunner.clearCache();
      vscode.window.showInformationMessage('Rector cache cleared');
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to clear cache: ${error}`);
    }
  });

  const showOutputCommand = vscode.commands.registerCommand('rector.showOutput', () => {
    outputChannel.show();
  });

  const applyDiffChangesCommand = vscode.commands.registerCommand('rector.applyDiffChanges', () => {
    diffViewManager.handleApplyChoice();
  });

  const discardDiffChangesCommand = vscode.commands.registerCommand(
    'rector.discardDiffChanges',
    () => {
      diffViewManager.handleDiscardChoice();
    }
  );

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
        vscode.commands.executeCommand('rector.processFileWithDiff');
      } else {
        const result = await rectorRunner.processFile(document.uri.fsPath, false);
        if (result.success && result.changedFiles > 0) {
          const doc = await vscode.workspace.openTextDocument(document.uri);
          await vscode.window.showTextDocument(doc);
        }
      }
    }
  });

  const codeLensProvider = new RectorCodeLensProvider();
  const codeLensProviderDisposable = vscode.languages.registerCodeLensProvider(
    { language: 'php', scheme: 'file' },
    codeLensProvider
  );

  context.subscriptions.push(
    outputChannel,
    diffViewManager,
    processFileCommand,
    processFileWithDiffCommand,
    clearCacheCommand,
    showOutputCommand,
    applyDiffChangesCommand,
    discardDiffChangesCommand,
    onSaveListener,
    codeLensProviderDisposable
  );
}

export function deactivate() {}
