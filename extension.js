// based on previous work done by:
// - Dhrumil Shah (@wandcrafting) and Robert Haisfield (@RobertHaisfield): https://www.figma.com/file/5shwLdUCHxSaPNEO7pazbe/
// - Azlen Elza (@azlenelza): https://gist.github.com/azlen/cc8d543f0e46e17d978e705650df0e9e

let internals = {};

internals.extensionId = 'reference-path';

// dev mode can activated by using the special key/value 'dev=true' in the query string;
// example: https://roamresearch.com?dev=true/#/app/<GRAPH_NAME>

internals.isDev = String(new URLSearchParams(window.location.search).get('dev')).includes('true');
internals.isProd = !internals.isDev;
internals.extensionAPI = null;
internals.unloadHandlers = [];

internals.settingsCached = {
	color: null,

	bulletColorShade: null,
	bulletScaleFactor: null,

	referenceColorShade: null,
	referenceFontWeightName: null,

	lineColorShade: null,
	lineWidth: null,
	lineStyle: null,
	lineRoundness: null,
	// showOnHover: null,  // to be added in the future

	// derived settings

	bulletColorHex: null,  // derived from color + bulletColorShade
	referenceColorHex: null,  // derived from color + referenceColorShade
	lineColorHex: null,  // derived from color + lineColorShade
	referenceFontWeightValue: null,  // derived from referenceFontWeightName
};

internals.settingsDefault = {
	color: 'indigo',

	bulletColorShade: '500',
	bulletScaleFactor: 1.5,
	
	referenceColorShade: '500',
	referenceFontWeightName: 'medium',

	lineColorShade: '500',
	lineWidth: 1,
	lineStyle: 'solid',
	lineRoundness: 2,
	// showOnHover: false  // to be added in the future
};

function onload({ extensionAPI }) {

	log('ONLOAD (start)');

	internals.extensionAPI = extensionAPI;
	initializeSettings();

	// we have to resort to dynamic stylesheets (instead of using extension.css directly) to be able to support 
	// the 'disabled' option in our settings (when 'disabled' is selected, we don't add any css at all relative 
	// to that setting/feature); this is the simplest way to avoid having css rules that might conflict with 
	// other extensions/themes; besides that, the fact that css cascade doesn't work as expected with css custom
	// variables is another reason to use dynamic styles; more details here: https://adactio.com/journal/16993

	resetStyle();

	observeMain({ selector: 'div.roam-main' });
	observeMain({ selector: 'div#right-sidebar' });

	log('ONLOAD (end)');
}

function onunload() {

	log('ONUNLOAD (start)');

	internals.unloadHandlers.forEach(unloadHandler => { unloadHandler() })

	log('ONUNLOAD (end)');
}

function log() {
	
	if (internals.isProd) { return }

	console.log(`${internals.extensionId} ${Date.now()}]`, ...arguments);
}

