const { test, expect } = require('@playwright/test');

// Tolerance in px. The bug offsets a heading connector by ~10-14px, so a 3px
// tolerance cleanly separates "aligned" (fixed) from "misaligned" (original).
const TOL = 3;

// Runs the real extension code against the fixture DOM and reports, for each
// drawn L-connector, where its endpoints land vs. the actual bullet centres.
async function measure(page) {
  await page.goto('/');
  await page.waitForFunction(() => window.__rpReady === true);

  return page.evaluate(() => {
    const { addReferencePath, addStyle, internals } = window.__rp;

    // seed only what the line drawing needs; disable the rest to isolate geometry
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

    addStyle(); // inject the real ::before CSS rule under test
    const active = document.querySelector('[data-testid="active-text"]');
    addReferencePath(internals.blockList.mainView, active);

    const bulletCenter = (main) => {
      const r = main.querySelector('span.bp3-popover-target').getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    };

    // Reconstruct the ::before box in viewport coords. The ::before is positioned
    // against its containing block: the bullet span itself if positioned,
    // otherwise the span's offsetParent. This stays correct across both the
    // original code (offsetParent = rm-block-main) and the fix (span is relative).
    const beforeBox = (main) => {
      const span = main.querySelector('span.bp3-popover-target');
      const cs = getComputedStyle(span, '::before');
      const origin = getComputedStyle(span).position !== 'static' ? span : span.offsetParent;
      const o = origin.getBoundingClientRect();
      const top = parseFloat(cs.top), left = parseFloat(cs.left);
      const w = parseFloat(cs.width), h = parseFloat(cs.height);
      return { top: o.top + top, left: o.left + left, bottom: o.top + top + h, right: o.left + left + w };
    };

    const ch2 = document.querySelector('[data-testid="ch2"]');
    const pinjie = document.querySelector('[data-testid="pinjie"]');
    const kuoxie = document.querySelector('[data-testid="kuoxie"]');
    const xijie = document.querySelector('[data-testid="xijie"]');

    return {
      // hop parent -> child (the L is drawn on the parent's bullet)
      hop_kuoxie_to_xijie: {
        parent: 'kuoxie(normal)', child: 'xijie(normal)',
        parentCenter: bulletCenter(kuoxie), childCenter: bulletCenter(xijie),
        box: beforeBox(kuoxie), styled: kuoxie.dataset.referencePathHasStyle === 'true',
      },
      hop_pinjie_to_kuoxie: {
        parent: 'pinjie(H2)', child: 'kuoxie(normal)',
        parentCenter: bulletCenter(pinjie), childCenter: bulletCenter(kuoxie),
        box: beforeBox(pinjie), styled: pinjie.dataset.referencePathHasStyle === 'true',
      },
      hop_ch2_to_pinjie: {
        parent: 'ch2(H1)', child: 'pinjie(H2)',
        parentCenter: bulletCenter(ch2), childCenter: bulletCenter(pinjie),
        box: beforeBox(ch2), styled: ch2.dataset.referencePathHasStyle === 'true',
      },
      initialBlockStyled: xijie.dataset.referencePathHasStyle === 'true',
    };
  });
}

function expectConnectorAligned(hop) {
  expect(hop.styled, `${hop.parent} should be on the path`).toBe(true);
  // L starts at the parent bullet centre
  expect(Math.abs(hop.box.top - hop.parentCenter.y),
    `${hop.parent}: connector top (${hop.box.top.toFixed(1)}) should meet parent bullet centre (${hop.parentCenter.y.toFixed(1)})`).toBeLessThanOrEqual(TOL);
  expect(Math.abs(hop.box.left - hop.parentCenter.x),
    `${hop.parent}: connector left should meet parent bullet centre x`).toBeLessThanOrEqual(TOL);
  // L ends at the child bullet centre
  expect(Math.abs(hop.box.bottom - hop.childCenter.y),
    `${hop.parent}->${hop.child}: connector bottom (${hop.box.bottom.toFixed(1)}) should meet child bullet centre (${hop.childCenter.y.toFixed(1)})`).toBeLessThanOrEqual(TOL);
  expect(Math.abs(hop.box.right - hop.childCenter.x),
    `${hop.parent}->${hop.child}: connector right should meet child bullet centre x`).toBeLessThanOrEqual(TOL);
}

test('reference-path connectors align with bullet centres on heading blocks', async ({ page }) => {
  const m = await measure(page);

  // the deepest (active) block is the initial block: it must be marked but draws no line
  expect(m.initialBlockStyled).toBe(true);

  expectConnectorAligned(m.hop_kuoxie_to_xijie); // normal -> normal (no-regression control)
  expectConnectorAligned(m.hop_pinjie_to_kuoxie); // heading -> normal
  expectConnectorAligned(m.hop_ch2_to_pinjie);    // heading -> heading
});
