import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';

export class DiffViewManager {
  private applyStatusBarItem: vscode.StatusBarItem | null = null;
  private discardStatusBarItem: vscode.StatusBarItem | null = null;
  private pendingChoice: ((value: 'Apply' | 'Discard' | undefined) => void) | null = null;
  private pendingApplyCallback: (() => Promise<void>) | null = null;
  private currentTmpUri: vscode.Uri | null = null;
  private currentOriginalUri: vscode.Uri | null = null;
  private currentTmpFilePath: string | null = null;
  private closeDocumentListener: vscode.Disposable | null = null;
  private changeActiveEditorListener: vscode.Disposable | null = null;
  private isApplying = false;
  private cleanupTimeout: NodeJS.Timeout | null = null;
  private autoDiscarded = false;

  async showDiff(
    originalUri: vscode.Uri,
    diff: string,
    applyCallback: () => Promise<void>
  ): Promise<void> {
    // Clean up any existing diff before creating a new one
    await this.cleanupDiffState();

    // Reset auto-discard flag for new diff
    this.autoDiscarded = false;

    const originalContent = await fs.promises.readFile(originalUri.fsPath, 'utf8');
    const modifiedContent = this.applyDiff(originalContent, diff);

    if (!modifiedContent) {
      vscode.window.showWarningMessage('Could not parse diff');
      return;
    }

    const tmpDir = await this.getTempDir();
    const baseName = path.basename(originalUri.fsPath);
    const tmpFileName = `${baseName}.rector.tmp.php`;
    const tmpFilePath = path.normalize(path.join(tmpDir, tmpFileName));

    await fs.promises.writeFile(tmpFilePath, modifiedContent, 'utf8');
    const tmpUri = vscode.Uri.file(tmpFilePath);
    this.currentTmpUri = tmpUri;
    this.currentOriginalUri = originalUri;
    this.currentTmpFilePath = tmpFilePath;

    const title = `Rector: ${path.basename(originalUri.fsPath)}`;

    try {
      await vscode.commands.executeCommand('vscode.diff', originalUri, tmpUri, title, {
        preview: false,
      });

      this.pendingApplyCallback = applyCallback;

      this.setupListeners();

      const choice = await this.showStatusBarChoice();

      if (choice === 'Apply') {
        if (!this.isApplying) {
          this.isApplying = true;
          try {
            await applyCallback();
            vscode.window.showInformationMessage('Rector changes applied');
          } finally {
            this.isApplying = false;
          }
        }
        await this.cleanupDiffState();
      } else if (choice === 'Discard') {
        // Only show message if not auto-discarded (manual discard via button)
        if (!this.autoDiscarded) {
          vscode.window.showInformationMessage('Rector changes discarded');
        }
        await this.cleanupDiffState();
      }
    } catch (error) {
      await this.cleanupDiffState();
      throw error;
    } finally {
      if (this.currentTmpFilePath) {
        try {
          await fs.promises.unlink(this.currentTmpFilePath);
        } catch {
          // Ignore cleanup errors
        }
      }
    }
  }

