import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';

export class DiffViewManager {
  private applyStatusBarItem: vscode.StatusBarItem | null = null;
  private discardStatusBarItem: vscode.StatusBarItem | null = null;
  private pendingChoice: ((value: 'Apply' | 'Discard' | undefined) => void) | null = null;

  async showDiff(
    originalUri: vscode.Uri,
    diff: string,
    applyCallback: () => Promise<void>
  ): Promise<void> {
    // Create temporary file with the proposed changes
    const originalContent = await fs.promises.readFile(originalUri.fsPath, 'utf8');
    const modifiedContent = this.applyDiff(originalContent, diff);

    if (!modifiedContent) {
      vscode.window.showWarningMessage('Could not parse diff');
      return;
    }

    // Create temporary file
    const tmpDir = await this.getTempDir();
    const tmpFileName = `${path.basename(originalUri.fsPath)}.rector.tmp.php`;
    const tmpFilePath = path.join(tmpDir, tmpFileName);

    await fs.promises.writeFile(tmpFilePath, modifiedContent, 'utf8');
    const tmpUri = vscode.Uri.file(tmpFilePath);

    // Show diff
    const title = `Rector: ${path.basename(originalUri.fsPath)}`;

    try {
      await vscode.commands.executeCommand('vscode.diff', originalUri, tmpUri, title, {
        preview: false,
      });

      // Show status bar buttons and wait for user choice
      const choice = await this.showStatusBarChoice();

      if (choice === 'Apply') {
        await applyCallback();
        vscode.window.showInformationMessage('Rector changes applied');
      } else if (choice === 'Discard') {
        vscode.window.showInformationMessage('Rector changes discarded');
      }
    } finally {
      // Clean up status bar items
      this.hideStatusBarChoice();

      // Clean up temp file
      try {
        await fs.promises.unlink(tmpFilePath);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  }

  private showStatusBarChoice(): Promise<'Apply' | 'Discard' | undefined> {
    return new Promise((resolve) => {
      this.pendingChoice = resolve;

      // Create Apply button
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

      // Create Discard button
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

  dispose(): void {
    this.hideStatusBarChoice();
  }

    private applyDiff(originalContent: string, diff: string): string | null {
        try {
            // For unified diff, we'll use a simpler approach:
            // Parse the diff and apply changes line by line
            const lines = diff.split('\n');
            const originalLines = originalContent.split('\n');
            const result: string[] = [];

            let originalIndex = 0;
            let inHeader = true;

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];

                // Skip diff header lines (---, +++, @@)
                if (line.startsWith('---') || line.startsWith('+++')) {
                    continue;
                }

                // Parse hunk header: @@ -oldStart,oldLines +newStart,newLines @@
                if (line.startsWith('@@')) {
                    const match = line.match(/@@ -(\d+),?(\d*) \+(\d+),?(\d*) @@/);
                    if (match) {
                        const oldStart = parseInt(match[1], 10);
                        // Copy lines before this hunk
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
                    // Line removed - skip the corresponding original line
                    originalIndex++;
                } else if (line.startsWith('+')) {
                    // Line added - add to result
                    result.push(line.substring(1));
                } else if (line.startsWith(' ')) {
                    // Context line - copy from original
                    result.push(originalLines[originalIndex]);
                    originalIndex++;
                } else if (line.trim() === '') {
                    // Empty line - might be context
                    if (originalIndex < originalLines.length && originalLines[originalIndex].trim() === '') {
                        result.push('');
                        originalIndex++;
                    }
                }
            }

            // Copy remaining lines
            while (originalIndex < originalLines.length) {
                result.push(originalLines[originalIndex]);
                originalIndex++;
            }

            return result.join('\n');
        } catch (error) {
            console.error('Failed to apply diff:', error);
            return null;
        }
    }  private async getTempDir(): Promise<string> {
    // Use workspace folder's temp directory or system temp
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    let tmpDir: string;

    if (workspaceFolder) {
      tmpDir = path.join(workspaceFolder.uri.fsPath, '.rector-tmp');
    } else {
      tmpDir = path.join(os.tmpdir(), 'rector-vscode');
    }

    // Create directory if it doesn't exist
    try {
      await fs.promises.mkdir(tmpDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }

    return tmpDir;
  }
}
