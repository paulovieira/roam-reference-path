3// based on previous work done by:
// - Dhrumil Shah (@wandcrafting) and Robert Haisfield (@RobertHaisfield): https://www.figma.com/file/5shwLdUCHxSaPNEO7pazbe/
// - Azlen Elza (@azlenelza): https://gist.github.com/azlen/cc8d543f0e46e17d978e705650df0e9e


let internals = {};

internals.extensionAPI = null;

internals.settingsCached = {
	color: null,
	bulletScaleFactor: null,
	bulletColorShade: null,
	lineColorShade: null,
	// colorOpacity: null,
	lineWidth: null,
	lineStyle: null,
	lineRoundness: null,
	fontWeightName: null,
	important: null,
	showOnHover: null,

	bulletColorHex: null,  // computed setting (from color and bulletColorShade)
	lineColorHex: null,  // computed setting (from color and lineColorShade)
	// colorRGBA: null,  // computed setting (from color and colorShade)
	fontWeightValue: null,  // computed setting (from fontWeightName)
	cssClass: null,  // computed setting (from important)

	debug: null,  // activated by query string
};

internals.settingsDefault = {
	color: 'orange',
	bulletScaleFactor: 1.5,
	bulletColorShade: '500',
	lineColorShade: '500',
	// colorOpacity: 1,
	lineWidth: 1,
	lineStyle: 'solid',
	lineRoundness: 2,
	fontWeightName: 'normal',
	important: false,
	showOnHover: false
};

internals.unloadHandlers = [];

internals.selectorForTextarea = 'textarea.rm-block-input';

// internals.isEditMode = false;
// internals._bulletList = [];

function onload({ extensionAPI }) {

	internals.extensionAPI = extensionAPI;
	initializeSettings();

	log('onload started');

	main('div.roam-main');
	main('div#right-sidebar');

	log('onload finished');
}

function onunload() {

	log('onunload started');

	internals.unloadHandlers.forEach(unloadHandler => { unloadHandler() })

	log('onunload finished');
}