function initializeSettings() {

	log('initializeSettings');

	let panelConfig = {
		tabTitle: 'Reference Path',
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
			onChange: value => { updateSettingsCached({ key: 'color', value }); resetStyle(); },
		}		
	});

	panelConfig.settings.push({
		id: 'bulletColorShade',
		name: 'Bullets: color shade',
		description: '100 is light; 900 is dark. Values between 400 and 600 should be good for most people. See the full color palette here: https://tailwindcss.com/docs/customizing-colors',
		action: {
			type: 'select',
			items: ['disabled', '100', '200', '300', '400', '500', '600', '700', '800', '900'],
			onChange: value => { updateSettingsCached({ key: 'bulletColorShade', value }); resetStyle(); },
		}		
	});

	panelConfig.settings.push({
		id: 'bulletScaleFactor',
		name: 'Bullets: scale factor',
		description: 'Use 2 to make the bullet size twice of the original size.',
		action: {
			type: 'select',
			items: ['disabled', '0.75', '1', '1.25', '1.5', '1.75', '2', '2.25', '2.5'],
			onChange: value => { updateSettingsCached({ key: 'bulletScaleFactor', value }); resetStyle(); },
		},
	});

	panelConfig.settings.push({
		id: 'referenceColorShade',
		name: 'References (double brackets and tags): color shade',
		description: 'See the description given for bullets.',
		action: {
			type: 'select',
			items: ['disabled', '100', '200', '300', '400', '500', '600', '700', '800', '900'],
			onChange: value => { updateSettingsCached({ key: 'referenceColorShade', value }); resetStyle(); },
		}		
	});

	panelConfig.settings.push({
		id: 'referenceFontWeightName',
		name: 'References (double brackets and tags): font weight',
		// description: 'Make the references that belong to blocks in the active path stand out.',
		action: {
			type: 'select',
			// weight names corresponding to ['300', '400', '500', '600', '700']
			items: ['disabled', 'light', 'normal', 'medium', 'semibold', 'bold'],
			onChange: value => { updateSettingsCached({ key: 'referenceFontWeightName', value }); resetStyle(); },
		},
	});

	panelConfig.settings.push({
		id: 'lineColorShade',
		name: 'Lines: color shade',
		description: 'See the description given for bullets. If this setting is disabled, the other 3 settings for lines will also be disabled (line width, style and roundness).',
		action: {
			type: 'select',
			items: ['disabled', '100', '200', '300', '400', '500', '600', '700', '800', '900'],
			onChange: value => { updateSettingsCached({ key: 'lineColorShade', value }); resetStyle(); },
		}		
	});

	panelConfig.settings.push({
		id: 'lineWidth',
		name: 'Lines: width',
		description: '',
		action: {
			type: 'select',
			// TODO: consider subpixel values? does any browser actually implements them for border-width?
			items: ['1', '2', '3'],
			onChange: value => { updateSettingsCached({ key: 'lineWidth', value }); resetStyle(); },
		},
	});

	panelConfig.settings.push({
		id: 'lineStyle',
		name: 'Lines: style',
		description: 'See examples here: https://developer.mozilla.org/en-US/docs/Web/CSS/border-style',
		action: {
			type: 'select',
			items: ['solid', 'dotted', 'dashed'],
			onChange: value => { updateSettingsCached({ key: 'lineStyle', value }); resetStyle(); },
		},
	});

	panelConfig.settings.push({
		id: 'lineRoundness',
		name: 'Lines: corner roundness',
		description: 'Use 0 for no roundness, that is, to obtain right angle corners.',
		action: {
			type: 'select',
			items: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
			onChange: value => { updateSettingsCached({ key: 'lineRoundness', value }); resetStyle(); },
		},
	});

	let { extensionAPI } = internals;

	extensionAPI.settings.panel.create(panelConfig);

	let settingsKeys = panelConfig.settings.map(o => o.id);

	// cache the panel settings internally for best performance;
	// if necessary, initialize the panel settings with our default values;

	settingsKeys.forEach(key => {

		let value = extensionAPI.settings.get(key);

		if (value == null) {
			value = internals.settingsDefault[key];
			extensionAPI.settings.set(key, value);
		}
		
		updateSettingsCached({ key, value });
	});
}

function updateSettingsCached({ key, value }) {

	internals.settingsCached[key] = value;

	// derived settings

	let { bulletColorShade, referenceColorShade, lineColorShade, referenceFontWeightName } = internals.settingsCached;

	internals.settingsCached.bulletColorHex = getColorHex({ shade: bulletColorShade });
	internals.settingsCached.referenceColorHex = getColorHex({ shade: referenceColorShade });
	internals.settingsCached.lineColorHex = getColorHex({ shade: lineColorShade });
	internals.settingsCached.referenceFontWeightValue = getFontWeightValue({ fontWeightName: referenceFontWeightName });

	log('updateSettingsCached', { key, value, 'internals.settingsCached': internals.settingsCached });
}

