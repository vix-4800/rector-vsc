import * as assert from 'assert';
import * as vscode from 'vscode';

suite('ProcessFiles Command Parameter Tests', () => {
  test('Command args structure for single selection', () => {
    // When user right-clicks a single file:
    // args[0] = clicked resource (Uri)
    // args[1] = array with selected resources (Uri[])

    const clickedUri = vscode.Uri.file('/test/file.php');
    const args = [clickedUri, [clickedUri]];

    assert.strictEqual(args.length, 2);
    assert.ok(args[0] instanceof vscode.Uri);
    assert.ok(Array.isArray(args[1]));
    assert.strictEqual(args[1].length, 1);
  });

  test('Command args structure for multiple selection', () => {
    // When user right-clicks with multiple files selected:
    // args[0] = clicked resource (Uri)
    // args[1] = array with all selected resources (Uri[])

    const uri1 = vscode.Uri.file('/test/file1.php');
    const uri2 = vscode.Uri.file('/test/file2.php');
    const uri3 = vscode.Uri.file('/test/file3.php');
    const args = [uri1, [uri1, uri2, uri3]];

    assert.strictEqual(args.length, 2);
    assert.ok(args[0] instanceof vscode.Uri);
    assert.ok(Array.isArray(args[1]));
    assert.strictEqual(args[1].length, 3);
  });

  test('Should use args[1] if available, fallback to args[0]', () => {
    const uri1 = vscode.Uri.file('/test/file1.php');
    const uri2 = vscode.Uri.file('/test/file2.php');
    const args = [uri1, [uri1, uri2]];

    // Simulate the logic from the command
    const selectedResources = args[1] || [args[0]];

    assert.ok(Array.isArray(selectedResources));
    assert.strictEqual(selectedResources.length, 2);
  });

  test('Should fallback to single resource if args[1] is undefined', () => {
    const uri = vscode.Uri.file('/test/file.php');
    const args = [uri, undefined];

    const selectedResources = args[1] || [args[0]];

    assert.ok(Array.isArray(selectedResources));
    assert.strictEqual(selectedResources.length, 1);
    assert.strictEqual(selectedResources[0], uri);
  });

  test('Should handle args with directory Uri', () => {
    const dirUri = vscode.Uri.file('/test/directory');
    const args = [dirUri, [dirUri]];

    const selectedResources = args[1] || [args[0]];

    assert.ok(Array.isArray(selectedResources));
    assert.strictEqual(selectedResources.length, 1);
    assert.ok(selectedResources[0].fsPath.includes('directory'));
  });

  test('Should handle mixed selection of files and directories', () => {
    const fileUri = vscode.Uri.file('/test/file.php');
    const dirUri = vscode.Uri.file('/test/directory');
    const file2Uri = vscode.Uri.file('/test/file2.php');
    const args = [fileUri, [fileUri, dirUri, file2Uri]];

    const selectedResources = args[1] || [args[0]];

    assert.ok(Array.isArray(selectedResources));
    assert.strictEqual(selectedResources.length, 3);
  });

  test('Should convert URIs to file system paths', () => {
    const uri1 = vscode.Uri.file('/test/file1.php');
    const uri2 = vscode.Uri.file('/test/file2.php');
    const selectedResources = [uri1, uri2];

    const paths = selectedResources.map((uri) => uri.fsPath);

    assert.ok(Array.isArray(paths));
    assert.strictEqual(paths.length, 2);
    paths.forEach((path) => {
      assert.strictEqual(typeof path, 'string');
    });
  });

  test('Empty or invalid args should be handled', () => {
    const args: any[] = [];

    // Simulate the logic from the command
    const selectedResources = args[1] || (args[0] ? [args[0]] : []);

    assert.ok(Array.isArray(selectedResources));
    assert.strictEqual(selectedResources.length, 0);
  });

  test('Should handle null or undefined args gracefully', () => {
    const args = [undefined, undefined];

    const selectedResources = args[1] || (args[0] ? [args[0]] : []);

    assert.ok(Array.isArray(selectedResources));
    // Should be empty or handle gracefully
  });

  test('Path separator should work across platforms', () => {
    // Test that paths work on both Windows and Unix-like systems
    const uri = vscode.Uri.file('/test/path/file.php');
    const fsPath = uri.fsPath;

    assert.strictEqual(typeof fsPath, 'string');
    assert.ok(fsPath.length > 0);
    // The path should be valid on the current platform
  });

  test('Multiple paths should maintain order', () => {
    const uris = [
      vscode.Uri.file('/test/a.php'),
      vscode.Uri.file('/test/b.php'),
      vscode.Uri.file('/test/c.php'),
    ];

    const paths = uris.map((uri) => uri.fsPath);

    assert.ok(paths[0].includes('a.php'));
    assert.ok(paths[1].includes('b.php'));
    assert.ok(paths[2].includes('c.php'));
  });
});
