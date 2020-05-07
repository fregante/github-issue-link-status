import OptionsSyncMulti from 'webext-options-sync-multi';

export const multiOptions = new OptionsSyncMulti({
	defaults: {
		token: ''
	}
});

export default multiOptions.getOptionsForOrigin();