function getColorHex({ color, shade }) {

	if (shade === 'disabled') { return 'disabled' } 

	if (color == null) { color = internals.settingsCached.color }

	color = color.split('(')[0].trim();  // strip the '(' from the grays
	let shadeIdx = Math.floor(Number(shade) / 100);  // we want a mapping like { 50: 0, 100: 1, 200: 2, ... }
	let colorHex = internals.tailwindColors[color][shadeIdx];

	return colorHex;
}

function getFontWeightValue({ fontWeightName }) {

	// https://developer.mozilla.org/en-US/docs/Web/CSS/font-weight#common_weight_name_mapping

	let nameToValue = {
		'light': '300',
		'normal': '400',
		'medium': '500',
		'semibold': '600',
		'bold': '700',
		'disabled': 'disabled'
	}

	return nameToValue[fontWeightName];
}

function resetStyle() {

	removeStyle();
	addStyle();
}

function removeStyle() {

	log('removeStyle');

	// we assume no one else has added a <style data-id="reference-path-28373625"> before, which seems
	// to be a strong hypothesis

	let extensionStyles = Array.from(document.head.querySelectorAll(`style[data-id^="${internals.extensionId}"]`));
	extensionStyles.forEach(el => { el.remove() });
}

function addStyle() {

	log('addStyle');

	let { extensionId } = internals;
	let textContent = '';

	if (internals.settingsCached.bulletColorHex !== 'disabled') {
		textContent += `
			.${extensionId} span.rm-bullet__inner,
			.${extensionId} span.rm-bullet__inner--user-icon {
		    background-color: var(--${extensionId}-bullet-color);
			}
		`;
	}

	if (internals.settingsCached.bulletScaleFactor !== 'disabled') {
		textContent += `
			.${extensionId} span.rm-bullet__inner,
			.${extensionId} span.rm-bullet__inner--user-icon {
		    transform: scale(var(--${extensionId}-bullet-scale-factor));
			}
		`;
	}

	if (internals.settingsCached.referenceColorHex !== 'disabled') {
		textContent += `
			.${extensionId} + div.roam-block span.rm-page-ref__brackets {
				color: var(--${extensionId}-brackets-color);
			}

			.${extensionId} + div.roam-block span.rm-page-ref--link {
				color: var(--${extensionId}-link-color);
			}

			.${extensionId} + div.roam-block span.rm-page-ref--tag {
				color: var(--${extensionId}-link-color);
			}
		`;
	}

	if (internals.settingsCached.referenceFontWeightName !== 'disabled') {
		textContent += `
			.${extensionId} + div.roam-block span.rm-page-ref__brackets {
				font-weight:  var(--${extensionId}-brackets-weight);
			}

			.${extensionId} + div.roam-block span.rm-page-ref--link {
				font-weight:  var(--${extensionId}-link-weight);
			}

			.${extensionId} + div.roam-block span.rm-page-ref--tag {
				font-weight:  var(--${extensionId}-link-weight);
			}
		`;
	}

	if (internals.settingsCached.lineColorHex !== 'disabled') {
		textContent += `
			.${extensionId} span.bp3-popover-target::before {
				border-color: var(--${extensionId}-line-color);
				border-width: var(--${extensionId}-line-width);
				border-style: var(--${extensionId}-line-style);
				border-bottom-left-radius: var(--${extensionId}-line-roundness);

				content: '';
				position: absolute;
				top: 9px;   /* TODO: fine-tune using scale: 1.5 => top: 9px; scale: 2 => top: 10px; */
				left: 6px;
				width: var(--${extensionId}-box-width); 
				height: var(--${extensionId}-box-height);
				border-right: none;
				border-top: none;
				pointer-events: none;
				z-index: 11;
			}
		`;
	}
	
	let extensionStyle = document.createElement('style');

	extensionStyle.textContent = textContent;
	extensionStyle.dataset.id = `${extensionId}-${Date.now()}`;
	extensionStyle.dataset.title = `dynamic styles added by the ${extensionId} extension`;

	document.head.appendChild(extensionStyle);
}