function initializeSettings() {

	let panelConfig = {
		tabTitle: 'Reference Path',
		settings: []
	};

	panelConfig.settings.push({
		id: 'color',
		name: 'Color',
		description: 'Color for the reference path',
		action: {
			type: 'select',
			onChange: value => { updateSettingsCached({ color: value }) },
			items: ['gray', 'slate (gray variant)', 'zinc (gray variant)', 'neutral (gray variant)', 'stone (gray variant)', 'red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald', 'teal', 'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose'],

			// roam uses tailwindcss, but the full color palette is not available in the loaded css; 
			// so we load the full palette manually in internals.tailwindColors;
		}		
	});

	panelConfig.settings.push({
		id: 'bulletScaleFactor',
		name: 'Bullet scale factor',
		description: 'Scale factor for the bullets in the reference path (use 1 for no scale).',
		action: {
			type: 'select',
			onChange: value => { updateSettingsCached({ bulletScaleFactor: value }) },
			items: ['1', '1.25', '1.5', '1.75', '2', '2.25', '2.5'],
		},
	});

	panelConfig.settings.push({
		id: 'bulletColorShade',
		name: 'Bullet color shade',
		description: '50 is light; 900 is dark. See the Tailwind color palette: https://tailwindcss.com/docs/customizing-colors',
		action: {
			type: 'select',
			onChange: value => { updateSettingsCached({ bulletColorShade: value }) },
			items: ['none', '50', '100', '200', '300', '400', '500', '600', '700', '800', '900'],
		}		
	});

	panelConfig.settings.push({
		id: 'lineColorShade',
		name: 'Line color shade',
		description: '50 is light; 900 is dark. See the Tailwind color palette: https://tailwindcss.com/docs/customizing-colors',
		action: {
			type: 'select',
			onChange: value => { updateSettingsCached({ lineColorShade: value }) },
			items: ['none', '50', '100', '200', '300', '400', '500', '600', '700', '800', '900'],
		}		
	});

	// panelConfig.settings.push({
	// 	id: 'colorOpacity',
	// 	name: 'Color opacity',
	// 	description: '0 is full transparency; 1 is full opacity.',
	// 	action: {
	// 		type: 'select',
	// 		onChange: value => { updateSettingsCached({ colorOpacity: value }) },
	// 		items: ['0', '0.2', '0.4', '0.6', '0.8', '1'],
	// 	}
	// });

	panelConfig.settings.push({
		id: 'lineWidth',
		name: 'Line width',
		description: 'Width for the line (in pixels).',
		action: {
			type: 'select',
			onChange: value => { updateSettingsCached({ lineWidth: value }) },
			// TODO: consider subpixel values? does any browser actually implements them for border-width?
			items: ['1', '2', '3'],
		},
	});

	panelConfig.settings.push({
		id: 'lineStyle',
		name: 'Line style',
		description: 'Style for the line (see https://developer.mozilla.org/en-US/docs/Web/CSS/border-style)',
		action: {
			type: 'select',
			onChange: value => { updateSettingsCached({ lineStyle: value }) },
			items: ['solid', 'dotted', 'dashed'],
		},
	});

	panelConfig.settings.push({
		id: 'lineRoundness',
		name: 'Line corner roundness',
		description: 'Amount of roundness for the corners (use 0 for no roundness, that is, right angle corners)',
		action: {
			type: 'select',
			onChange: value => { updateSettingsCached({ lineRoundness: value }) },
			items: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
		},
	});

	panelConfig.settings.push({
		id: 'fontWeightName',
		name: 'Font weight for links (references)',
		description: 'Font weight for references (double brackets and tags) that belong to blocks in the path',
		action: {
			type: 'select',
			onChange: value => { updateSettingsCached({ fontWeightName: value }) },
			items: ['light', 'normal', 'medium', 'semibold', 'bold'],  // ['300', '400', '500', '600', '700']
		},
	});

	// panelConfig.settings.push({
	// 	id: 'important',
	// 	name: 'Use the important css keyword',
	// 	description: 'If the css used in this extension has some conflict with css from some other loaded extension or theme, this setting might have to be activated.',
	// 	action: {
	// 		type: 'switch',
	// 		onChange: ev => { updateSettingsCached({ important: ev.target.checked }) }
	// 	}
	// });

	// panelConfig.settings.push({

	// });

	// panelConfig.settings.push({

	// });

	// panelConfig.settings.push({

	// });

	// panelConfig.settings.push({

	// });

	// panelConfig.settings.push({

	// });

	let { extensionAPI } = internals;

	extensionAPI.settings.panel.create(panelConfig);

	let keys = panelConfig.settings.map(o => o.id);

	// compute the cached settings

	keys.forEach(key => {

		let value = extensionAPI.settings.get(key);

		// if necessary use the values from the default settings to initialize the panel

		if (value == null) {
			value = internals.settingsDefault[key];
			extensionAPI.settings.set(key, value);
		}
		
		updateSettingsCached({ [key]: value });
	});

	// debug mode can activated by using a query string when loading roam; 
	// example: https://roamresearch.com/?debug=true/#/app/graph_name

	let urlSearchParams = new URLSearchParams(window.location.search);
	let params = Object.fromEntries(urlSearchParams.entries());

	internals.settingsCached.debug = (typeof params.debug === 'string' && params.debug.includes('true'));
}

function updateSettingsCached(optionsToMerge = {}) {

	Object.assign(internals.settingsCached, optionsToMerge);

	// computed settings 

	internals.settingsCached.bulletColorHex = getColorHex(internals.settingsCached.color, internals.settingsCached.bulletColorShade);
	internals.settingsCached.lineColorHex = getColorHex(internals.settingsCached.color, internals.settingsCached.lineColorShade);
	// internals.settingsCached.colorRGBA = hexToRGBA(colorHex, internals.settingsCached.colorOpacity);
	internals.settingsCached.cssClass = internals.settingsCached.important ? 'reference-path-important' : 'reference-path';
	internals.settingsCached.fontWeightValue = getFontWeightValue(internals.settingsCached.fontWeightName);

	
	log('updateSettingsCached', { 'internals.settingsCached': internals.settingsCached })
}

function getColorHex(color, colorShade) {

	let settingsAreStrings = (typeof color === 'string' && typeof colorShade === 'string');

	if (!settingsAreStrings || colorShade === 'none') { return '#invalid_hex_color_on_purpose' } 

	color = color.split('(')[0].trim();  // strip the '(' from the grays
	let colorShadeIdx = Math.floor(Number(colorShade) / 100);
	let colorHex = internals.tailwindColors[color][colorShadeIdx];

	log('getColorHex', { colorHex })

	return colorHex;
}

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

function getFontWeightValue(fontWeightName) {

	// https://developer.mozilla.org/en-US/docs/Web/CSS/font-weight#common_weight_name_mapping

	let nameToValueMapping = {
		'light': '300',
		'normal': '400',
		'medium': '500',
		'semibold': '600',
		'bold': '700',
	}

	return nameToValueMapping[fontWeightName];
}

