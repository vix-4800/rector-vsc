import * as cp from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
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
    // eslint-disable-next-line @typescript-eslint/naming-convention
    changed_files: number;
    errors: number;
  };
  // eslint-disable-next-line @typescript-eslint/naming-convention
  file_diffs?: Array<{
    file: string;
    diff: string;
    // eslint-disable-next-line @typescript-eslint/naming-convention
    applied_rectors: string[];
  }>;
}

export class RectorRunner {
  private outputChannel: vscode.OutputChannel | null = null;

  constructor(outputChannel?: vscode.OutputChannel) {
    this.outputChannel = outputChannel || null;
  }

  private log(message: string): void {
    if (this.outputChannel) {
      const timestamp = new Date().toLocaleTimeString();
      this.outputChannel.appendLine(`[${timestamp}] ${message}`);
    }
  }

  private getConfig(): {
    executablePath: string;
    configPath: string;
    clearCache: boolean;
    timeout: number;
  } {
    const config = vscode.workspace.getConfiguration('rector');
    return {
      executablePath: config.get<string>('executablePath', 'rector'),
      configPath: config.get<string>('configPath', ''),
      clearCache: config.get<boolean>('clearCacheBeforeRun', false),
      timeout: config.get<number>('timeout', 60000),
    };
  }

  private resolveExecutablePath(executablePath: string): string {
    // Use resolveSpecialPath for consistent path handling
    return this.resolveSpecialPath(executablePath);
  }

  private resolveSpecialPath(inputPath: string): string {
    if (!inputPath) {
      return inputPath;
    }

    let resolvedPath = inputPath;

    // Handle tilde (~) for home directory
    if (resolvedPath.startsWith('~/') || resolvedPath === '~') {
      resolvedPath = resolvedPath.replace(/^~/, os.homedir());
    }

    // Handle relative paths (./ and ../)
    if (resolvedPath.startsWith('./') || resolvedPath.startsWith('../')) {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (workspaceFolders && workspaceFolders.length > 0) {
        resolvedPath = path.resolve(workspaceFolders[0].uri.fsPath, resolvedPath);
      }
    }

    // Normalize the path to handle any redundant separators or segments
    resolvedPath = path.normalize(resolvedPath);

    return resolvedPath;
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

    let configPath = config.configPath;
    if (!configPath) {
      const foundConfig = this.findConfigFile(filePath);
      if (foundConfig) {
        configPath = foundConfig;
        this.log(`Auto-detected config file: ${configPath}`);
      }
    } else {
      // Resolve special paths (like ~, ./, ../)
      configPath = this.resolveSpecialPath(configPath);

      if (!fs.existsSync(configPath)) {
        const error = `Config file not found: ${configPath}`;
        this.log(`ERROR: ${error}`);
        return {
          success: false,
          changedFiles: 0,
          error,
        };
      }
    }

    if (configPath) {
      args.push('--config=' + configPath);
    }

    const commandStr = `${resolvedExecutable} ${args.join(' ')}`;
    this.log(`Executing: ${commandStr}`);
    this.log(`Working directory: ${path.dirname(filePath)}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      this.log(`WARNING: Process timed out after ${config.timeout}ms`);
    }, config.timeout);

    try {
      const { stdout } = await execFile(resolvedExecutable, args, {
        cwd: path.dirname(filePath),
        maxBuffer: 10 * 1024 * 1024,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const output = this.parseJsonOutput(stdout);

      if (!output) {
        this.log('ERROR: Failed to parse Rector output');
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

        this.log(`SUCCESS: ${output.totals.changed_files} file(s) changed`);
        if (result.appliedRectors && result.appliedRectors.length > 0) {
          this.log(`Applied rectors: ${result.appliedRectors.join(', ')}`);
        }
      } else {
        this.log('SUCCESS: No changes needed');
      }

      return result;
    } catch (error: any) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        const errorMsg = `Rector process timed out after ${config.timeout}ms`;
        this.log(`ERROR: ${errorMsg}`);
        return {
          success: false,
          changedFiles: 0,
          error: errorMsg,
        };
      }

      if (error.code === 'ENOENT') {
        const errorMsg = `Rector executable not found: ${config.executablePath}`;
        this.log(`ERROR: ${errorMsg}`);
        return {
          success: false,
          changedFiles: 0,
          error: errorMsg,
        };
      }

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

              this.log(`SUCCESS: ${output.totals.changed_files} file(s) changed`);
              if (result.appliedRectors && result.appliedRectors.length > 0) {
                this.log(`Applied rectors: ${result.appliedRectors.join(', ')}`);
              }
            } else {
              this.log('SUCCESS: No changes needed');
            }

            return result;
          }
        } catch (parseError) {
          // Continue to error handling
        }
      }

      const errorMsg = error.message || error.stderr || 'Unknown error';
      this.log(`ERROR: ${errorMsg}`);
      return {
        success: false,
        changedFiles: 0,
        error: errorMsg,
      };
    }
  }

  async processPaths(paths: string[]): Promise<RectorResult> {
    const config = this.getConfig();
    const resolvedExecutable = this.resolveExecutablePath(config.executablePath);
    const args: string[] = ['process', ...paths];

    args.push('--output-format=json');
    args.push('--no-progress-bar');

    if (config.clearCache) {
      args.push('--clear-cache');
    }

    // Find config file from the first path
    let configPath = config.configPath;
    if (!configPath && paths.length > 0) {
      const foundConfig = this.findConfigFile(paths[0]);
      if (foundConfig) {
        configPath = foundConfig;
        this.log(`Auto-detected config file: ${configPath}`);
      }
    } else if (configPath) {
      // Resolve special paths (like ~, ./, ../)
      configPath = this.resolveSpecialPath(configPath);

      if (!fs.existsSync(configPath)) {
        const error = `Config file not found: ${configPath}`;
        this.log(`ERROR: ${error}`);
        return {
          success: false,
          changedFiles: 0,
          error,
        };
      }
    }

    if (configPath) {
      args.push('--config=' + configPath);
    }

    // Get working directory - use workspace root or first path's directory
    let cwd: string;
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders && workspaceFolders.length > 0) {
      cwd = workspaceFolders[0].uri.fsPath;
    } else if (paths.length > 0) {
      const firstPath = paths[0];
      cwd = fs.statSync(firstPath).isDirectory() ? firstPath : path.dirname(firstPath);
    } else {
      cwd = process.cwd();
    }

    const commandStr = `${resolvedExecutable} ${args.join(' ')}`;
    this.log(`Executing: ${commandStr}`);
    this.log(`Working directory: ${cwd}`);
    this.log(`Processing paths: ${paths.join(', ')}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      this.log(`WARNING: Process timed out after ${config.timeout}ms`);
    }, config.timeout);