  private setupListeners(): void {
    // Clean up existing listeners
    if (this.closeDocumentListener) {
      this.closeDocumentListener.dispose();
      this.closeDocumentListener = null;
    }
    if (this.changeActiveEditorListener) {
      this.changeActiveEditorListener.dispose();
      this.changeActiveEditorListener = null;
    }

    // Listen for document close events
    this.closeDocumentListener = vscode.workspace.onDidCloseTextDocument((document) => {
      const docUri = document.uri.toString();
      // Check if either the original or temp file is closed
      if (
        (this.currentTmpUri && docUri === this.currentTmpUri.toString()) ||
        (this.currentOriginalUri && docUri === this.currentOriginalUri.toString())
      ) {
        if (this.pendingChoice) {
          // Use a timeout to detect if the diff view is actually closed
          this.cleanupTimeout = setTimeout(() => {
            this.triggerDiscard();
          }, 100);
        }
      }
    });

    // Listen for active editor changes to detect diff view closure
    this.changeActiveEditorListener = vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (this.currentTmpUri && this.currentOriginalUri) {
        // Check if the diff view is still open
        const isDiffOpen = vscode.window.visibleTextEditors.some(
          (e) =>
            e.document.uri.toString() === this.currentTmpUri?.toString() ||
            e.document.uri.toString() === this.currentOriginalUri?.toString()
        );

        if (!isDiffOpen && this.pendingChoice) {
          // Diff view is closed, trigger discard
          this.cleanupTimeout = setTimeout(() => {
            this.triggerDiscard();
          }, 100);
        }
      }
    });
  }

  private triggerDiscard(): void {
    if (this.pendingChoice) {
      this.autoDiscarded = true;
      vscode.window.showInformationMessage('Rector changes discarded (diff closed)');
      this.pendingChoice('Discard');
      this.pendingChoice = null;
    }
  }

  async cleanupDiffState(): Promise<void> {
    // Clear timeout if exists
    if (this.cleanupTimeout) {
      clearTimeout(this.cleanupTimeout);
      this.cleanupTimeout = null;
    }

    this.pendingApplyCallback = null;
    this.isApplying = false;
    this.autoDiscarded = false;

    // Delete temporary file
    if (this.currentTmpFilePath) {
      try {
        if (fs.existsSync(this.currentTmpFilePath)) {
          await fs.promises.unlink(this.currentTmpFilePath);
        }
      } catch {
        // Ignore cleanup errors
      }
      this.currentTmpFilePath = null;
    }

    this.currentTmpUri = null;
    this.currentOriginalUri = null;
    this.hideStatusBarChoice();

    // Dispose listeners
    if (this.closeDocumentListener) {
      this.closeDocumentListener.dispose();
      this.closeDocumentListener = null;
    }
    if (this.changeActiveEditorListener) {
      this.changeActiveEditorListener.dispose();
      this.changeActiveEditorListener = null;
    }
  }

  private showStatusBarChoice(): Promise<'Apply' | 'Discard' | undefined> {
    return new Promise((resolve) => {
      this.pendingChoice = resolve;

      this.applyStatusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Left,
        1000
      );
      this.applyStatusBarItem.text = '$(check) Apply Rector Changes';
      this.applyStatusBarItem.backgroundColor = new vscode.ThemeColor(
        'statusBarItem.warningBackground'
      );
      this.applyStatusBarItem.command = 'rector.applyDiffChanges';
      this.applyStatusBarItem.tooltip = 'Apply the Rector changes shown in diff';
      this.applyStatusBarItem.show();

      this.discardStatusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Left,
        999
      );
      this.discardStatusBarItem.text = '$(x) Discard';
      this.discardStatusBarItem.command = 'rector.discardDiffChanges';
      this.discardStatusBarItem.tooltip = 'Discard the Rector changes';
      this.discardStatusBarItem.show();
    });
  }

  private hideStatusBarChoice(): void {
    if (this.applyStatusBarItem) {
      this.applyStatusBarItem.dispose();
      this.applyStatusBarItem = null;
    }
    if (this.discardStatusBarItem) {
      this.discardStatusBarItem.dispose();
      this.discardStatusBarItem = null;
    }
    this.pendingChoice = null;
  }

  handleApplyChoice(): void {
    if (this.isApplying) {
      return;
    }

    if (this.pendingChoice) {
      this.pendingChoice('Apply');
      this.pendingChoice = null;
    }
  }

  handleDiscardChoice(): void {
    if (this.pendingChoice) {
      this.pendingChoice('Discard');
      this.pendingChoice = null;
    }
  }

  async dispose(): Promise<void> {
    await this.cleanupDiffState();
    // Clean up the entire temp directory
    await this.cleanupTempDir();
  }

  private async cleanupTempDir(): Promise<void> {
    try {
      const tmpDir = await this.getTempDir();
      if (fs.existsSync(tmpDir)) {
        const files = await fs.promises.readdir(tmpDir);
        // Delete all .rector.tmp.php files
        for (const file of files) {
          if (file.includes('.rector.tmp.php')) {
            const filePath = path.join(tmpDir, file);
            try {
              await fs.promises.unlink(filePath);
            } catch {
              // Ignore errors
            }
          }
        }
      }
    } catch {
      // Ignore cleanup errors
    }
  }

  private applyDiff(originalContent: string, diff: string): string | null {
    try {
      const lines = diff.split('\n');
      const originalLines = originalContent.split('\n');
      const result: string[] = [];

      let originalIndex = 0;
      let inHeader = true;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (line.startsWith('---') || line.startsWith('+++')) {
          continue;
        }

        if (line.startsWith('@@')) {
          const match = line.match(/@@ -(\d+),?(\d*) \+(\d+),?(\d*) @@/);
          if (match) {
            const oldStart = parseInt(match[1], 10);
            while (originalIndex < oldStart - 1) {
              result.push(originalLines[originalIndex]);
              originalIndex++;
            }
            inHeader = false;
          }
          continue;
        }

        if (inHeader) {
          continue;
        }

        if (line.startsWith('-')) {
          originalIndex++;
        } else if (line.startsWith('+')) {
          result.push(line.substring(1));
        } else if (line.startsWith(' ')) {
          result.push(originalLines[originalIndex]);
          originalIndex++;
        } else if (line.trim() === '') {
          if (originalIndex < originalLines.length && originalLines[originalIndex].trim() === '') {
            result.push('');
            originalIndex++;
          }
        }
      }

      while (originalIndex < originalLines.length) {
        result.push(originalLines[originalIndex]);
        originalIndex++;
      }

      return result.join('\n');
    } catch (error) {
      return null;
    }
  }

  private async getTempDir(): Promise<string> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    let tmpDir: string;

    if (workspaceFolder) {
      tmpDir = path.join(workspaceFolder.uri.fsPath, '.rector-tmp');
    } else {
      tmpDir = path.join(os.tmpdir(), 'rector-vscode');
    }

    try {
      await fs.promises.mkdir(tmpDir, { recursive: true });
    } catch {
      // Directory might already exist
    }

    return tmpDir;
  }
}
