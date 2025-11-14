import * as assert from 'assert';
import { DiffViewManager } from '../../diffViewManager';

suite('DiffViewManager Close Handler Tests', () => {
  let diffViewManager: DiffViewManager;

  setup(() => {
    diffViewManager = new DiffViewManager();
  });

  teardown(() => {
    diffViewManager.dispose();
  });

  test('DiffViewManager should be instantiated', () => {
    assert.ok(diffViewManager);
    assert.ok(diffViewManager instanceof DiffViewManager);
  });

  test('DiffViewManager should have dispose method', () => {
    assert.strictEqual(typeof diffViewManager.dispose, 'function');
  });

  test('DiffViewManager should cleanup on dispose', () => {
    // Create a new instance
    const manager = new DiffViewManager();

    // Should not throw on dispose
    assert.doesNotThrow(() => {
      manager.dispose();
    });
  });

  test('DiffViewManager should handle multiple dispose calls', () => {
    const manager = new DiffViewManager();

    // Multiple dispose calls should not throw
    assert.doesNotThrow(() => {
      manager.dispose();
      manager.dispose();
      manager.dispose();
    });
  });
});
