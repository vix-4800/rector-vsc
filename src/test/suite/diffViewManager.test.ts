import * as assert from 'assert';
import { DiffViewManager } from '../../diffViewManager';

suite('DiffViewManager Unit Tests', () => {
  let diffViewManager: DiffViewManager;

  setup(() => {
    diffViewManager = new DiffViewManager();
  });

  test('DiffViewManager should be instantiated', () => {
    assert.ok(diffViewManager);
    assert.ok(diffViewManager instanceof DiffViewManager);
  });

  test('DiffViewManager should have showDiff method', () => {
    assert.strictEqual(typeof diffViewManager.showDiff, 'function');
  });
});
