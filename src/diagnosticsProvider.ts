import * as vscode from 'vscode';

export class RectorDiagnosticsProvider implements vscode.CodeActionProvider, vscode.Disposable {
    public static readonly providedCodeActionKinds = [vscode.CodeActionKind.QuickFix];

    private diagnosticCollection: vscode.DiagnosticCollection;

    constructor() {
        this.diagnosticCollection = vscode.languages.createDiagnosticCollection('rector');
    }

    /**
     * Parse a unified diff and produce VS Code diagnostics for the lines
     * that Rector would remove/replace in the original file.
     * Each contiguous block of changed lines within a hunk becomes one diagnostic.
     */
    parseDiff(diff: string): vscode.Diagnostic[] {
        const diagnostics: vscode.Diagnostic[] = [];
        const lines = diff.split('\n');

        const message = 'Rector: improvement available';

        let currentOriginalLine = 0;
        let hunkChangedLines: number[] = [];
        let inHunk = false;

        const flushHunk = () => {
            if (hunkChangedLines.length > 0) {
                const startLine = hunkChangedLines[0];
                const endLine = hunkChangedLines[hunkChangedLines.length - 1];
                const range = new vscode.Range(startLine, 0, endLine, Number.MAX_SAFE_INTEGER);
                const diagnostic = new vscode.Diagnostic(
                    range,
                    message,
                    vscode.DiagnosticSeverity.Information
                );
                diagnostic.source = 'Rector';
                diagnostic.code = 'rector-suggestion';
                diagnostics.push(diagnostic);
            }
            hunkChangedLines = [];
        };

        for (const line of lines) {
            // Hunk header: @@ -<start>[,<count>] +<start>[,<count>] @@
            const hunkMatch = line.match(/^@@ -(\d+)(?:,\d+)? \+\d+(?:,\d+)? @@/);
            if (hunkMatch) {
                flushHunk();
                currentOriginalLine = parseInt(hunkMatch[1], 10) - 1; // convert to 0-based
                inHunk = true;
                continue;
            }

            if (!inHunk) {
                continue;
            }

            if (line.startsWith('--- ') || line.startsWith('+++ ')) {
                // File header lines inside a diff block — skip
                continue;
            } else if (line.startsWith('-')) {
                // Line removed from original — mark as changed
                hunkChangedLines.push(currentOriginalLine);
                currentOriginalLine++;
            } else if (line.startsWith('+')) {
                // Line added in new file — does not consume an original line
            } else if (line.startsWith('\\')) {
                // "\ No newline at end of file" — skip
            } else {
                // Context line — advance pointer but flush any open block first
                if (hunkChangedLines.length > 0) {
                    flushHunk();
                }
                currentOriginalLine++;
            }
        }

        flushHunk();

        return diagnostics;
    }

    updateDiagnostics(uri: vscode.Uri, diff: string): void {
        const diagnostics = this.parseDiff(diff);
        this.diagnosticCollection.set(uri, diagnostics);
    }

    clearDiagnostics(uri: vscode.Uri): void {
        this.diagnosticCollection.delete(uri);
    }

    clearAll(): void {
        this.diagnosticCollection.clear();
    }

    provideCodeActions(
        _document: vscode.TextDocument,
        _range: vscode.Range | vscode.Selection,
        context: vscode.CodeActionContext,
        _token: vscode.CancellationToken
    ): vscode.ProviderResult<(vscode.Command | vscode.CodeAction)[]> {
        const rectorDiagnostics = context.diagnostics.filter((d) => d.source === 'Rector');
        if (rectorDiagnostics.length === 0) {
            return [];
        }

        const applyAction = new vscode.CodeAction(
            'Apply Rector changes to this file',
            vscode.CodeActionKind.QuickFix
        );
        applyAction.command = {
            title: 'Apply Rector changes',
            command: 'rector.processFile',
        };
        applyAction.diagnostics = rectorDiagnostics;
        applyAction.isPreferred = true;

        const showDiffAction = new vscode.CodeAction(
            'Show Rector diff',
            vscode.CodeActionKind.QuickFix
        );
        showDiffAction.command = {
            title: 'Show Rector diff',
            command: 'rector.processFileWithDiff',
        };
        showDiffAction.diagnostics = rectorDiagnostics;

        return [applyAction, showDiffAction];
    }

    dispose(): void {
        this.diagnosticCollection.dispose();
    }
}
