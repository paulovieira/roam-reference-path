const { test, expect } = require('@playwright/test');

// The reference-path line is positioned from getBoundingClientRect measurements
// taken when the path is drawn. Scrolling fires no DOM mutation, so without a
// scroll handler the line is never recomputed and drifts out of alignment with
// the bullets. This test drives the real observer + scroll handler and asserts a
// scroll recomputes the geometry.
test('reference path is recomputed on scroll', async ({ page }) => {
  await page.goto('/test/fixtures/roam-scroll.html');
  await page.waitForFunction(() => window.__rpReady === true);

  const result = await page.evaluate(async () => {
    const { addReferencePath, addStyle, internals, ext } = window.__rp;

    Object.assign(internals.settingsCached, {
      bulletColorHex: 'disabled',
      bulletScaleFactor: 'disabled',
      referenceColorHex: 'disabled',
      referenceFontWeightValue: 'disabled',
      lineColorHex: '#22c55e',
      lineColorHoverHex: '#22c55e',
      lineWidth: '1px',
      lineStyle: 'solid',
      lineRoundness: '2px',
      lineTopOffset: 'auto',
      lineLeftOffset: 'auto',
    });

    addStyle();

    const target = document.querySelector('div.rm-article-wrapper');
    // registers the real MutationObserver AND the scroll listener under test
    ext.startTemporaryObserver({ target });

    // draw the path from the edited block's textarea (edit mode)
    const textarea = document.querySelector('[data-testid="active-textarea"]');
    internals.isEditing.mainView = true;
    addReferencePath(internals.blockList.mainView, textarea);

    const parent = document.querySelector('[data-testid="parent"]');
    const VAR = '--roam-reference-path-box-height';
    const drawn = parent.style.getPropertyValue(VAR);

    // simulate the line having gone stale (what a scroll leaves behind with no redraw)
    parent.style.setProperty(VAR, '1px');
    const corrupted = parent.style.getPropertyValue(VAR);

    // a scroll must trigger a redraw that restores the correct geometry
    window.dispatchEvent(new Event('scroll'));
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(r))));

    const afterScroll = parent.style.getPropertyValue(VAR);

    return { drawn, corrupted, afterScroll };
  });

  // the path was actually drawn (parent block got a real, positive box height)
  expect(parseFloat(result.drawn)).toBeGreaterThan(0);
  expect(result.corrupted).toBe('1px');
  // scrolling restored the measured geometry -> redraw-on-scroll fired
  expect(result.afterScroll).toBe(result.drawn);
});
