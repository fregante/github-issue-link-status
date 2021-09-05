import OptionsSyncPerDomain from 'webext-options-sync-per-domain';

export const perDomainOptions = new OptionsSyncPerDomain({
	defaults: {
		token: '',
	},
});

export default perDomainOptions.getOptionsForOrigin();
