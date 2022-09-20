// based on previous work done by:
// - Dhrumil Shah (@wandcrafting) and Robert Haisfield (@RobertHaisfield): https://www.figma.com/file/5shwLdUCHxSaPNEO7pazbe/
// - Azlen Elza (@azlenelza): https://gist.github.com/azlen/cc8d543f0e46e17d978e705650df0e9e

let internals = {};

internals.extensionId = 'roam-reference-path';

// dev mode can activated by using the special key/value 'dev=true' in the query string;
// example: https://roamresearch.com?dev=true/#/app/<GRAPH_NAME>

internals.isDev = String(new URLSearchParams(window.location.search).get('dev')).includes('true');
internals.extensionAPI = null;
internals.cleaners = [];

internals.settingsCached = {
	color: null,

	bulletColorShade: null,
	bulletScaleFactor: null,

	referenceColorShade: null,
	referenceFontWeightDescription: null,

	lineColorShade: null,
	lineWidth: null,
	lineStyle: null,
	lineRoundness: null,
	showOnHover: null,
	lineTopOffset: null,
	lineLeftOffset: null,

	// derived settings

	bulletColorHex: null,  // derived from color + bulletColorShade
	referenceColorHex: null,  // derived from color + referenceColorShade
	lineColorHex: null,  // derived from color + lineColorShade
	referenceFontWeightValue: null,  // derived from referenceFontWeightDescription
};

internals.settingsDefault = {
	color: 'indigo',

	bulletColorShade: '500',
	bulletScaleFactor: '1.5',
	
	referenceColorShade: '500',
	referenceFontWeightDescription: 'medium',

	lineColorShade: '500',
	lineWidth: '1px',
	lineStyle: 'solid',
	lineRoundness: '2px',
	showOnHover: false,
	lineTopOffset: 'auto',
	lineLeftOffset: 'auto',
};

internals.installedExtensions = {
	roamStudio: false,  // https://github.com/rcvd/RoamStudio
}

internals.serial = 0;

function onload({ extensionAPI }) {

	log('ONLOAD (start)');

	internals.extensionAPI = extensionAPI;

	initializeSettings();
	resetStyle();

	startPermanentObserver({ target: document.querySelector('div.roam-main') });
	startPermanentObserver({ target: document.querySelector('div#right-sidebar') });

	startTemporaryObserver({ target: document.querySelector('div.rm-article-wrapper') });
	startTemporaryObserver({ target: document.querySelector('div#roam-right-sidebar-content') });

	log('ONLOAD (end)');
}

function onunload() {

	log('ONUNLOAD (start)');

	stopObserver({ target: 'all' });
	removeStyle();

	log('ONUNLOAD (end)');
}

function log() {
	
	let isProd = !internals.isDev;

	if (isProd) { return }

	console.log(`${internals.extensionId} ${Date.now()}]`, ...arguments);
}

