## [Unreleased]

### Fixed
 - the reference path line is now aligned with the bullet on heading blocks (h1/h2/h3) and on blocks with tall content (embeds/images). The line offset and endpoints are measured from the actual bullet elements instead of a fixed constant that assumed a single-line text block. This also removes the need for the Roam-Studio-specific offset constants.

### Added
 - automated regression test (Playwright + a synthetic Roam DOM fixture) covering the connector alignment for heading and normal blocks: `npm test`

## [1] -- 2022-07-26

### Added
 - initial version

### Changed
### Fixed
