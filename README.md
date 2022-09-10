# roam-reference-path

## Introduction 

A Roam Research extension that implements the "reference path" for the active block being edited.

Based on previous work done by:

- Dhrumil Shah (@wandcrafting) and Robert Haisfield (@RobertHaisfield): https://www.figma.com/file/5shwLdUCHxSaPNEO7pazbe/
- Azlen Elza (@azlenelza): https://gist.github.com/azlen/cc8d543f0e46e17d978e705650df0e9e

This extension can be installed using Roam Depot. It doesn't manipulate your notes in any way. The reference path is added using a simple css class.

Demo:

![demo](https://user-images.githubusercontent.com/2184309/181415565-16188619-f6c7-4fc4-a467-3b80c40b2a4a.jpg)


## Available settings

The settings can be grouped in 3 categories:

- settings for the bullets
- settings for the lines
- settings for the references

(more details soon)


## Available modes and settings

2 modes: edit and hover (each of them can be enabled/disabled)

Edit mode: the reference path is shown when some block is being edited
Hover mode: the reference path is shown when the mouse hover over a block

If both modes are enabled, hover mode works only when there is no block being edited

(more details soon)




## Future improvements
- document the available options (or at least show a printscreen of the settings screen)
- review the extension name: "reference path" is also used in Settings -> User (in the context of block references), so it can be confusing.
- test with different themes available in roam depot to check if there are conflicts in the css
- handle right-to-left
- [DONE] add options for left,top fine tuning
- [DONE] show the line in the reference path
- [DONE] add as inline array of hex strings (instead of relying on roam to have the tailwind css)
- [DONE] highlight references/tags in the reference path
- [DONE] adjust the top/left according to the scale
- [DONE] improve the reference path for embeded blocks