function observeMain ({ selector }) {

	log('observeMain');

	let rootEl = document.querySelector(selector);

	if (rootEl == null) { return }

	let bulletList = [];  // array of nodes
	
	// optional feature to be added in the future: show reference on hover

	// let isEditMode = false;

	// let onMouseEnter = function onMouseEnter (ev) {
	// 	console.log('onMouseEnter @ ' + Date.now(), ev.type, ev, selector)
	//
	// 	if(isEditMode) {
	// 		console.log('  skipping', { isEditMode })
	// 		return;
	// 	}
	//
	// 	bulletList = addReferencePath(ev.target, true);
	// }

	// let onMouseLeave = function onMouseLeave (ev) {
	// 	console.log('onMouseLeave @ ' + Date.now(), ev.type, ev, selector);
	//
	// 	if(isEditMode) {
	// 		console.log('  skipping', { isEditMode })
	// 		return;
	// 	}
	//
	// 	removeReferencePath(bulletList);
	// 	bulletList = [];
	// }


	// reference: https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver/MutationObserver

	let observerCallback = function observerCallback (mutationList) {

		// return early for the common case of typing in the active block (in edit mode)

		let mutationCount = mutationList.length;
		let isProbablyTyping = (mutationCount === 1);

		if (isProbablyTyping && isMutationForTyping(mutationList[0])) { return }

		log('observerCallback', { mutationList });

		// first-pass: find a mutation relative to leaving edit mode (removal of the textarea element);
		// we should then remove any existing reference path;
		//debugger;

		for (let idx = 0; idx < mutationCount; idx++) {
			let m = mutationList[idx];

			if (!isCandidateMutationForRemove(m, mutationCount)) { continue; }

			let textareaEl = queryTextarea(m.target, m.removedNodes[0]);

			if (textareaEl != null) {
				removeReferencePath(bulletList);
				bulletList = [];
				// isEditMode = false;  // to be added in the future

				break;
			}
		}

		// second-pass: find a mutation relative to entering edit mode (add a textarea element);
		// we should then add the reference path relative to the active block;
		// the logic from the first-pass is nearly identical here;
		// debugger;

		for (let idx = 0; idx < mutationCount; idx++) {
			let m = mutationList[idx];

			if (!isCandidateMutationForAdd(m, mutationCount)) { continue; }

			let textareaEl = queryTextarea(m.target, m.addedNodes[0]);

			if (textareaEl != null) {
				bulletList = addReferencePath(textareaEl);
				// isEditMode = true;  // to be added in the future

				break;
			}
		}

		// optional feature to be added in the future: show reference on hover

		// if (internals.settingsCached.showOnHover) {
		//
		// 	// we prefer to use div.roam-block instead of rm-block-main to make the hover effect a bit less
		// 	// intrusive; the logic for the reference path (when hovering) is not affected by this;
		//
		// 	let array = Array.from(rootEl.querySelectorAll('div.roam-block:not([data-has-mouse-listeners])'));
		// 	// let array = Array.from(rootEl.querySelectorAll('div.rm-block-main:not([data-has-mouse-listeners])'));
		// 	console.log({ 'array.length': array.length })
		//
		// 	for (let idx = 0; idx < array.length; idx++) {
		// 		let el = array[idx];
		//
		// 		el.addEventListener('mouseenter', onMouseEnter);
		// 		el.addEventListener('mouseleave', onMouseLeave);
		// 		el.dataset.hasMouseListeners = 'true';
		// 	}
		// }
	};

	let observer = new MutationObserver(observerCallback);

	// reference for observerOptions: https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver/observe#parameters

	let observerOptions = {
		subtree: true,
		childList: true,
		attributes: false,
		characterData: false,
	}

	observer.observe(rootEl, observerOptions);

	let unloadHandler = () => { 

		log('unloadHandler', { selector });

		observer.disconnect();
		removeReferencePath(bulletList);
		removeStyle();
		bulletList = [];
		// isEditMode = false;  // to be added in the future
	};

	internals.unloadHandlers.push(unloadHandler);
}