function initializeSettings() {

	log('initializeSettings');

	let panelConfig = {
		tabTitle: `Reference Path${internals.isDev ? ' (dev)' : ''}`,
		settings: []
	};

	panelConfig.settings.push({
		id: 'color',
		name: 'Main color',
		// description: '...',
		action: {
			type: 'select',
			// roam uses tailwindcss, but the full color palette is not available in the css loaded by roam; 
			// so we add  the full palette manually in internals.tailwindColors (at the bottom);
			items: ['gray', 'slate (gray variant)', 'zinc (gray variant)', 'neutral (gray variant)', 'stone (gray variant)', 'red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald', 'teal', 'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose'],
			onChange: value => { updateSettingsCached({ key: 'color', value }) },
		}		
	});

	panelConfig.settings.push({
		id: 'bulletColorShade',
		name: 'Bullets: color shade',
		description: '100 is light; 900 is dark. Values between 400 and 600 should be good for most people. See the full color palette here: https://tailwindcss.com/docs/customizing-colors',
		action: {
			type: 'select',
			items: ['disabled', '100', '200', '300', '400', '500', '600', '700', '800', '900'],
			onChange: value => { updateSettingsCached({ key: 'bulletColorShade', value }) },
		}		
	});

	panelConfig.settings.push({
		id: 'bulletScaleFactor',
		name: 'Bullets: scale factor',
		description: 'Use 2 to make the bullet size twice of the original size.',
		action: {
			type: 'select',
			items: ['disabled', '1.25', '1.5', '1.75', '2', '2.25', '2.5'],
			onChange: value => { updateSettingsCached({ key: 'bulletScaleFactor', value }) },
		},
	});

	panelConfig.settings.push({
		id: 'referenceColorShade',
		name: 'References (double brackets and tags): color shade',
		description: 'See the description given for bullets.',
		action: {
			type: 'select',
			items: ['disabled', '100', '200', '300', '400', '500', '600', '700', '800', '900'],
			onChange: value => { updateSettingsCached({ key: 'referenceColorShade', value }) },
		}		
	});

	panelConfig.settings.push({
		id: 'referenceFontWeightDescription',
		name: 'References (double brackets and tags): font weight',
		// description: 'Make the references that belong to blocks in the active path stand out.',
		action: {
			type: 'select',
			// weight names corresponding to ['300', '400', '500', '600', '700']
			items: ['disabled', 'light', 'normal', 'medium', 'semibold', 'bold'],
			onChange: value => { updateSettingsCached({ key: 'referenceFontWeightDescription', value }) },
		},
	});

	panelConfig.settings.push({
		id: 'lineColorShade',
		name: 'Lines: color shade',
		description: 'See the description given for bullets. If this setting is disabled, the remaining settings for lines will also be disabled.',
		action: {
			type: 'select',
			items: ['disabled', '100', '200', '300', '400', '500', '600', '700', '800', '900'],
			onChange: value => { updateSettingsCached({ key: 'lineColorShade', value }) },
		}		
	});

	panelConfig.settings.push({
		id: 'lineWidth',
		name: 'Lines: width',
		description: '',
		action: {
			type: 'select',
			// TODO: consider subpixel values? does any browser actually implements them for border-width?
			items: ['1px', '2px', '3px'],
			onChange: value => { updateSettingsCached({ key: 'lineWidth', value }) },
		},
	});

	panelConfig.settings.push({
		id: 'lineStyle',
		name: 'Lines: style',
		description: 'See examples here: https://developer.mozilla.org/en-US/docs/Web/CSS/border-style',
		action: {
			type: 'select',
			items: ['solid', 'dotted', 'dashed'],
			onChange: value => { updateSettingsCached({ key: 'lineStyle', value }) },
		},
	});

	panelConfig.settings.push({
		id: 'lineRoundness',
		name: 'Lines: corner roundness',
		description: 'Use 0px for no roundness, that is, to get right angle corners.',
		action: {
			type: 'select',
			items: ['0px', '1px', '2px', '3px', '4px', '5px', '6px', '7px', '8px', '9px'],
			onChange: value => { updateSettingsCached({ key: 'lineRoundness', value }) },
		},
	});

	panelConfig.settings.push({
		id: 'showOnHover',
		name: 'Hover mode',
		description: 'Show reference path on hover (when there is no block being edited).',
		action: {
			type: 'switch',
			onChange: ev => { updateSettingsCached({ key: 'showOnHover', value: ev.target.checked }) },
		},
	});

	panelConfig.settings.push({
		id: 'lineTopOffset',
		name: 'Lines: top offset (ADVANCED)',
		description: 'Use a value different from auto only if the line seems out of place vertically. Recommended values are between 9.5px and 10.5px (depends on the line width).',
		action: {
			type: 'select',
			items: ['auto', '6.5px', '7.0px', '7.5px', '8px', '8.5px', '9px', '9.5px', '10px', '10.5px', '11px', '11.5px', '12.0px', '12.5px'],
			onChange: value => { updateSettingsCached({ key: 'lineTopOffset', value }) },
		},
	});

	panelConfig.settings.push({
		id: 'lineLeftOffset',
		name: 'Lines: left offset (ADVANCED)',
		description: 'Use a value different from auto only if the line seems out of place horizontally. Recommended values are between 5px and 6px (depends on the line width).',
		action: {
			type: 'select',
			items: ['auto', '3.5px', '4px', '4.5px', '5px', '5.5px', '6px', '6.5px', '7px', '7.5px', '8px', '8.5px'],
			onChange: value => { updateSettingsCached({ key: 'lineLeftOffset', value }) },
		},
	});

	let { extensionAPI } = internals;

	extensionAPI.settings.panel.create(panelConfig);

	let settingsKeys = panelConfig.settings.map(o => o.id);

	// cache the panel settings internally for best performance;
	// if necessary, initialize the panel settings with our default values;
	// the styles will be reseted manually in onload, to avoid adding/removing
	// incomplete style tag several times;

	for (let key of settingsKeys) {
		let value = extensionAPI.settings.get(key);

		if (value == null) {
			value = internals.settingsDefault[key];
			extensionAPI.settings.set(key, value);
		}
		
		updateSettingsCached({ key, value, resetStyle: false });
	}

	// detect if other extensions are loaded; if so we might need to make a few tweaks;

	internals.installedExtensions.roamStudio = (document.querySelectorAll('style[id^="roamstudio"]').length > 0);
}

