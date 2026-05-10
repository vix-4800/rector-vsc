import * as vscode from 'vscode';

export function createTestOutputChannel(name = 'Test Rector'): vscode.OutputChannel {
  return {
    name,
    append: () => {},
    appendLine: () => {},
    replace: () => {},
    clear: () => {},
    show: () => {},
    hide: () => {},
    dispose: () => {},
  };
}
