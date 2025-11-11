import * as vscode from 'vscode';

export class RectorCodeLensProvider implements vscode.CodeLensProvider {
  private _onDidChangeCodeLenses: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
  public readonly onDidChangeCodeLenses: vscode.Event<void> = this._onDidChangeCodeLenses.event;

  constructor() {
    vscode.workspace.onDidChangeConfiguration(() => {
      this._onDidChangeCodeLenses.fire();
    });
  }

  public provideCodeLenses(
    document: vscode.TextDocument,
    _token: vscode.CancellationToken
  ): vscode.CodeLens[] | Thenable<vscode.CodeLens[]> {
    const config = vscode.workspace.getConfiguration('rector');
    const enabled = config.get<boolean>('enableCodeLens', true);

    if (!enabled || document.languageId !== 'php') {
      return [];
    }

    const codeLenses: vscode.CodeLens[] = [];

    const topOfDocument = new vscode.Range(0, 0, 0, 0);

    codeLenses.push(
      new vscode.CodeLens(topOfDocument, {
        title: '$(wand) Run Rector',
        tooltip: 'Process this file with Rector',
        command: 'rector.processFile',
        arguments: [],
      })
    );

    codeLenses.push(
      new vscode.CodeLens(topOfDocument, {
        title: '$(diff) Run Rector (Show Diff)',
        tooltip: 'Process this file with Rector and show diff before applying',
        command: 'rector.processFileWithDiff',
        arguments: [],
      })
    );

    return codeLenses;
  }

  public resolveCodeLens(
    codeLens: vscode.CodeLens,
    _token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.CodeLens> {
    return codeLens;
  }
}
