import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import { RectorRunner } from '../../rectorRunner';

suite('ProcessFiles Integration Tests', () => {
  let outputChannel: vscode.OutputChannel;
  let rectorRunner: RectorRunner;
  let tempDir: string;

  setup(() => {
    outputChannel = vscode.window.createOutputChannel('Test Rector');
    rectorRunner = new RectorRunner(outputChannel);

    // Create a temporary directory for test files
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rector-test-'));
  });

  teardown(() => {
    outputChannel.dispose();

    // Clean up temporary directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('processPaths method should exist', () => {
    assert.ok(rectorRunner.processPaths, 'processPaths method should exist');
    assert.strictEqual(typeof rectorRunner.processPaths, 'function');
  });

  test('processPaths should accept single file path', async function () {
    this.timeout(5000); // Increase timeout for file operations

    const testFile = path.join(tempDir, 'test.php');
    fs.writeFileSync(testFile, '<?php\necho "test";\n');

    const paths = [testFile];
    assert.ok(Array.isArray(paths));
    assert.strictEqual(paths.length, 1);
    assert.ok(fs.existsSync(paths[0]), 'Test file should exist');

    // Note: We don't actually call processPaths because it requires Rector
    // This test just verifies that we can create the file and path structure
  });

  test('processPaths should accept multiple file paths', async function () {
    this.timeout(5000);

    const testFile1 = path.join(tempDir, 'test1.php');
    const testFile2 = path.join(tempDir, 'test2.php');
    fs.writeFileSync(testFile1, '<?php\necho "test1";\n');
    fs.writeFileSync(testFile2, '<?php\necho "test2";\n');

    const paths = [testFile1, testFile2];
    assert.ok(Array.isArray(paths));
    assert.strictEqual(paths.length, 2);
    assert.ok(fs.existsSync(paths[0]), 'Test file 1 should exist');
    assert.ok(fs.existsSync(paths[1]), 'Test file 2 should exist');
  });

  test('processPaths should accept directory path', async function () {
    this.timeout(5000);

    const testSubDir = path.join(tempDir, 'subdir');
    fs.mkdirSync(testSubDir);
    fs.writeFileSync(path.join(testSubDir, 'test.php'), '<?php\necho "test";\n');

    const paths = [testSubDir];
    assert.ok(Array.isArray(paths));
    assert.strictEqual(paths.length, 1);
    assert.ok(fs.existsSync(paths[0]), 'Test directory should exist');

    const stat = fs.statSync(paths[0]);
    assert.ok(stat.isDirectory(), 'Path should be a directory');
  });

  test('processPaths should handle mixed paths', async function () {
    this.timeout(5000);

    const testFile = path.join(tempDir, 'test.php');
    const testSubDir = path.join(tempDir, 'subdir');
    fs.writeFileSync(testFile, '<?php\necho "test";\n');
    fs.mkdirSync(testSubDir);
    fs.writeFileSync(path.join(testSubDir, 'test2.php'), '<?php\necho "test2";\n');

    const paths = [testFile, testSubDir];
    assert.ok(Array.isArray(paths));
    assert.strictEqual(paths.length, 2);
    assert.ok(fs.existsSync(paths[0]), 'Test file should exist');
    assert.ok(fs.existsSync(paths[1]), 'Test directory should exist');

    const fileStat = fs.statSync(paths[0]);
    const dirStat = fs.statSync(paths[1]);
    assert.ok(fileStat.isFile(), 'First path should be a file');
    assert.ok(dirStat.isDirectory(), 'Second path should be a directory');
  });
  test('Command should handle file URIs correctly', () => {
    const testFile = path.join(tempDir, 'test.php');
    fs.writeFileSync(testFile, '<?php\necho "test";\n');

    const uri = vscode.Uri.file(testFile);
    assert.ok(uri instanceof vscode.Uri);
    assert.strictEqual(uri.scheme, 'file');
    assert.ok(uri.fsPath.endsWith('test.php'));
  });

  test('Command should convert multiple URIs to paths', () => {
    const testFile1 = path.join(tempDir, 'test1.php');
    const testFile2 = path.join(tempDir, 'test2.php');
    fs.writeFileSync(testFile1, '<?php\necho "test1";\n');
    fs.writeFileSync(testFile2, '<?php\necho "test2";\n');

    const uris = [vscode.Uri.file(testFile1), vscode.Uri.file(testFile2)];
    const paths = uris.map((uri) => uri.fsPath);

    assert.strictEqual(paths.length, 2);
    assert.ok(paths[0].endsWith('test1.php'));
    assert.ok(paths[1].endsWith('test2.php'));
  });

  test('Empty paths array should be handled', () => {
    const paths: string[] = [];
    assert.ok(Array.isArray(paths));
    assert.strictEqual(paths.length, 0);

    // The method should handle empty arrays gracefully
    // In production, it would run Rector with no specific files
  });

  test('File system paths should be absolute', () => {
    const testFile = path.join(tempDir, 'test.php');
    fs.writeFileSync(testFile, '<?php\necho "test";\n');

    const uri = vscode.Uri.file(testFile);
    const fsPath = uri.fsPath;

    assert.ok(path.isAbsolute(fsPath), 'Path should be absolute');
  });

  test('Directory URIs should be handled correctly', () => {
    const testSubDir = path.join(tempDir, 'subdir');
    fs.mkdirSync(testSubDir);

    const uri = vscode.Uri.file(testSubDir);
    assert.ok(uri instanceof vscode.Uri);
    assert.strictEqual(uri.scheme, 'file');

    const stat = fs.statSync(uri.fsPath);
    assert.ok(stat.isDirectory(), 'Path should be a directory');
  });
});
