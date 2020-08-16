import {perDomainOptions} from './options-storage';

async function init() {
	await perDomainOptions.syncForm('form');

	// Update domain-dependent page content when the domain is changed
	const picker = document.querySelector('.OptionsSyncPerDomain-picker select');
	const newTokenLink = document.querySelector('a');
	if (picker) {
		picker.addEventListener('change', () => {
			newTokenLink.host = picker.value === 'default' ? 'github.com' : picker.value;
		});
	}
}

init();
