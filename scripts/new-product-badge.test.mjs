import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

// Exercise the actual component effect with a deterministic clock and timers.
const source = ts.transpileModule(
  readFileSync(new URL('../components/new-product-badge.tsx', import.meta.url), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } },
).outputText;

function mount(until) {
  let now = Date.parse('2026-09-16T00:00:00Z');
  let visible = false;
  let effect;
  let timer;
  let visibilityListener;
  const exports = {};
  vm.runInNewContext(source, {
    exports,
    require: (name) => name === 'react' ? {
      useState: () => [visible, (value) => { visible = value; }],
      useEffect: (callback) => { effect = callback; },
    } : { jsx: () => null },
    Date: { now: () => now, parse: Date.parse },
    setTimeout: (callback, delay) => { timer = { callback, delay }; return 1; },
    clearTimeout: () => { timer = undefined; },
    document: {
      addEventListener: (_, callback) => { visibilityListener = callback; },
      removeEventListener: () => { visibilityListener = undefined; },
    },
  });
  exports.NewProductBadge({ until });
  const cleanup = effect();
  return {
    get visible() { return visible; },
    get delay() { return timer?.delay; },
    advance(ms) { now += ms; timer?.callback(); },
    wake(ms) { now += ms; visibilityListener?.(); },
    cleanup,
  };
}

test('no badge for missing, invalid, or expired dates', () => {
  for (const until of [null, undefined, '', 'invalid', '2026-09-15T23:59:59Z']) {
    const badge = mount(until);
    assert.equal(badge.visible, false);
    assert.equal(badge.delay, undefined);
    badge.cleanup();
  }
});

test('badge disappears at expiry without a page refresh', () => {
  const badge = mount('2026-09-16T00:00:10Z');
  assert.equal(badge.visible, true);
  assert.equal(badge.delay, 10000);
  badge.advance(10000);
  assert.equal(badge.visible, false);
  assert.equal(badge.delay, undefined);
});

test('long durations respect browser timer limits and recheck on tab wake', () => {
  const badge = mount('2026-10-16T00:00:00Z');
  assert.equal(badge.delay, 2147483647);
  badge.advance(2147483647);
  assert.equal(badge.visible, true);
  assert.ok(badge.delay > 0 && badge.delay < 2147483647);
  badge.wake(30 * 86400000);
  assert.equal(badge.visible, false);
  badge.cleanup();
  assert.equal(badge.delay, undefined);
});
