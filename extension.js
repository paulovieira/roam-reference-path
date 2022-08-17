// based on previous work done by:
// - Dhrumil Shah (@wandcrafting) and Robert Haisfield (@RobertHaisfield): https://www.figma.com/file/5shwLdUCHxSaPNEO7pazbe/
// - Azlen Elza (@azlenelza): https://gist.github.com/azlen/cc8d543f0e46e17d978e705650df0e9e


let internals = {};

internals.extensionAPI = null;

internals.settingsCached = {
	color: null,
	colorShade: null,
	scaleFactor: null,
	lineWidth: null,
	lineStyle: null,
	important: null,
	showOnHover: null,

	colorHex: null,  // computed option (from color and colorShade)
	cssClass: null,  // computed option (from important)
	debug: null  // activated by query string
};

internals.settingsDefault = {
	color: 'orange',
	colorShade: '500',
	scaleFactor: 1.5,
	lineWidth: 1,
	lineStyle: 'solid',
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
		settings: [
			{
				id: 'color',
				name: 'Color',
				description: 'Color for the reference path (highlighted bullets and line)',
				action: {
					type: 'select',
					onChange: value => { updateSettingsCached({ color: value }) },

					// roam has tailwind out of the box, but the full color palette is not available; 
					// we can find the available colors (for text) by manually executing the findAvailableTailwindColors
					// function below, in the console

					items: [
						'gray', 
						// 'slate (gray variant)', 
						// 'zinc (gray variant)', 
						// 'neutral (gray variant)', 
						// 'stone (gray variant)', 
						'red', 
						// 'orange', 
						// 'amber', 
						'yellow', 
						// 'lime', 
						'green', 
						// 'emerald', 
						// 'teal', 
						// 'cyan', 
						// 'sky', 
						'blue', 
						'indigo', 
						// 'violet', 
						'purple', 
						// 'fuchsia', 
						'pink', 
						// 'rose', 
					],
				}
			},
			{
				id: 'colorShade',
				name: 'Color shade',
				description: '50 is light, 900 is dark. See the Tailwind color palette.',

				action: {
					type: 'select',
					onChange: value => { updateSettingsCached({ colorShade: value }) },
					items: [
						'50',
						'100',
						'200',
						'300',
						'400',
						'500',
						'600',
						'700',
						'800',
						'900',
					],
				}
			},
			{
				id: 'scaleFactor',
				name: 'Bullet scale factor',
				description: 'Scale factor for the highlighted bullets in the reference path (1 is the original size).',
				action: {
					type: 'select',
					onChange: value => { updateSettingsCached({ scaleFactor: value }) },
					items: [
						'1',
						'1.25',
						'1.5',
						'1.75',
						'2',
						'2.5',
						'3',
					],
				},
			},
			{
				id: 'lineWidth',
				name: 'Line width',
				description: 'Width for the highlighted line in the reference path (in pixels).',
				action: {
					type: 'select',
					onChange: value => { updateSettingsCached({ lineWidth: value }) },
					// TODO: consider subpixel values? does any browser actually implements them for border-width?
					items: [
						'1',
						'2',
						'3',
					],
				},
			},
			{
				id: 'lineStyle',
				name: 'Line style',
				description: 'Style for the highlighted line in the reference path',
				action: {
					type: 'select',
					onChange: value => { updateSettingsCached({ lineStyle: value }) },
					items: [
						'solid',
						'dotted',
						'dashed',
					],
				},
			},
			{
				id: 'important',
				name: 'Use the important css keyword',
				description: 'If the css used in this extension has some conflict with css from some other loaded extension or theme, this setting might have to be activated.',
				action: {
					type: 'switch',
					onChange: ev => { updateSettingsCached({ important: ev.target.checked }) }
				}
			},
		]
	};

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

	// computed options 

	internals.settingsCached.colorHex = getColorHex(internals.settingsCached.color, internals.settingsCached.colorShade);
	internals.settingsCached.cssClass = internals.settingsCached.important ? 'reference-path-important' : 'reference-path';

	log('updateSettingsCached', { 'internals.settingsCached': internals.settingsCached })
}

