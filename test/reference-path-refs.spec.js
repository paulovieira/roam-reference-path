const { test, expect } = require('@playwright/test');

// Regression test for the reflow reported when clicking a child block: the
// parent block contains references (a [[page]] link, a date). The extension used
// to bump their font-weight to 'medium' on highlight; bolder text is wider, so a
// reference near a line-wrap boundary pushed the following text onto a new line
// (the "母block排版改变" the user saw). References are now emphasised with colour
// only, so highlighting cannot change their width and the block cannot reflow.
test('highlighting references changes colour but not width (no reflow)', async ({ page }) => {
  await page.goto('/test/fixtures/roam-refs.html');
  await page.waitForFunction(() => window.__rpReady === true);

  const m = await page.evaluate(() => {
    const { addReferencePath, addStyle, internals } = window.__rp;

    Object.assign(internals.settingsCached, {
      bulletColorHex: '#6366f1', bulletColorHoverHex: '#818cf8', bulletScaleFactor: '1.5',
      referenceColorHex: '#6366f1', referenceColorHoverHex: '#818cf8',
      lineColorHex: '#6366f1', lineColorHoverHex: '#818cf8',
      lineWidth: '1px', lineStyle: 'solid', lineRoundness: '2px',
      lineTopOffset: 'auto', lineLeftOffset: 'auto',
    });

    addStyle();

    const text = document.querySelector('[data-testid="parent-text"]');
    const ref = document.querySelector('[data-testid="ref"]');
    const before = { h: text.getBoundingClientRect().height, refW: ref.getBoundingClientRect().width };

    addReferencePath(internals.blockList.mainView, document.querySelector('[data-testid="child-text"]'));

    const after = { h: text.getBoundingClientRect().height, refW: ref.getBoundingClientRect().width };
    const parent = document.querySelector('[data-testid="parent"]');
    return {
      highlighted: parent.dataset.referencePathHasStyle === 'true',
      refColor: getComputedStyle(ref).color,
      dRefW: after.refW - before.refW,
      dH: after.h - before.h,
    };
  });

  expect(m.highlighted).toBe(true);
  // the reference is still emphasised: it takes the theme colour (#6366f1)
  expect(m.refColor).toBe('rgb(99, 102, 241)');
  // ...but its width is unchanged, so the block cannot reflow
  expect(Math.abs(m.dRefW)).toBeLessThan(0.5);
  expect(Math.abs(m.dH)).toBeLessThan(0.5);
});
