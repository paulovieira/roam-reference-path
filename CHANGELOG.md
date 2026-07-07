## [Unreleased]

### Fixed
 - the reference path line is now aligned with the bullet on heading blocks (h1/h2/h3) and on blocks with tall content (embeds/images). The line offset and endpoints are measured from the actual bullet elements instead of a fixed constant that assumed a single-line text block. This also removes the need for the Roam-Studio-specific offset constants.
 - adding the reference path no longer reflows the block. Two things caused it: (1) the connector forced position:relative on the bullet, which Roam positions absolutely in the gutter, pushing the block text right — the connector is now anchored to the bullet's real containing block without changing any element's `position`; (2) references in a path block were bolded (font-weight), and bolder text is wider, so a reference near a line-wrap boundary pushed text onto another line — references are now emphasised with colour only.
 - the reference path line no longer drifts out of alignment after scrolling. It is measured with getBoundingClientRect, so it is now recomputed on scroll (throttled to one redraw per animation frame) while a block is being edited.

### Removed
 - the "References: font weight" setting. Bolding references changes their width and reflows the block; the colour emphasis alone marks them without moving anything.

## [1] -- 2022-07-26

### Added
 - initial version

### Changed
### Fixed
