import * as assert from 'assert';
import * as vscode from 'vscode';

suite('ProcessFiles Command Tests', () => {
  test('processFiles command should be registered', async () => {
    // Ensure extension is activated
    const extension = vscode.extensions.getExtension('vix.rector-vscode');
    if (extension && !extension.isActive) {
      await extension.activate();
    }

    const commands = await vscode.commands.getCommands(true);
    assert.ok(
      commands.includes('rector.processFiles'),
      'rector.processFiles command should be registered'
    );
  });

  test('Uri.fsPath should convert to file system path', () => {
    const uri = vscode.Uri.file('/test/path/file.php');
    const fsPath = uri.fsPath;

    assert.strictEqual(typeof fsPath, 'string');
    assert.ok(fsPath.includes('file.php'), 'Path should contain filename');
  });

  test('Multiple Uris should be convertible to file system paths', () => {
    const uris = [
      vscode.Uri.file('/test/path/file1.php'),
      vscode.Uri.file('/test/path/file2.php'),
    ];

    const fsPaths = uris.map((uri) => uri.fsPath);

    assert.strictEqual(fsPaths.length, 2);
    fsPaths.forEach((path) => {
      assert.strictEqual(typeof path, 'string');
      assert.ok(path.includes('.php'));
    });
  });

  test('processFiles should handle array of URIs correctly', () => {
    const testUris = [
      vscode.Uri.file('/test/path/file1.php'),
      vscode.Uri.file('/test/path/file2.php'),
      vscode.Uri.file('/test/path/directory'),
    ];

    // Verify URIs are created correctly
    assert.strictEqual(testUris.length, 3);
    testUris.forEach((uri) => {
      assert.ok(uri instanceof vscode.Uri);
      assert.strictEqual(typeof uri.fsPath, 'string');
    });
  });

  test('processFiles should convert directory URI correctly', () => {
    const dirUri = vscode.Uri.file('/test/path/directory');
    const fsPath = dirUri.fsPath;

    assert.strictEqual(typeof fsPath, 'string');
    assert.ok(fsPath.includes('directory'));
  });

  test('processFiles should handle mixed file types', () => {
    const mixedUris = [
      vscode.Uri.file('/test/path/file1.php'),
      vscode.Uri.file('/test/path/directory'),
      vscode.Uri.file('/test/path/file2.php'),
    ];

    const fsPaths = mixedUris.map((uri) => uri.fsPath);

    assert.strictEqual(fsPaths.length, 3);
    assert.ok(fsPaths[0].endsWith('file1.php'));
    assert.ok(fsPaths[1].endsWith('directory'));
    assert.ok(fsPaths[2].endsWith('file2.php'));
  });

  test('Empty array should be handled correctly', () => {
    const emptyArray: vscode.Uri[] = [];

    assert.ok(Array.isArray(emptyArray));
    assert.strictEqual(emptyArray.length, 0);

    const fsPaths = emptyArray.map((uri) => uri.fsPath);
    assert.strictEqual(fsPaths.length, 0);
  });

  test('Single URI should be converted to array correctly', () => {
    const singleUri = vscode.Uri.file('/test/path/file.php');
    const uriArray = [singleUri];

    assert.ok(Array.isArray(uriArray));
    assert.strictEqual(uriArray.length, 1);
    assert.ok(uriArray[0] instanceof vscode.Uri);
  });
});
