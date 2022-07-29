// based on previous work done by:
// - Dhrumil Shah (@wandcrafting) and Robert Haisfield (@RobertHaisfield): https://www.figma.com/file/5shwLdUCHxSaPNEO7pazbe/
// - Azlen Elza (@azlenelza): https://gist.github.com/azlen/cc8d543f0e46e17d978e705650df0e9e


let internals = {};

internals.extensionAPI = null;

internals.settingsCached = {
	color: null,
	colorShade: null,
	scaleFactor: null,
	important: null,

	colorHex: null,  // computed option (from color and colorShade)
	cssClass: null,  // computed option (from important)
	debug: null  // activated by query string
};

internals.settingsDefault = {
	color: 'blue',
	colorShade: '500',
	scaleFactor: 1.5,
	important: false
};

internals.unloadHandlers = [];

internals.selectorForTextarea = 'textarea.rm-block-input';

function onload({ extensionAPI }) {

	internals.extensionAPI = extensionAPI;
	createSettingsPanel();

	main('div.roam-main');
	main('div#right-sidebar');

	log('onload');
}

function onunload() {

	internals.unloadHandlers.forEach(unloadHandler => { unloadHandler() })

	log('onunload');
}

function createSettingsPanel() {

	let { panel, get, set } = internals.extensionAPI.settings;

	let panelConfig = {
		tabTitle: "Reference Path",
		settings: [
			{
				id: "scaleFactor",
				name: "Scale factor for the bullets in the reference path",
				description: "desc Scale factor for the bullets in the reference path",
				action: {
					type: "input",
					onChange: ev => { updateSettingsCached({ scaleFactor: ev.target.value }) },
					placeholder: "1",
				}
			},
			{
				id: "color",
				name: "Color for the reference path",
				description: "desc Color for the reference path",
				action: {
					type: "select",
					onChange: value => { updateSettingsCached({ color: value }) },
					items: [
						'gray', 
						'slate (gray variant)', 
						'zinc (gray variant)', 
						'neutral (gray variant)', 
						'stone (gray variant)', 
						'red', 
						'orange', 
						'amber', 
						'yellow', 
						'lime', 
						'green', 
						'emerald', 
						'teal', 
						'cyan', 
						'sky', 
						'blue', 
						'indigo', 
						'violet', 
						'purple', 
						'fuchsia', 
						'pink', 
						'rose', 
					],
				}
			},
			{
				id: "colorShade",
				name: "Color for the reference path",
				description: "desc Color for the reference path",
				action: {
					type: "select",
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
				id: "important",
				name: "Use the important css keyword",
				description: "If the css used in this extension has some conflict with css from some other loaded extension or theme, this setting might have to be activated",
				action: {
					type: "switch",
					onChange: ev => { updateSettingsCached({ important: ev.target.checked }) }
				}
			},
		]
	};

	panel.create(panelConfig);

	let keys = panelConfig.settings.map(o => o.id);

	// compute the cached settings

	keys.forEach(key => {

		let value = get(key);

		// if necessary use the values from the default settings to initialize the panel

		if (value == null) {
			value = internals.settingsDefault[key];
			set(key, value);
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
	let tailwindColorClass = `text-${color}-${colorShade}`;
	let dummySpan = document.createElement('span');

	dummySpan.style.display = 'none';
	dummySpan.classList.add(tailwindColorClass);
	document.body.appendChild(dummySpan);
	let colorHex = window.getComputedStyle(dummySpan).color;
	dummySpan.remove();

	log('getColorHex', { colorHex })

	return colorHex;
}

function addReferencePath(el) {

	log('addReferencePath', el);

	let bulletList = [];

	for(;;) {
		let parentBlockEl = el.closest('div.roam-block-container');

		if (parentBlockEl == null) { break }

		// the "bullet element" is technically div.controls > span.rm-bullet, but we must 
		// style the wrapper / parent (div.controls)

		let bullet = parentBlockEl.querySelector('div.controls');

		// make sure querySelector actually got something (because roam might change the css 
		// class names in the future, and we would be have a reference error)

		if (bullet != null) {
			bullet.classList.add(internals.settingsCached.cssClass);
			bullet.style.setProperty('--reference-path-scale-factor', internals.settingsCached.scaleFactor);
			bullet.style.setProperty('--reference-path-color', internals.settingsCached.colorHex);

			bulletList.push(bullet);      

			if (bulletList.length >= 2) {
				// note that --reference-path-border-width must be set to 0 when 
				// the reference path is removed, so we must set again here

				bullet.style.setProperty('--reference-path-border-width', '1px');

				let bbox = bullet.getBoundingClientRect()

				let bulletPrevious = bulletList[bulletList.length - 2];
				let bboxPrevious = bulletPrevious.getBoundingClientRect()

				// we have bboxPrevious.x > bbox.x because bulletPrevious is 
				// to the right of bullet (it has "higher" indentation)

				let width = bboxPrevious.x - bbox.x;
				bullet.style.setProperty('--reference-path-width', `${width}px`);

				// similar remarks for y (bulletPrevious below bullet);
				// reference: https://developer.mozilla.org/en-US/docs/Web/API/Element/getBoundingClientRect

				let height = bboxPrevious.y - bbox.y;
				bullet.style.setProperty('--reference-path-height', `${height}px`);
			}
		}

		// go up in the tree

		el = parentBlockEl.parentElement;
	}

	return bulletList;

}

function removeReferencePath(bulletList) {

	log('removeReferencePath')

	// use plain for loops and inline code for maximum performance

	for (let idx = 0; idx < bulletList.length; idx++) {
		let bullet = bulletList[idx];
		bullet.style.setProperty('--reference-path-border-width', '0');
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

function log() {

	if (internals.settingsCached.debug) {
		console.log(`[roam-reference-path ${Date.now()}]`, ...arguments);	
	}
}


function main (selector) {

	let rootEl = document.querySelector(selector);

	if (rootEl == null) { return }

	let bulletList = [];  // array of nodes

	// reference: https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver/MutationObserver

	let observerCallback = function observerCallback (mutationList, observer) {

		// return early for the common case of typing in the active block (edit mode)

		let isProbablyTyping = (mutationList.length === 1);

		if (isProbablyTyping && isMutationForTyping(mutationList[0])) { return }

		log('observerCallback', { mutationList })

		// first-pass: if there mutations relative to leaving edit mode, remove any existing reference path

		for (let idx = 0; idx < mutationList.length; idx++) {
			let m = mutationList[idx];

			let isCandidate = (m.removedNodes.length > 0 && m.target.className.includes('rm-block-main'));

			if (!isCandidate) { continue }

			if (m.removedNodes[0].querySelector(internals.selectorForTextarea) != null) {
				removeReferencePath(bulletList);
				bulletList = [];  // help GC
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

				/*
				textareaEl.addEventListener('focusout', async () => { 

					// edge-case: when the command pallete is opened and immediately closed, the textarea element is not 
					// removed; however the focus is moved from the textarea to the command pallete; technically we are 
					// still in edit mode, but in  practice we can't write anything; this is a bug in roam that should be solved upstream;
					
					await delay(0);

					if (document.body.className.includes('bp3-overlay-open')) {
						removeReferencePath(bulletList) 
						bulletList = [];  // help GC
					}
				});
				*/

				break;
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

		observer.disconnect();
		removeReferencePath(bulletList);
		bulletList = [];
	};

	internals.unloadHandlers.push(unloadHandler);
}

export default {
	onload,
	onunload
};

