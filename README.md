# roam-reference-path

A Roam Research extension that implements the "reference path" for the active block being edited.

Based on previous work done by:

- Dhrumil Shah (@wandcrafting) and Robert Haisfield (@RobertHaisfield): https://www.figma.com/file/5shwLdUCHxSaPNEO7pazbe/
- Azlen Elza (@azlenelza): https://gist.github.com/azlen/cc8d543f0e46e17d978e705650df0e9e

This extension can be installed using Roam Depot. It doesn't manipulate your notes in any way. The reference path is added using a simple css class.

Demo:

![demo](https://user-images.githubusercontent.com/2184309/181415565-16188619-f6c7-4fc4-a467-3b80c40b2a4a.jpg)

## Future improvements
- add options for left,top fine tuning
- review the extension name: "reference path" is also used in Settings -> User (in the context of block references), so it can be confusing.
- [DONE] show the line in the reference path
- [DONE] add as inline array of hex strings (instead of relying on roam to have the tailwind css)
- [DONE] highlight references/tags in the reference path
- [DONE] adjust the top/left according to the scale
- [DONE] improve the reference path for embeded blocks
- test with different themes available in roam depot to check if there are conflicts in the css
- available options:
  * document the in the readme
  * [DONE] dashed vs solid
- [DONE] verify if all the tailwind colors in the css loaded by roam (it seems orange is not present?)
- handle right-to-left
