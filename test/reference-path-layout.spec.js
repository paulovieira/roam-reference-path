const { test, expect } = require('@playwright/test');

// Regression test for the "母block排版改变" bug: adding the reference path to a
// block must not change the block's own layout. The earlier fix forced
// position:relative on the bullet, which in Roam is position:absolute (in the
// gutter). That override pulled the bullet back into the flow and reflowed the
// block. Here the fixture models the absolute bullet; highlighting must leave the
// parent block's text exactly where it was.
test('highlighting a block does not reflow it', async ({ page }) => {
  await page.goto('/test/fixtures/roam-layout.html');
  await page.waitForFunction(() => window.__rpReady === true);

  const result = await page.evaluate(() => {
    const { addReferencePath, addStyle, internals } = window.__rp;

    Object.assign(internals.settingsCached, {
      bulletColorHex: '#6366f1',
      bulletColorHoverHex: '#818cf8',
      bulletScaleFactor: '1.5',
      referenceColorHex: 'disabled',
      referenceFontWeightValue: 'disabled',
      lineColorHex: '#6366f1',
      lineColorHoverHex: '#818cf8',
      lineWidth: '1px',
      lineStyle: 'solid',
      lineRoundness: '2px',
      lineTopOffset: 'auto',
      lineLeftOffset: 'auto',
    });

    addStyle();

    const parentText = document.querySelector('[data-testid="parent-text"]');
    const before = parentText.getBoundingClientRect();

    // click/edit the child -> its ancestor path (incl. the parent) gets highlighted
    const active = document.querySelector('[data-testid="child-text"]');
    addReferencePath(internals.blockList.mainView, active);

    const after = parentText.getBoundingClientRect();
    const parent = document.querySelector('[data-testid="parent"]');

    return {
      highlighted: parent.dataset.referencePathHasStyle === 'true',
      dLeft: after.left - before.left,
      dWidth: after.width - before.width,
    };
  });

  // the parent block really is on the path (so the styles applied to it)
  expect(result.highlighted).toBe(true);
  // ...yet its text did not move or resize
  expect(Math.abs(result.dLeft)).toBeLessThan(0.5);
  expect(Math.abs(result.dWidth)).toBeLessThan(0.5);
});
