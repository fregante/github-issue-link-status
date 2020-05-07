import {multiOptions} from './options-storage';

async function init() {
	await multiOptions.syncForm('form');

	// Update domain-dependent page content when the domain is changed
	select('.js-options-sync-selector')?.addEventListener('change', event => {
		document.querySelector('a').host = event.currentTarget.value;
	});
}

init();
