# Rector for VS Code

[Rector](https://github.com/rectorphp/rector) integration for Visual Studio Code. Provides automated refactoring for PHP
code.

## Features

- Apply Rector refactoring rules to current file
- **Refactor multiple files and folders** via Explorer context menu
- Preview changes before applying with diff view
- Optional auto-fix on file save
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
- Description: Path to Rector executable
- Examples:
  - `"rector"` - global installation
  - `"./vendor/bin/rector"` - project installation (relative to workspace)
  - `"~/bin/rector"` - home directory expansion
  - `"/home/user/.config/composer/vendor/bin/rector"` - absolute path

### `rector.configPath`

- Type: `string`
- Default: `""`
- Description: Path to Rector configuration file
- Example:
  - `""` - empty (auto-detection)
  - `"./rector.php"` - relative to workspace
  - `"~/config/rector.php"` - home directory expansion
  - `"/absolute/path/to/rector.php"` - absolute path
- Note: If not specified, the extension searches for `rector.php` or `rector.php.dist` in parent directories

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

## Example Configuration

Add to `.vscode/settings.json`:

```json
{
  "rector.enabled": true,
  "rector.executablePath": "./vendor/bin/rector",
  "rector.configPath": "./rector.php",
  "rector.enableAutofix": false,
  "rector.showDiffOnSave": false,
  "rector.enableCodeLens": true
}
```

## License

[MIT License](LICENSE)