    try {
      const { stdout } = await execFile(resolvedExecutable, args, {
        cwd,
        maxBuffer: 10 * 1024 * 1024,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const output = this.parseJsonOutput(stdout);

      if (!output) {
        this.log('ERROR: Failed to parse Rector output');
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

      this.log(`SUCCESS: ${output.totals.changed_files} file(s) changed`);

      return result;
    } catch (error: any) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        const errorMsg = `Rector process timed out after ${config.timeout}ms`;
        this.log(`ERROR: ${errorMsg}`);
        return {
          success: false,
          changedFiles: 0,
          error: errorMsg,
        };
      }

      if (error.code === 'ENOENT') {
        const errorMsg = `Rector executable not found: ${config.executablePath}`;
        this.log(`ERROR: ${errorMsg}`);
        return {
          success: false,
          changedFiles: 0,
          error: errorMsg,
        };
      }

      if (error.stdout) {
        try {
          const output = this.parseJsonOutput(error.stdout);
          if (output) {
            const result: RectorResult = {
              success: true,
              changedFiles: output.totals.changed_files,
            };

            this.log(`SUCCESS: ${output.totals.changed_files} file(s) changed`);

            return result;
          }
        } catch (parseError) {
          // Continue to error handling
        }
      }

      const errorMsg = error.message || error.stderr || 'Unknown error';
      this.log(`ERROR: ${errorMsg}`);
      return {
        success: false,
        changedFiles: 0,
        error: errorMsg,
      };
    }
  }

  private parseJsonOutput(stdout: string): RectorJsonOutput | null {
    try {
      const jsonMatch = stdout.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return JSON.parse(stdout);
    } catch (error) {
      return null;
    }
  }

  async clearCache(): Promise<void> {
    const config = this.getConfig();
    const resolvedExecutable = this.resolveExecutablePath(config.executablePath);
    const args = ['process', '--clear-cache'];

    const commandStr = `${resolvedExecutable} ${args.join(' ')}`;
    this.log(`Executing: ${commandStr}`);

    try {
      await execFile(resolvedExecutable, args);
      this.log('SUCCESS: Cache cleared');
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        const errorMsg = `Rector executable not found: ${config.executablePath}`;
        this.log(`ERROR: ${errorMsg}`);
        throw new Error(errorMsg);
      }
      this.log('WARNING: Cache clearing might have failed, but continuing');
    }
  }
}