function updateSettingsCached({ key, value, resetStyle: _resetStyle }) {

	internals.settingsCached[key] = value;

	// derived settings

	let { bulletColorShade, referenceColorShade, lineColorShade, referenceFontWeightDescription } = internals.settingsCached;

	internals.settingsCached.bulletColorHex = getColorHex({ shade: bulletColorShade });
	internals.settingsCached.referenceColorHex = getColorHex({ shade: referenceColorShade });
	internals.settingsCached.lineColorHex = getColorHex({ shade: lineColorShade });
	internals.settingsCached.referenceFontWeightValue = getFontWeightValue({ fontWeightDescription: referenceFontWeightDescription });
	
	// styles are reseted here, unless we explicitly turn it off

	if (_resetStyle !== false) {
		resetStyle();
	}

	log('updateSettingsCached', { key, value, 'internals.settingsCached': internals.settingsCached });
}

function getColorHex({ shade }) {

	let { color } = internals.settingsCached;

	if (shade === 'disabled' || color == null) { return 'disabled' } 

	color = color.split('(')[0].trim();  // strip the '(' from the grays
	let shadeIdx = Math.floor(Number(shade) / 100);  // we want a mapping like { 50: 0, 100: 1, 200: 2, ... }
	let colorHex = internals.tailwindColors[color][shadeIdx];

	return colorHex;
}

function getFontWeightValue({ fontWeightDescription }) {

	// https://developer.mozilla.org/en-US/docs/Web/CSS/font-weight#common_weight_name_mapping

	let nameToValue = {
		'light': '300',
		'normal': '400',
		'medium': '500',
		'semibold': '600',
		'bold': '700',
		'disabled': 'disabled'
	}

	return nameToValue[fontWeightDescription];
}

function resetStyle() {

	// we have to resort to dynamic stylesheets (instead of using extension.css directly) to be able
	// to support the 'disabled' option in our settings (when 'disabled' is selected, we don't add  
	// any css at all relative to that setting/feature); this is the simplest way to avoid having 
	// css rules that might conflict with other extensions/themes;

	// on top of that, the fact that css cascade doesn't work as expected with css custom variables is 
	// another reason to use dynamic styles; more details here: https://adactio.com/journal/16993

	removeStyle();

	// use setTimeout to make sure our css styles are loaded after styles from other extensions

	setTimeout(addStyle, internals.isDev ? 200 : 100);
}

function removeStyle() {

	log('removeStyle');

	// we assume no one else has added a <style data-extension-id="reference-path-28373625"> before, which seems
	// to be a strong hypothesis

	let extensionStyles = Array.from(document.head.querySelectorAll(`style[data-extension-id^="${internals.extensionId}"]`));

	for (let styleEl of extensionStyles) {
		styleEl.remove()	
	}
}

function addStyle() {

	log('addStyle');

	let { extensionId } = internals;
	let textContent = '';

	if (internals.settingsCached.bulletColorHex !== 'disabled') {
		textContent += `
			.${extensionId} > div.controls span.rm-bullet__inner,
			.${extensionId} > div.controls span.rm-bullet__inner--user-icon {
				background-color: var(--${extensionId}-bullet-color);
			}
		`;
	}

	if (internals.settingsCached.bulletScaleFactor !== 'disabled') {
		textContent += `
			.${extensionId} > div.controls span.rm-bullet__inner,
			.${extensionId} > div.controls span.rm-bullet__inner--user-icon {
				transform: scale(var(--${extensionId}-bullet-scale-factor));
			}
		`;
	}

	if (internals.settingsCached.referenceColorHex !== 'disabled') {
		textContent += `
			.${extensionId} > div.rm-block-text span.rm-page-ref__brackets {
				color: var(--${extensionId}-brackets-color);
			}

			.${extensionId} > div.rm-block-text span.rm-page-ref--link {
				color: var(--${extensionId}-link-color);
			}

			.${extensionId} > div.rm-block-text span.rm-page-ref--tag {
				color: var(--${extensionId}-link-color);
			}
		`;
	}

	if (internals.settingsCached.referenceFontWeightValue !== 'disabled') {
		textContent += `
			.${extensionId} > div.rm-block-text span.rm-page-ref__brackets {
				font-weight:  var(--${extensionId}-brackets-weight);
			}

			.${extensionId} > div.rm-block-text span.rm-page-ref--link {
				font-weight:  var(--${extensionId}-link-weight);
			}

			.${extensionId} > div.rm-block-text span.rm-page-ref--tag {
				font-weight:  var(--${extensionId}-link-weight);
			}
		`;
	}

	if (internals.settingsCached.lineColorHex !== 'disabled') {
		textContent += `
			.${extensionId} > div.controls span.bp3-popover-target::before {
				border-color: var(--${extensionId}-line-color);
				border-width: var(--${extensionId}-line-width);
				border-style: var(--${extensionId}-line-style);
				border-bottom-left-radius: var(--${extensionId}-line-roundness);
				position: absolute;
				top: var(--${extensionId}-line-top-offset);
				left: var(--${extensionId}-line-left-offset);
				width: var(--${extensionId}-box-width); 
				height: var(--${extensionId}-box-height);
				content: '';
				border-right: none;
				border-top: none;
				pointer-events: none;
				z-index: 11;
			}
		`;
	}
	
	let extensionStyle = document.createElement('style');

	extensionStyle.textContent = textContent;
	extensionStyle.dataset.extensionId = `${extensionId}-${Date.now()}`;
	extensionStyle.dataset.title = `dynamic styles added by the ${extensionId} extension`;

	document.head.appendChild(extensionStyle);
}

