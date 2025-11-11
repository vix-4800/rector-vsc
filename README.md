# Rector for VS Code

[Rector](https://github.com/rectorphp/rector) integration for Visual Studio Code. Provides automated refactoring for PHP
code.

## Features

- Apply Rector refactoring rules to current file
- Preview changes before applying with diff view
- Optional auto-fix on file save
- Automatic Rector config file detection
- Clear Rector cache

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
- **Rector: Clear Cache** - Clear Rector cache

Commands are available via:

- Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
- Editor context menu (right click)

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
  - `"./vendor/bin/rector"` - project installation
  - `"/home/user/.config/composer/vendor/bin/rector"` - absolute path

### `rector.configPath`

- Type: `string`
- Default: `""`
- Description: Path to Rector configuration file
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

## Example Configuration

Add to `.vscode/settings.json`:

```json
{
  "rector.enabled": true,
  "rector.executablePath": "./vendor/bin/rector",
  "rector.configPath": "./rector.php",
  "rector.enableAutofix": false,
  "rector.showDiffOnSave": false
}
```

## License

MIT
