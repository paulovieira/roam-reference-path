# roam-reference-path

A simple Roam Research extension that implements the "reference path" for the active block being edited.

Based on previous work done by:

- Dhrumil Shah (@wandcrafting) and Robert Haisfield (@RobertHaisfield): https://www.figma.com/file/5shwLdUCHxSaPNEO7pazbe/
- Azlen Elza (@azlenelza): https://gist.github.com/azlen/cc8d543f0e46e17d978e705650df0e9e

This extension can be installed using Roam Depot. It doesn't manipulate your notes in any way. The reference path is added using a css classes.

Demo:

![demo](https://user-images.githubusercontent.com/2184309/181002570-776c715d-c79f-4a03-afa1-1938c5a0a7b4.jpg)

## Future improvements

- show the line in the reference path
- improve the reference path for embeded blocks
- test with different themes available in roam depot to check if there are conflicts in the css
- available options:
  * document the in the readme
  * allow different options for the main page and the sidebar? 
- verify if all the tailwind colors in the css loaded by roam (it seems orange is not present?)
- make sure the assumption made for `editModeProbablyStarted` is correct 
- 
  