function addReferencePath(el, isHover = false) {

	log('addReferencePath', el);

	let bulletList = [];

	for(;;) {
		let parentBlockEl = el.closest('div.roam-block-container');

		if (parentBlockEl == null) { break }

		// the "bullet element" is technically div.controls > span.rm-bullet; however it is more
		// convenient to style the wrapper / parent (div.controls)

		let bullet = parentBlockEl.querySelector('div.controls');

		// make sure querySelector actually got something (because roam might change the css 
		// class names in the future, and we would be have a reference error)

		if (bullet == null) { continue }

		bullet.classList.add(internals.settingsCached.cssClass);

		let { lineColorHex, bulletColorHex } = internals.settingsCached;

		bullet.style.setProperty('--reference-path-bullet-scale-factor', internals.settingsCached.bulletScaleFactor);

		bullet.style.setProperty('--reference-path-bullet-color', bulletColorHex);	
		bullet.style.setProperty('--reference-path-line-color', lineColorHex);	
		
		bullet.style.setProperty('--reference-path-line-roundness', `${internals.settingsCached.lineRoundness}px`);
		
		// bullet.style.setProperty('--reference-path-brackets-color', lineColorHex);
		// bullet.style.setProperty('--reference-path-link-color', lineColorHex);
		
		let blockEl = bullet.nextElementSibling;
		blockEl.style.setProperty('--reference-path-brackets-color', lineColorHex);

		blockEl.style.setProperty('--reference-path-brackets-weight', internals.settingsCached.fontWeightValue);
		blockEl.style.setProperty('--reference-path-link-color', lineColorHex);
		blockEl.style.setProperty('--reference-path-link-weight', internals.settingsCached.fontWeightValue);

		bulletList.push(bullet);

		let len = bulletList.length;
		let hasPrevious = (len >= 2);

		if (hasPrevious) {
			let bulletCurrent = bulletList[len - 1];
			let bboxCurrent = bulletCurrent.getBoundingClientRect()

			let bulletPrevious = bulletList[len - 2];
			let bboxPrevious = bulletPrevious.getBoundingClientRect()

			// reference: https://developer.mozilla.org/en-US/docs/Web/API/Element/getBoundingClientRect

			// we have bboxPrevious.x > bboxCurrent.x because bulletPrevious is 
			// to the right of bullet (it has "higher" indentation)

			// TODO: in RTL languages this logic must be inverted (?)

			let width = bboxPrevious.x - bboxCurrent.x;
			bullet.style.setProperty('--reference-path-width', `${width}px`);

			// similar remarks for y direction (bulletPrevious is always below bulletCurrent);

			let height = bboxPrevious.y - bboxCurrent.y;
			bullet.style.setProperty('--reference-path-height', `${height}px`);

			// finally, set the remaining border properties; note that these 2 custom css properties
			// are set to 0/none when the reference path is removed

			bullet.style.setProperty('--reference-path-border-width', `${internals.settingsCached.lineWidth}px`);
			bullet.style.setProperty('--reference-path-border-style', internals.settingsCached.lineStyle);
		}


		// go to the parent and repeat

		el = parentBlockEl.parentElement;
	}

	return bulletList;
}

function removeReferencePath(_bulletList) {

	log('removeReferencePath')

	// use plain for loops and inline code for maximum performance

	for (let idx = 0; idx < _bulletList.length; idx++) {
		let bullet = _bulletList[idx];
		bullet.style.setProperty('--reference-path-border-width', '0');
		bullet.style.setProperty('--reference-path-border-style', 'none');
		bullet.classList.remove(internals.settingsCached.cssClass)
	}

}

function isMutationForTyping(mutation) {

	return true
		&& mutation.target.tagName === 'TEXTAREA'
		&& mutation.addedNodes.length === 1
		&& mutation.addedNodes[0].nodeName === '#text';
}

// async function delay(ms) {
//
// 	return new Promise(resolve => { setTimeout(resolve, ms) })
// }

// function findAvailableTailwindColors() {
//
// 	let colorClasses = [];
//
// 	for(let styleSheet of document.styleSheets) {
// 		for (let rule of styleSheet.cssRules) {
// 			if(rule.selectorText == null) { continue }
//
// 			if(rule.selectorText.startsWith('.text-') && (rule.selectorText.endsWith('00') || rule.selectorText.endsWith('-50'))) {
// 				colorClasses.push(rule)
// 			}
// 		}
// 	}
//
// 	console.log(colorClasses.map(o => o.selectorText))
// }

function log() {

	if (internals.settingsCached.debug) {
		console.log(`[roam-reference-path ${Date.now()}]`, ...arguments);	
	}
}


