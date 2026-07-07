## [Unreleased]

### Fixed
 - the reference path line is now aligned with the bullet on heading blocks (h1/h2/h3) and on blocks with tall content (embeds/images). The line offset and endpoints are measured from the actual bullet elements instead of a fixed constant that assumed a single-line text block. This also removes the need for the Roam-Studio-specific offset constants.
 - adding the reference path no longer reflows the block. The connector is anchored to the bullet's real containing block without changing any element's `position` (an earlier approach forced position:relative on the bullet, which Roam positions absolutely in the gutter, pushing the block text to the right).
 - the reference path line no longer drifts out of alignment after scrolling. It is measured with getBoundingClientRect, so it is now recomputed on scroll (throttled to one redraw per animation frame) while a block is being edited.

### Added
 - automated regression tests (Playwright + synthetic Roam DOM fixtures) covering connector alignment on heading/normal blocks, no-reflow on highlight, and recomputation on scroll: `npm test`

## [1] -- 2022-07-26

### Added
 - initial version

### Changed
### Fixed
