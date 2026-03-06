# Rector for VS Code

[Rector](https://github.com/rectorphp/rector) integration for Visual Studio Code. Provides automated refactoring for PHP
code.

## Features

- Apply Rector refactoring rules to current file
- **Refactor multiple files and folders** via Explorer context menu
- Preview changes before applying with diff view
- Optional auto-fix on file save
- **Lint on save** — highlights lines Rector would change without modifying the file, with quick-fix actions to apply or diff
- **CodeLens buttons** for quick access to Rector commands directly in PHP files
- Automatic Rector config file detection
- Clear Rector cache
- Output channel with detailed logging of Rector commands and results

## Requirements

- Rector installed globally or in project
- Rector configuration file (`rector.php`)

## Installation

Install Rector globally:

```bash
composer global require rector/rector
```

Or in your project:

```bash
composer require --dev rector/rector
```

## Usage

### Commands

- **Rector: Process Current File** - Apply Rector to the current file
- **Rector: Process Current File (Show Diff)** - Preview changes before applying
- **Rector: Refactor Selected Files/Folders** - Apply Rector to selected files or folders in Explorer
- **Rector: Clear Cache** - Clear Rector cache
- **Rector: Show Output** - Open the PHP Rector output channel

Commands are available via:

- Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
- Editor context menu (right click)
- **Explorer context menu** (right click on files or folders)

## Configuration

### `rector.enabled`

- Type: `boolean`
- Default: `true`
- Description: Enable/disable the extension

### `rector.executablePath`

- Type: `string`
- Default: `"rector"`
- Description: Path to Rector executable. Supports VS Code variables.
- Examples:
  - `"rector"` - global installation
  - `"./vendor/bin/rector"` - project installation (relative to workspace)
  - `"~/bin/rector"` - home directory expansion
  - `"${workspaceFolder}/vendor/bin/rector"` - using workspace variable
  - `"/home/user/.config/composer/vendor/bin/rector"` - absolute path

### `rector.configPath`

- Type: `string`
- Default: `""`
- Description: Path to Rector configuration file. Supports VS Code variables.
- Examples:
  - `""` - empty (auto-detection)
  - `"./rector.php"` - relative to workspace
  - `"~/config/rector.php"` - home directory expansion
  - `"${workspaceFolder}/rector.php"` - using workspace variable
  - `"${workspaceFolder}/config/rector.php"` - config in subdirectory
  - `"/absolute/path/to/rector.php"` - absolute path
- Note: If not specified, the extension searches for `rector.php` or `rector.php.dist` in parent directories

### Supported Variables

The following VS Code variables are supported in `rector.executablePath` and `rector.configPath`:

- `${workspaceFolder}` - The path of the folder opened in VS Code
- `${workspaceFolderBasename}` - The name of the folder opened in VS Code without slashes
- `${file}` - The current opened file (context-dependent)
- `${fileBasename}` - The current opened file's basename
- `${fileBasenameNoExtension}` - The current opened file's basename with no extension
- `${fileExtname}` - The current opened file's extension
- `${fileDirname}` - The current opened file's directory
- `${fileDirnameBasename}` - The current opened file's directory name
- `${userHome}` - The path of the user's home directory

### `rector.enableAutofix`

- Type: `boolean`
- Default: `false`
- Description: Automatically apply Rector changes on file save

### `rector.showDiffOnSave`

- Type: `boolean`
- Default: `false`
- Description: Show diff before applying changes on save (only works if `enableAutofix` is enabled)

### `rector.clearCacheBeforeRun`

- Type: `boolean`
- Default: `false`
- Description: Clear Rector cache before each run

### `rector.enableCodeLens`

- Type: `boolean`
- Default: `true`
- Description: Enable/disable CodeLens buttons in PHP files for quick access to Rector commands
- Note: CodeLens buttons appear at the top of each PHP file and provide quick actions:
  - **Run Rector** - Apply changes immediately
  - **Run Rector (Show Diff)** - Preview changes before applying

### `rector.lintOnSave` _(Experimental)_

- Type: `boolean`
- Default: `false`
- Description: Run Rector in dry-run mode on every save and highlight lines that would be changed, without modifying the file
- Notes:
  - Changed lines are shown as `Information` diagnostics in the editor gutter and the Problems panel with the message **"Rector: improvement available"**
  - A spinner appears in the status bar while the analysis is running
  - A quick-fix lightbulb (`Ctrl+.`) on any highlighted line offers **Apply Rector changes** and **Show Rector diff** actions
  - Diagnostics are cleared automatically when the file is closed or changes are applied
  - Cannot be combined with `rector.enableAutofix` — if autofix is enabled it takes priority

## Example Configuration

Add to `.vscode/settings.json`:

```json
{
  "rector.enabled": true,
  "rector.executablePath": "${workspaceFolder}/vendor/bin/rector",
  "rector.configPath": "${workspaceFolder}/rector.php",
  "rector.enableAutofix": false,
  "rector.showDiffOnSave": false,
  "rector.enableCodeLens": true,
  "rector.lintOnSave": false
}
```

## License

[MIT License](LICENSE)