function startTemporaryObserver ({ target }) {

	if (target == null) { return }

	log('main');

	// private array to store a list of div.rm-block-main (the elements where we will add
	// our custom css properties)

	let blockList = [];  

	// there is some evidence that getElementsByTagName is faster than querySelector
	// https://humanwhocodes.com/blog/2010/09/28/why-is-getelementsbytagname-faster-that-queryselectorall/
	// https://gomakethings.com/javascript-selector-performance/

	// this assumes that the only textarea element inside target is the one that exists
	// when a block is being edited

	let textareaLiveList = target.getElementsByTagName('textarea');

	let isEditing = false;

	let onMouseEnter = function onMouseEnter (ev) {
		// console.log('onMouseEnter @ ' + Date.now())
		if (isEditing || !internals.settingsCached.showOnHover) { return }

		removeReferencePath(blockList);
		blockList = addReferencePath(ev.target);
	}

	let onMouseLeave = function onMouseLeave (ev) {
		// console.log('onMouseLeave @ ' + Date.now())
		if (isEditing || !internals.settingsCached.showOnHover) { return }

		removeReferencePath(blockList);
		blockList = [];
	}

	let addHoverListeners = function addHoverListeners (ev) {

		// get blocks without hover listeners and add our listeners to them

		let array = Array.from(target.querySelectorAll(`div.roam-block:not([data-reference-path-has-hover-listeners])`));

		for (let idx = 0; idx < array.length; idx++) {
			let el = array[idx];

			el.addEventListener('mouseenter', onMouseEnter);
			el.addEventListener('mouseleave', onMouseLeave);
			el.dataset.referencePathHasHoverListeners = 'true';
		}
	}

	let removeHoverListeners = function removeHoverListeners (ev) {

		// get blocks with hover listeners and remove our listeners from them

		let array = Array.from(target.querySelectorAll(`div.roam-block[data-reference-path-has-hover-listeners]`));

		for (let idx = 0; idx < array.length; idx++) {
			let el = array[idx];

			el.removeEventListener('mouseenter', onMouseEnter);
			el.removeEventListener('mouseleave', onMouseLeave);
			delete el.dataset.referencePathHasHoverListeners;

			// the delete statement above might not work in safari <= 10 (https://stackoverflow.com/a/9201264/4174108)
		}
	}

	// reference: https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver/MutationObserver

	let callback = function observerCallbackForTextarea (mutationList) {

		// return early 1: typing in the active block (in edit mode)

		let mutationCount = mutationList.length;
		let isProbablyTyping = (mutationCount === 1);

		if (isProbablyTyping) {

			let mutation0 = mutationList[0];

			// 2 cases to consider
			// 1) the textarea/block does not become empty with the mutation (common case)
			// 2) the textarea/block becomes empty (example: using the backspace on the last character)

			let isMutationForTyping = true
				&& mutation0.target.tagName === 'TEXTAREA'
				&& (false
					|| (mutation0.addedNodes.length === 1 && mutation0.addedNodes[0].nodeType === 3)  
					|| (mutation0.removedNodes.length === 1 && mutation0.removedNodes[0].nodeType === 3)
				);

			if (isMutationForTyping) { return; }
		}

		// return early 2: are there any other special cases to consider?

		if (internals.isDev) {
			log('observerCallback', { mutationList });
		}


		// is there any situation where we 2 or more textareas?

		if (internals.isDev && textareaLiveList.length > 1) { debugger }

		// common case: when the textarea exists somewhere
		
		if (textareaLiveList.length > 0 /*&& textareaLiveList.item(0).contains(document.activeElement)*/) {
			removeReferencePath(blockList);
			blockList = addReferencePath(textareaLiveList.item(0));	
			isEditing = true;
		}
		else if (textareaLiveList.length === 0) {
			if (document.activeElement != null && document.activeElement.className.includes('cm-content') && target.contains(document.activeElement)) {

				// edge case: there is no textarea and the focus IS in a code block that is a child of target

				let closestBlock = document.activeElement.closest('div.rm-block-main');
				let referencePathAlreadyAdded = closestBlock.className.includes(internals.extensionId);
				// console.log('referencePathAlreadyAdded', referencePathAlreadyAdded, Date.now())
				if (!referencePathAlreadyAdded) {
					removeReferencePath(blockList);
					blockList = addReferencePath(document.activeElement);
				}

				isEditing = true;
			}
			else {

				// common case: there is no textarea and the focus IS NOT in a code block

				removeReferencePath(blockList);
				blockList = [];
				isEditing = false;
			}
		}

		if (internals.settingsCached.showOnHover) {
			addHoverListeners(target);
		}

	};

	// for the temporary observers we want to monitor the target element and the entire subtree 
	// of elements rooted at target; more details:
	// https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver/observe#parameters

	// we also use the characterData option to observe changes in code editor blocks 
	// (useful in particular when syntax highlighting is set to "plain text")

	let options = {
		subtree: true,
		childList: true,
		characterData: true, 
	}

	let { observer, observerId } = startObserver({ target, callback, options });
	
	if (observer != null) {
		internals.cleaners.push({ 
			observerId,
			handler: () => { 

				log('cleaner for temporary observer', { observerId });

				observer.disconnect();
				delete target.dataset.observerId;
				removeReferencePath(blockList);
				blockList = [];
				removeHoverListeners(target);
			} 
		});

		// note that addHoverListeners is also called in the observer callback; there is no problem 
		// in having it here also because it won't add listeners for elements that already have them;
		// in fact this call is necessary here because the callback is not always called immediatelly 
		// after we start the observer, and we need to add the hover listeners at this point;

		if (internals.settingsCached.showOnHover) {
			addHoverListeners(target);
		}
	}
}