function isMutationForTyping(mutation) {

	return true
		&& mutation.target.tagName === 'TEXTAREA'
		&& (false
			|| (mutation.addedNodes.length === 1 && mutation.addedNodes[0].nodeType === 3)  // common case: add/erase 1 character (where the block already has text)
			|| (mutation.removedNodes.length === 1 && mutation.removedNodes[0].nodeType === 3)  // when the textarea becomes empty
		);
}

function isCandidateMutationForRemove(mutationObj, mutationCount) {

	let isCandidate = false;

	if (mutationObj.removedNodes.length > 0) {
		let { className } = mutationObj.target;
		isCandidate = false 
			|| className.includes('rm-block-main')
			|| className.includes('rm-block-children')
			|| className.includes('roam-main')
			|| className.includes('roam-article')
			|| className.includes('rm-block-input')  // delete an empty block with the "delete" key
			|| className.includes('rm-sidebar-outline')  // create a page in the sidebar and select the initial block
			|| className === '';  // create a page in the main view and select the initial block
	}

	return isCandidate;
}

function isCandidateMutationForAdd(mutationObj, mutationCount) {

	// the logic is slightly different here, as we discover several corner-cases

	let isCandidate = false;

	if (mutationObj.addedNodes.length > 0) {
		let { className } = mutationObj.target;
		isCandidate = false 
			|| className.includes('rm-block-main')
			|| className.includes('rm-block-children')
			|| className.includes('roam-main')
			|| className.includes('roam-article')
			|| className.includes('rm-block-input')  // delete an empty block with the "delete" key
			|| className.includes('rm-sidebar-outline')  // create a page in the sidebar and select the initial block
			|| className === '';  // create a page in the main view and select the initial block
	}
	else if (mutationCount === 1) {

		// corner case: when removing an empty block (with the delete key) and the next block is also empty; 
		// in that case we always have:
		// 1) mutationList.length === 1
		// 2) mutationList[0].addedNodes.length === 0
		// 3) mutationList[0].removedNodes.length === 1

		// we re-evaluate the candidate status with those ad-hoc conditions;

		isCandidate = true
			&& mutationObj.addedNodes.length === 0 
			&& mutationObj.removedNodes.length === 1 
			&& mutationObj.removedNodes[0].className.includes('roam-block-container')
			&& mutationObj.target.className.includes('rm-block-children');
	}

	return isCandidate;
}

function queryTextarea(target, mutatedEl) {

	// we need to check for the textarea element in 2 places: the target element and the added/removed element (mutatedEl);
	// this is necessary handle a bunch of specific cases (see issue #1);
	
	return false
		|| target.querySelector('textarea')
		|| (mutatedEl != null && mutatedEl.nodeType === 1 && mutatedEl.querySelector('textarea'))
		|| (target.tagName === 'TEXTAREA' && target)  // corner-case: delete an empty block with the "delete" key (the target is already the textarea!)
		|| null; // if all cases fails, null is returned (to mimic a call to querySelector);
}

function removeReferencePath(_bulletList) {

	log('removeReferencePath');

	let { extensionId } = internals;

	for (let idx = 0; idx < _bulletList.length; idx++) {
		let bullet = _bulletList[idx];

		bullet.style.removeProperty(`--${extensionId}-bullet-scale-factor`);
		bullet.style.removeProperty(`--${extensionId}-bullet-color`);
		
		bullet.style.removeProperty(`--${extensionId}-brackets-color`);
		bullet.style.removeProperty(`--${extensionId}-brackets-weight`);
		bullet.style.removeProperty(`--${extensionId}-link-color`);
		bullet.style.removeProperty(`--${extensionId}-link-weight`);

		bullet.style.removeProperty(`--${extensionId}-line-color`);
		bullet.style.removeProperty(`--${extensionId}-line-roundness`);
		bullet.style.removeProperty(`--${extensionId}-line-width`);
		bullet.style.removeProperty(`--${extensionId}-line-style`);

		bullet.style.removeProperty(`--${extensionId}-box-width`);
		bullet.style.removeProperty(`--${extensionId}-box-height`);

		bullet.classList.remove(extensionId);
	}
}

