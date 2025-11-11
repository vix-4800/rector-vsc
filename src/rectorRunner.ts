import * as cp from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import * as vscode from 'vscode';

const execFile = promisify(cp.execFile);

export interface RectorResult {
  success: boolean;
  changedFiles: number;
  diff?: string;
  error?: string;
  appliedRectors?: string[];
}

interface RectorJsonOutput {
  totals: {
    changed_files: number;
    errors: number;
  };
  file_diffs?: Array<{
    file: string;
    diff: string;
    applied_rectors: string[];
  }>;
}

export class RectorRunner {
  private getConfig(): {
    executablePath: string;
    configPath: string;
    clearCache: boolean;
  } {
    const config = vscode.workspace.getConfiguration('rector');
    return {
      executablePath: config.get<string>('executablePath', 'rector'),
      configPath: config.get<string>('configPath', ''),
      clearCache: config.get<boolean>('clearCacheBeforeRun', false),
    };
  }

  private resolveExecutablePath(executablePath: string): string {
    // If it's a relative path, resolve it from workspace root
    if (executablePath.startsWith('./') || executablePath.startsWith('../')) {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (workspaceFolders && workspaceFolders.length > 0) {
        return path.resolve(workspaceFolders[0].uri.fsPath, executablePath);
      }
    }
    return executablePath;
  }

  private findConfigFile(filePath: string): string | null {
    let dir = path.dirname(filePath);
    const configNames = ['rector.php', 'rector.php.dist'];

    while (dir !== path.dirname(dir)) {
      for (const configName of configNames) {
        const configPath = path.join(dir, configName);
        if (fs.existsSync(configPath)) {
          return configPath;
        }
      }
      dir = path.dirname(dir);
    }

    return null;
  }

  async processFile(filePath: string, dryRun: boolean): Promise<RectorResult> {
    const config = this.getConfig();
    const resolvedExecutable = this.resolveExecutablePath(config.executablePath);
    const args: string[] = ['process', filePath];

    if (dryRun) {
      args.push('--dry-run');
    }

    args.push('--output-format=json');
    args.push('--no-progress-bar');

    if (config.clearCache) {
      args.push('--clear-cache');
    }

    // Find or use config path
    let configPath = config.configPath;
    if (!configPath) {
      const foundConfig = this.findConfigFile(filePath);
      if (foundConfig) {
        configPath = foundConfig;
      }
    } else {
      // Resolve relative config path
      if (configPath.startsWith('./') || configPath.startsWith('../')) {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders && workspaceFolders.length > 0) {
          configPath = path.resolve(workspaceFolders[0].uri.fsPath, configPath);
        }
      }

      // Validate the specified config path
      if (!fs.existsSync(configPath)) {
        return {
          success: false,
          changedFiles: 0,
          error: `Config file not found: ${configPath}`,
        };
      }
    }

    if (configPath) {
      args.push('--config=' + configPath);
    }

    try {
      const { stdout } = await execFile(resolvedExecutable, args, {
        cwd: path.dirname(filePath),
        maxBuffer: 10 * 1024 * 1024, // 10MB
      });

      // Parse JSON output
      const output = this.parseJsonOutput(stdout);

      if (!output) {
        return {
          success: false,
          changedFiles: 0,
          error: 'Failed to parse Rector output',
        };
      }

      const result: RectorResult = {
        success: true,
        changedFiles: output.totals.changed_files,
      };

      if (output.file_diffs && output.file_diffs.length > 0) {
        const fileDiff = output.file_diffs[0];
        result.diff = fileDiff.diff;
        result.appliedRectors = fileDiff.applied_rectors;
      }

      return result;
    } catch (error: any) {
      // Check if it's an execution error (e.g., Rector not found)
      if (error.code === 'ENOENT') {
        return {
          success: false,
          changedFiles: 0,
          error: `Rector executable not found: ${config.executablePath}`,
        };
      }

      // Rector returns non-zero exit code even on success with changes
      if (error.stdout) {
        try {
          const output = this.parseJsonOutput(error.stdout);
          if (output) {
            const result: RectorResult = {
              success: true,
              changedFiles: output.totals.changed_files,
            };

            if (output.file_diffs && output.file_diffs.length > 0) {
              const fileDiff = output.file_diffs[0];
              result.diff = fileDiff.diff;
              result.appliedRectors = fileDiff.applied_rectors;
            }

            return result;
          }
        } catch (parseError) {
          // Fall through to error handling
        }
      }

      return {
        success: false,
        changedFiles: 0,
        error: error.message || error.stderr || 'Unknown error',
      };
    }
  }

  private parseJsonOutput(stdout: string): RectorJsonOutput | null {
    try {
      // Clean output - sometimes there's extra text before/after JSON
      const jsonMatch = stdout.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return JSON.parse(stdout);
    } catch (error) {
      console.error('Failed to parse JSON:', error);
      return null;
    }
  }

  async clearCache(): Promise<void> {
    const config = this.getConfig();
    const resolvedExecutable = this.resolveExecutablePath(config.executablePath);
    const args = ['process', '--clear-cache'];

    try {
      await execFile(resolvedExecutable, args);
    } catch (error: any) {
      // Check if it's an execution error (e.g., Rector not found)
      if (error.code === 'ENOENT') {
        throw new Error(`Rector executable not found: ${config.executablePath}`);
      }
      // Ignore other errors - cache clearing might fail but that's ok
    }
  }
}