function removeReferencePath(_blockList) {

	internals.isDev && log('removeReferencePath');

	if (_blockList.length === 0) { return }

	let { extensionId } = internals;

	for (let idx = 0; idx < _blockList.length; idx++) {
		let blockEl = _blockList[idx];

		blockEl.style.removeProperty(`--${extensionId}-bullet-scale-factor`);
		blockEl.style.removeProperty(`--${extensionId}-bullet-color`);
		
		blockEl.style.removeProperty(`--${extensionId}-brackets-color`);
		blockEl.style.removeProperty(`--${extensionId}-brackets-weight`);
		blockEl.style.removeProperty(`--${extensionId}-link-color`);
		blockEl.style.removeProperty(`--${extensionId}-link-weight`);

		blockEl.style.removeProperty(`--${extensionId}-line-color`);
		blockEl.style.removeProperty(`--${extensionId}-line-roundness`);
		blockEl.style.removeProperty(`--${extensionId}-line-width`);
		blockEl.style.removeProperty(`--${extensionId}-line-style`);
		blockEl.style.removeProperty(`--${extensionId}-line-top-offset`);
		blockEl.style.removeProperty(`--${extensionId}-line-left-offset`);

		blockEl.style.removeProperty(`--${extensionId}-box-width`);
		blockEl.style.removeProperty(`--${extensionId}-box-height`);

		blockEl.classList.remove(extensionId);
	}
}

function getLineTopOffsetAuto(lineWidth) {

	lineWidth = parseFloat(lineWidth);
	let lineTopOffset = '';

	if (internals.installedExtensions.roamStudio) {
		if (lineWidth === 1) {
			lineTopOffset = '7.0px';
		}
		else if (lineWidth === 2) {
			lineTopOffset = '7.5px';
		}
		else if (lineWidth === 3) {
			lineTopOffset = '8.0px';
		}		
	}
	else {
		if (lineWidth === 1) {
			lineTopOffset = '9.5px';
		}
		else if (lineWidth === 2) {
			lineTopOffset = '10px';
		}
		else if (lineWidth === 3) {
			lineTopOffset = '10.5px';
		}		
	}

	return lineTopOffset;
}

