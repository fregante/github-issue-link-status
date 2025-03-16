import 'webext-dynamic-content-scripts';
import addDomainPermissionToggle from 'webext-domain-permission-toggle';
import './options-storage.js';

// GitHub Enterprise support
addDomainPermissionToggle();

// Open options to add the token
chrome.runtime.onInstalled.addListener(event => {
	if (event.reason === 'install') {
		chrome.runtime.openOptionsPage();
	}
});