function addReferencePath(el, isHover = false) {

	log('addReferencePath', { el });

	let bulletList = [];
	let bulletCurrent = null, bulletPrevious = null;

	let { extensionId } = internals;
	let { bulletColorHex, bulletScaleFactor } = internals.settingsCached;
	let { referenceColorHex, referenceFontWeightValue } = internals.settingsCached;
	let { lineColorHex, lineRoundness, lineWidth, lineStyle } = internals.settingsCached;

	for(;;) {
		let parentBlockEl = el.closest('div.roam-block-container');

		if (parentBlockEl == null) { break }

		// the 'bullet element'  is technically div.controls > span.rm-bullet; however it is more
		// convenient to style the wrapper / parent (div.controls)

		let bulletCurrent = parentBlockEl.querySelector('div.controls');

		// make sure querySelector actually got something (because roam might change the css 
		// class names in the future, in which case we would get an error)

		if (bulletCurrent == null) { continue }

		bulletList.push(bulletCurrent);
		bulletCurrent.classList.add(extensionId);

		// 1 - set css variables for bullets

		if (bulletColorHex !== 'disabled') {
			bulletCurrent.style.setProperty(`--${extensionId}-bullet-color`, bulletColorHex);
		}

		if (bulletScaleFactor !== 'disabled') {
			bulletCurrent.style.setProperty(`--${extensionId}-bullet-scale-factor`, bulletScaleFactor);
		}

		// 2 - set css variables for references (brackets and tags)
		
		let blockEl = bulletCurrent.nextElementSibling;

		if (referenceColorHex !== 'disabled') {
			blockEl.style.setProperty(`--${extensionId}-brackets-color`, referenceColorHex);
			blockEl.style.setProperty(`--${extensionId}-link-color`, referenceColorHex);
		}

		if (referenceFontWeightValue !== 'disabled') {
			blockEl.style.setProperty(`--${extensionId}-brackets-weight`, referenceFontWeightValue);
			blockEl.style.setProperty(`--${extensionId}-link-weight`, referenceFontWeightValue);
		}

		if (bulletPrevious != null) {

			// 3 - set css variables for lines

			// reference: https://developer.mozilla.org/en-US/docs/Web/API/Element/getBoundingClientRect

			let bboxCurrent = bulletCurrent.getBoundingClientRect()
			let bboxPrevious = bulletPrevious.getBoundingClientRect()

			// normally we have boxWidth > 0 and boxHeight > 0, but there are some cases in which 
			// boxHeight is 0 (embedded blocks)

			// TODO: in RTL languages this logic must be inverted somehow

			let boxWidth = bboxPrevious.x - bboxCurrent.x;
			let boxHeight = bboxPrevious.y - bboxCurrent.y;

			if (boxWidth > 0 && boxHeight > 0 && lineColorHex !== 'disabled') {
				bulletCurrent.style.setProperty(`--${extensionId}-line-color`, lineColorHex);
				bulletCurrent.style.setProperty(`--${extensionId}-line-roundness`, `${lineRoundness}px`);
				bulletCurrent.style.setProperty(`--${extensionId}-line-width`, `${lineWidth}px`);
				bulletCurrent.style.setProperty(`--${extensionId}-line-style`, lineStyle);

				bulletCurrent.style.setProperty(`--${extensionId}-box-width`, `${boxWidth}px`);
				bulletCurrent.style.setProperty(`--${extensionId}-box-height`, `${boxHeight}px`);				
			}
		}

		// go to the parent and repeat

		bulletPrevious = bulletCurrent;
		el = parentBlockEl.parentElement;

	}

	return bulletList;
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