function getLineLeftOffsetAuto(lineWidth, bulletScaleFactor) {

	lineWidth = parseFloat(lineWidth);
	let lineLeftOffset = '';

	if (lineWidth === 1) {
		lineLeftOffset = '6px';
	}
	else if (lineWidth === 2) {
		lineLeftOffset = '5.5px';
	}
	else if (lineWidth === 3) {
		lineLeftOffset = '5px';
	}

	return lineLeftOffset;

}

function addReferencePath(el) {

	internals.isDev && log('addReferencePath', { el });

	// removeReferencePath();

	let { extensionId } = internals;
	let { bulletColorHex, bulletScaleFactor } = internals.settingsCached;
	let { referenceColorHex, referenceFontWeightValue } = internals.settingsCached;
	let { lineColorHex, lineRoundness, lineWidth, lineStyle, lineTopOffset, lineLeftOffset } = internals.settingsCached;
	let blockPrevious = null, blockList = [];

	if (lineColorHex !== 'disabled') {
		if (lineTopOffset === 'auto') {
			lineTopOffset = getLineTopOffsetAuto(lineWidth);
		}

		if (lineLeftOffset === 'auto') {
			lineLeftOffset = getLineLeftOffsetAuto(lineWidth);
		}
	}

	for(;;) {
		let blockContainerEl;

		// optimization to avoid calling .closest(); note that el is re-assigned at the end of this loop,
		// so usually el is either the textarea or a div.rm-block-children (so we know how to reach the 
		// closest div.roam-block-container directly, by using only the parentElement property)

		// debugger;
		if (el.tagName === 'TEXTAREA') {
			blockContainerEl = el.parentElement.parentElement.parentElement;
		}
		else {
			blockContainerEl = el.parentElement;
		}

		// common-case

		if (blockContainerEl.className === '' && blockContainerEl.parentElement.className.includes('roam-article')) { break; }

		if (!(blockContainerEl.className.includes('roam-block-container'))) {
			blockContainerEl = el.closest('div.roam-block-container');
		}

		if (blockContainerEl == null) { break; }

		let blockEl = blockContainerEl.firstElementChild;

		// make sure firstElementChild is the correct element

		if (!(blockEl.className.includes('rm-block-main'))) { continue; }

		blockList.push(blockEl);
		blockEl.classList.add(extensionId);

		// 1 - set css variables for bullets

		if (bulletColorHex !== 'disabled') {
			blockEl.style.setProperty(`--${extensionId}-bullet-color`, bulletColorHex);
		}

		if (bulletScaleFactor !== 'disabled') {
			blockEl.style.setProperty(`--${extensionId}-bullet-scale-factor`, bulletScaleFactor);
		}

		// 2 - set css variables for references (brackets and tags)

		if (referenceColorHex !== 'disabled') {
			blockEl.style.setProperty(`--${extensionId}-brackets-color`, referenceColorHex);
			blockEl.style.setProperty(`--${extensionId}-link-color`, referenceColorHex);
		}

		if (referenceFontWeightValue !== 'disabled') {
			blockEl.style.setProperty(`--${extensionId}-brackets-weight`, referenceFontWeightValue);
			blockEl.style.setProperty(`--${extensionId}-link-weight`, referenceFontWeightValue);
		}

		if (lineColorHex !== 'disabled') {

			// 3 - set css variables for lines

			let isInitialBlock = (blockPrevious == null);

			if (isInitialBlock) {
				// make sure the span.bp3-popover-target::before pseudo-element is not drawn for the initial block

				blockEl.style.setProperty(`--${extensionId}-line-width`, '0');
				blockEl.style.setProperty(`--${extensionId}-box-width`, '0');
				blockEl.style.setProperty(`--${extensionId}-box-height`, '0');
			}
			else {
				// reference: https://developer.mozilla.org/en-US/docs/Web/API/Element/getBoundingClientRect

				let bboxCurrent = blockEl.getBoundingClientRect()
				let bboxPrevious = blockPrevious.getBoundingClientRect()

				// normally we have boxWidth > 0 and boxHeight > 0, but there are some cases in which 
				// boxHeight is 0 (embedded blocks)

				// TODO: in RTL languages this logic must be inverted somehow

				let boxWidthNumeric = bboxPrevious.x - bboxCurrent.x;
				let boxHeightNumeric = bboxPrevious.y - bboxCurrent.y;

				if (boxWidthNumeric > 0 && boxHeightNumeric > 0) {
					blockEl.style.setProperty(`--${extensionId}-line-width`, `${lineWidth}`);
					blockEl.style.setProperty(`--${extensionId}-line-color`, lineColorHex);
					blockEl.style.setProperty(`--${extensionId}-line-style`, lineStyle);
					blockEl.style.setProperty(`--${extensionId}-line-roundness`, `${lineRoundness}`);
					blockEl.style.setProperty(`--${extensionId}-line-top-offset`, `${lineTopOffset}`);
					blockEl.style.setProperty(`--${extensionId}-line-left-offset`, `${lineLeftOffset}`);

					let boxWidth = `${boxWidthNumeric}px`;
					let boxHeight = `${boxHeightNumeric}px`;

					blockEl.style.setProperty(`--${extensionId}-box-width`, `${boxWidth}`);
					blockEl.style.setProperty(`--${extensionId}-box-height`, `${boxHeight}`);			
				}
			}
		}

		// go to the parent and repeat

		blockPrevious = blockEl;
		el = blockContainerEl.parentElement;
	}

	return blockList;
}

