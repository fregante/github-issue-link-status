import 'webext-dynamic-content-scripts';
import OptionsSync from 'webext-options-sync';
import addDomainPermissionToggle from 'webext-domain-permission-toggle';
import './options-storage'

// GitHub Enterprise support
addDomainPermissionToggle();

// Open options to add the token
chrome.runtime.onInstalled.addListener(event => {
	if (event.reason === 'install') {
		chrome.runtime.openOptionsPage();
	}
});
