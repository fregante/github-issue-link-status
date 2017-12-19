import OptionsSync from 'webext-options-sync';
import domainPermissionToggle from 'webext-domain-permission-toggle';
import dynamicContentScripts from 'webext-dynamic-content-scripts';

// Define defaults
new OptionsSync().define({
	defaults: {
		token: ''
	}
});

// GitHub Enterprise support
dynamicContentScripts.addToFutureTabs();
domainPermissionToggle.addContextMenu();

// Open options to add the token
chrome.runtime.onInstalled.addListener(event => {
	if (event.reason === 'install') {
		chrome.runtime.openOptionsPage();
	}
});