function startPermanentObserver({ target }) {

	let callback;

	if (target.matches('div.roam-main')) {
		callback = function observerCallbackForMainView (mutationList) {

			for (let mutation of mutationList) {
				// a page is opened/closed when this element is added/removed: target > div.roam-body-main > div.rm-article-wrapper

				let pageWasOpened = true
					&& mutation.addedNodes.length > 0
					&& mutation.addedNodes[0].children.length > 0
					&& mutation.addedNodes[0].children[0].matches('div.roam-body-main > div.rm-article-wrapper');

				if (pageWasOpened) {
					startTemporaryObserver({ target: document.querySelector('div.roam-body-main > div.rm-article-wrapper') });
				}

				let pageWasClosed = true
					&& mutation.removedNodes.length > 0
					&& mutation.removedNodes[0].children.length > 0
					&& mutation.removedNodes[0].children[0].matches('div.roam-body-main > div.rm-article-wrapper');

				if (pageWasClosed) {
					stopObserver({ target: mutation.removedNodes[0].children[0] });
				}				
			}
		}
	}
	else if (target.matches('div#right-sidebar')) {
		callback = function observerCallbackForSidebar (mutationList) {

			for (let mutation of mutationList) {
				// the sidebar is opened/closed when this element is added/removed: target > div#roam-right-sidebar-content

				let sidebarWasOpened = true
					&& mutation.addedNodes.length > 0
					&& mutation.addedNodes[0].matches('div#roam-right-sidebar-content');

				if (sidebarWasOpened) {
					startTemporaryObserver({ target: document.querySelector('div#roam-right-sidebar-content') });
				}

				let sidebarWasClosed = true
					&& mutation.removedNodes.length > 0
					&& mutation.removedNodes[0].matches('div#roam-right-sidebar-content');

				if (sidebarWasClosed) {
					stopObserver({ target: mutation.removedNodes[0] });
				}				
			}
		}
	}

	// for the permanent observers we want to monitor only the target element

	let options = {
		subtree: false,
		childList: true
	}

	let { observer, observerId } = startObserver({ target, callback, options });

	if (observer != null) {
		internals.cleaners.push({ 
			observerId, 
			handler: () => { 

				log('cleaner for permanent observer', { observerId });

				observer.disconnect(); 
				delete target.dataset.observerId;
			}
		});		
	}
}

// start one observer (abstract)

function startObserver({ target, callback, options }) {

	let out = {}

	if (target == null || target.dataset.observerId != null) { return out }

	let observer = new MutationObserver(callback);
	observer.observe(target, options);

	let observerId = String(internals.serial++);

	target.dataset.observerId = observerId;

	out = { observer, observerId }

	return out;
}

// stop one (or all) observer(s)

function stopObserver({ target }) {

	if (target === 'all') {
		for (let cleaner of internals.cleaners) {
			cleaner.handler();
		}

		internals.cleaners = [];
	}
	else {
		if (target == null) { return; }

		let idx = internals.cleaners.findIndex(o => o.observerId === target.dataset.observerId);

		if (idx === -1) { return }

		internals.cleaners[idx].handler();
		internals.cleaners.splice(idx, 1);		
	}
}

export default {
	onload,
	onunload
};


// https://tailwindcss.com/docs/customizing-colors
// https://github.com/tailwindlabs/tailwindcss/blob/master/src/public/colors.js