function getColorHex(color, colorShade) {

	let settingsAreStrings = (typeof color === 'string' && typeof colorShade === 'string');

	if (!settingsAreStrings) { return '' }

	color = color.split('(')[0].trim();  // strip the '(' from the grays

	let colorHex = internals.colors[color][colorShade];
	//colorHex = hexToRGBA(colorHex);
	// let tailwindColorClass = `text-${color}-${colorShade}`;
	// let dummySpan = document.createElement('span');

	// dummySpan.style.display = 'none';
	// dummySpan.classList.add(tailwindColorClass);
	// document.body.appendChild(dummySpan);
	// let colorHex = window.getComputedStyle(dummySpan).color;
	// dummySpan.remove();

	log('getColorHex', { colorHex })

	return colorHex;
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
		bullet.style.setProperty('--reference-path-scale-factor', internals.settingsCached.scaleFactor);

		let color = internals.settingsCached.colorHex;

		if (isHover) { color = hexToRGBA(color, 0.5) }

		bullet.style.setProperty('--reference-path-border-color', color);
		// bullet.style.setProperty('--reference-path-brackets-color', color);
		// bullet.style.setProperty('--reference-path-link-color', color);
		
		let blockEl = bullet.nextElementSibling;
		blockEl.style.setProperty('--reference-path-brackets-color', color);

		// font should be one of these

		// light: 300;
		// normal: 400;
		// medium: 500;
		// semibold: 600;
		// bold: 700;

		blockEl.style.setProperty('--reference-path-brackets-weight', 400);
		blockEl.style.setProperty('--reference-path-link-color', color);
		blockEl.style.setProperty('--reference-path-link-weight', 400);

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

function findAvailableTailwindColors() {

	let colorClasses = [];

	for(let styleSheet of document.styleSheets) {
		for (let rule of styleSheet.cssRules) {
			if(rule.selectorText == null) { continue }

			if(rule.selectorText.startsWith('.text-') && (rule.selectorText.endsWith('00') || rule.selectorText.endsWith('-50'))) {
				colorClasses.push(rule)
			}
		}
	}

	console.log(colorClasses.map(o => o.selectorText))
}

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

		if (internals.settingsCached.showOnHover || true) {

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

function hexToRGBA(hex, alpha = 1) {

	let a = hex.replace(/^#?([a-f\d])([a-f\d])([a-f\d])$/i
	           ,(m, r, g, b) => '#' + r + r + g + g + b + b)
	  .substring(1).match(/.{2}/g)
	  .map(x => parseInt(x, 16))

  return `rgba(${a[0]}, ${a[1]}, ${a[2]}, ${alpha})`;
  // return "rgb("+ +r + "," + +g + "," + +b + ")";
}

internals.colors = {
  slate: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
  },
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },
  zinc: {
    50: '#fafafa',
    100: '#f4f4f5',
    200: '#e4e4e7',
    300: '#d4d4d8',
    400: '#a1a1aa',
    500: '#71717a',
    600: '#52525b',
    700: '#3f3f46',
    800: '#27272a',
    900: '#18181b',
  },
  neutral: {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#e5e5e5',
    300: '#d4d4d4',
    400: '#a3a3a3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
  },
  stone: {
    50: '#fafaf9',
    100: '#f5f5f4',
    200: '#e7e5e4',
    300: '#d6d3d1',
    400: '#a8a29e',
    500: '#78716c',
    600: '#57534e',
    700: '#44403c',
    800: '#292524',
    900: '#1c1917',
  },
  red: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
  },
  orange: {
    50: '#fff7ed',
    100: '#ffedd5',
    200: '#fed7aa',
    300: '#fdba74',
    400: '#fb923c',
    500: '#f97316',
    600: '#ea580c',
    700: '#c2410c',
    800: '#9a3412',
    900: '#7c2d12',
  },
  amber: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
  },
  yellow: {
    50: '#fefce8',
    100: '#fef9c3',
    200: '#fef08a',
    300: '#fde047',
    400: '#facc15',
    500: '#eab308',
    600: '#ca8a04',
    700: '#a16207',
    800: '#854d0e',
    900: '#713f12',
  },
  lime: {
    50: '#f7fee7',
    100: '#ecfccb',
    200: '#d9f99d',
    300: '#bef264',
    400: '#a3e635',
    500: '#84cc16',
    600: '#65a30d',
    700: '#4d7c0f',
    800: '#3f6212',
    900: '#365314',
  },
  green: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
  },
  emerald: {
    50: '#ecfdf5',
    100: '#d1fae5',
    200: '#a7f3d0',
    300: '#6ee7b7',
    400: '#34d399',
    500: '#10b981',
    600: '#059669',
    700: '#047857',
    800: '#065f46',
    900: '#064e3b',
  },
  teal: {
    50: '#f0fdfa',
    100: '#ccfbf1',
    200: '#99f6e4',
    300: '#5eead4',
    400: '#2dd4bf',
    500: '#14b8a6',
    600: '#0d9488',
    700: '#0f766e',
    800: '#115e59',
    900: '#134e4a',
  },
  cyan: {
    50: '#ecfeff',
    100: '#cffafe',
    200: '#a5f3fc',
    300: '#67e8f9',
    400: '#22d3ee',
    500: '#06b6d4',
    600: '#0891b2',
    700: '#0e7490',
    800: '#155e75',
    900: '#164e63',
  },
  sky: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    200: '#bae6fd',
    300: '#7dd3fc',
    400: '#38bdf8',
    500: '#0ea5e9',
    600: '#0284c7',
    700: '#0369a1',
    800: '#075985',
    900: '#0c4a6e',
  },
  blue: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
  },
  indigo: {
    50: '#eef2ff',
    100: '#e0e7ff',
    200: '#c7d2fe',
    300: '#a5b4fc',
    400: '#818cf8',
    500: '#6366f1',
    600: '#4f46e5',
    700: '#4338ca',
    800: '#3730a3',
    900: '#312e81',
  },
  violet: {
    50: '#f5f3ff',
    100: '#ede9fe',
    200: '#ddd6fe',
    300: '#c4b5fd',
    400: '#a78bfa',
    500: '#8b5cf6',
    600: '#7c3aed',
    700: '#6d28d9',
    800: '#5b21b6',
    900: '#4c1d95',
  },
  purple: {
    50: '#faf5ff',
    100: '#f3e8ff',
    200: '#e9d5ff',
    300: '#d8b4fe',
    400: '#c084fc',
    500: '#a855f7',
    600: '#9333ea',
    700: '#7e22ce',
    800: '#6b21a8',
    900: '#581c87',
  },
  fuchsia: {
    50: '#fdf4ff',
    100: '#fae8ff',
    200: '#f5d0fe',
    300: '#f0abfc',
    400: '#e879f9',
    500: '#d946ef',
    600: '#c026d3',
    700: '#a21caf',
    800: '#86198f',
    900: '#701a75',
  },
  pink: {
    50: '#fdf2f8',
    100: '#fce7f3',
    200: '#fbcfe8',
    300: '#f9a8d4',
    400: '#f472b6',
    500: '#ec4899',
    600: '#db2777',
    700: '#be185d',
    800: '#9d174d',
    900: '#831843',
  },
  rose: {
    50: '#fff1f2',
    100: '#ffe4e6',
    200: '#fecdd3',
    300: '#fda4af',
    400: '#fb7185',
    500: '#f43f5e',
    600: '#e11d48',
    700: '#be123c',
    800: '#9f1239',
    900: '#881337',
  },
};