function main (selector) {

	let rootEl = document.querySelector(selector);

	if (rootEl == null) { return }

	let bulletList = [];  // array of nodes
	let isEditMode = false;

	let onMouseEnter = function onMouseEnter (ev) {
		console.log('onMouseEnter @ ' + Date.now(), ev.type, ev, selector)

		if(isEditMode) {
			console.log('  skipping', { isEditMode })
			return;
		}

		bulletList = addReferencePath(ev.target, true);
	}

	let onMouseLeave = function onMouseLeave (ev) {
		console.log('onMouseLeave @ ' + Date.now(), ev.type, ev, selector);

		if(isEditMode) {
			console.log('  skipping', { isEditMode })
			return;
		}

		removeReferencePath(bulletList);
		bulletList = [];
	}

	// reference: https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver/MutationObserver

	let observerCallback = function observerCallback (mutationList, observer) {

		// return early for the common case of typing in the active block (in edit mode)
// debugger;
		let isProbablyTyping = (mutationList.length === 1);

		if (isProbablyTyping && isMutationForTyping(mutationList[0])) { return }

		log('observerCallback', { mutationList })

		// first-pass: if there mutations relative to leaving edit mode, remove any existing reference path

		for (let idx = 0; idx < mutationList.length; idx++) {
			let m = mutationList[idx];

			// the target element of the mutations we are looking is always a div.rm-block-main

			let isCandidate = (m.removedNodes.length > 0 && m.target.className.includes('rm-block-main'));

			if (!isCandidate) { continue }

			if (m.removedNodes[0].querySelector(internals.selectorForTextarea) != null) {
				removeReferencePath(bulletList);
				bulletList = [];
				isEditMode = false;
				break;
			}
		}

		// second-pass: if there mutations relative to entering edit mode, add the reference path relative to the active block

		let textareaEl;
		for (let idx = 0; idx < mutationList.length; idx++) {
			let m = mutationList[idx];

			let isCandidate = (m.addedNodes.length > 0 && m.target.className.includes('rm-block-main'));

			if (!isCandidate) { continue }

			if ((textareaEl = m.addedNodes[0].querySelector(internals.selectorForTextarea)) != null) {
				bulletList = addReferencePath(m.addedNodes[0]);
				isEditMode = true;

				/*
				textareaEl.addEventListener('focusout', async () => { 

					// edge-case: when the command pallete is opened and immediately closed, the textarea element is not 
					// removed; however the focus is moved from the textarea to the command pallete; technically we are 
					// still in edit mode, but in  practice we can't write anything; this is a bug in roam that should be solved upstream;
					
					await delay(0);

					if (document.body.className.includes('bp3-overlay-open')) {
						removeReferencePath() 
					}
				});
				*/

				break;
			}
		}

		// add mouse listeners

		if (internals.settingsCached.showOnHover) {

			// we prefer to use div.roam-block instead of rm-block-main to make the hover effect a bit less
			// intrusive; the logic for the reference path (when hovering) is not affected by this;

			let array = Array.from(rootEl.querySelectorAll('div.roam-block:not([data-has-mouse-listeners])'));
			// let array = Array.from(rootEl.querySelectorAll('div.rm-block-main:not([data-has-mouse-listeners])'));
			console.log({ 'array.length': array.length })

			for (let idx = 0; idx < array.length; idx++) {
				let el = array[idx];

				el.addEventListener('mouseenter', onMouseEnter);
				el.addEventListener('mouseleave', onMouseLeave);
				el.dataset.hasMouseListeners = 'true';
			}
		}
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

		removeReferencePath(bulletList);
		bulletList = [];
		isEditMode = false;

		observer.disconnect();
	};

	internals.unloadHandlers.push(unloadHandler);
}

// let bulletList2 = [];
// function onmouseenter(ev) {
// 	console.log('onmouseenter @ ' + Date.now(), ev.type, ev)

// 	if(internals.isEditMode) {
// 		console.log('  skipping because isEditMode')
// 		return;
// 	}

// 	addReferencePath(ev.target, true);
// }

// function onmouseleave(ev) {
// 	console.log('onmouseleave @ ' + Date.now(), ev.type, ev);

// 	if(internals.isEditMode) {
// 		console.log('  skipping because isEditMode')
// 		return;
// 	}

// 	removeReferencePath();
// }

export default {
	onload,
	onunload
};


// https://tailwindcss.com/docs/customizing-colors
// https://github.com/tailwindlabs/tailwindcss/blob/master/src/public/colors.js

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