// includes the '50' shade (the initial one), but it's available in the settings (too light to be useful)

internals.tailwindColors = {
  slate:   ['#f8fafc','#f1f5f9','#e2e8f0','#cbd5e1','#94a3b8','#64748b','#475569','#334155','#1e293b','#0f172a'],
  gray:    ['#f9fafb','#f3f4f6','#e5e7eb','#d1d5db','#9ca3af','#6b7280','#4b5563','#374151','#1f2937','#111827'],
  zinc:    ['#fafafa','#f4f4f5','#e4e4e7','#d4d4d8','#a1a1aa','#71717a','#52525b','#3f3f46','#27272a','#18181b'],
  neutral: ['#fafafa','#f5f5f5','#e5e5e5','#d4d4d4','#a3a3a3','#737373','#525252','#404040','#262626','#171717'],
  stone:   ['#fafaf9','#f5f5f4','#e7e5e4','#d6d3d1','#a8a29e','#78716c','#57534e','#44403c','#292524','#1c1917'],
  red:     ['#fef2f2','#fee2e2','#fecaca','#fca5a5','#f87171','#ef4444','#dc2626','#b91c1c','#991b1b','#7f1d1d'],
  orange:  ['#fff7ed','#ffedd5','#fed7aa','#fdba74','#fb923c','#f97316','#ea580c','#c2410c','#9a3412','#7c2d12'],
  amber:   ['#fffbeb','#fef3c7','#fde68a','#fcd34d','#fbbf24','#f59e0b','#d97706','#b45309','#92400e','#78350f'],
  yellow:  ['#fefce8','#fef9c3','#fef08a','#fde047','#facc15','#eab308','#ca8a04','#a16207','#854d0e','#713f12'],
  lime:    ['#f7fee7','#ecfccb','#d9f99d','#bef264','#a3e635','#84cc16','#65a30d','#4d7c0f','#3f6212','#365314'],
  green:   ['#f0fdf4','#dcfce7','#bbf7d0','#86efac','#4ade80','#22c55e','#16a34a','#15803d','#166534','#14532d'],
  emerald: ['#ecfdf5','#d1fae5','#a7f3d0','#6ee7b7','#34d399','#10b981','#059669','#047857','#065f46','#064e3b'],
  teal:    ['#f0fdfa','#ccfbf1','#99f6e4','#5eead4','#2dd4bf','#14b8a6','#0d9488','#0f766e','#115e59','#134e4a'],
  cyan:    ['#ecfeff','#cffafe','#a5f3fc','#67e8f9','#22d3ee','#06b6d4','#0891b2','#0e7490','#155e75','#164e63'],
  sky:     ['#f0f9ff','#e0f2fe','#bae6fd','#7dd3fc','#38bdf8','#0ea5e9','#0284c7','#0369a1','#075985','#0c4a6e'],
  blue:    ['#eff6ff','#dbeafe','#bfdbfe','#93c5fd','#60a5fa','#3b82f6','#2563eb','#1d4ed8','#1e40af','#1e3a8a'],
  indigo:  ['#eef2ff','#e0e7ff','#c7d2fe','#a5b4fc','#818cf8','#6366f1','#4f46e5','#4338ca','#3730a3','#312e81'],
  violet:  ['#f5f3ff','#ede9fe','#ddd6fe','#c4b5fd','#a78bfa','#8b5cf6','#7c3aed','#6d28d9','#5b21b6','#4c1d95'],
  purple:  ['#faf5ff','#f3e8ff','#e9d5ff','#d8b4fe','#c084fc','#a855f7','#9333ea','#7e22ce','#6b21a8','#581c87'],
  fuchsia: ['#fdf4ff','#fae8ff','#f5d0fe','#f0abfc','#e879f9','#d946ef','#c026d3','#a21caf','#86198f','#701a75'],
  pink:    ['#fdf2f8','#fce7f3','#fbcfe8','#f9a8d4','#f472b6','#ec4899','#db2777','#be185d','#9d174d','#831843'],
  rose:    ['#fff1f2','#ffe4e6','#fecdd3','#fda4af','#fb7185','#f43f5e','#e11d48','#be123c','#9f1239','#881337'],
};

// https://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb

// function hexToRGBA(hex, alpha = 1) {
//
// 	let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
// 	let r = parseInt(result[1], 16);
// 	let g = parseInt(result[2], 16);
// 	let b = parseInt(result[3], 16);
//
//   return `rgba(${r}, ${g}, ${b}, ${alpha})`;
// }
