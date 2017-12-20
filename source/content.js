import 'webext-dynamic-content-scripts';
import select from 'select-dom';
import OptionsSync from 'webext-options-sync';
import * as icons from './icons';

let token;
const endpoint = location.hostname === 'github.com' ? 'https://api.github.com/graphql' : `${location.origin}/api/graphql`;
const issueUrlRegex = /^[/](.+[/][^/]+)[/](issues|pull)[/](\d+)([/]|$)/;
const stateColorMap = {
	open: 'text-green',
	closed: 'text-red',
	merged: 'text-purple'
};

function anySelector(selector) {
	const prefix = document.head.style.MozOrient === '' ? 'moz' : 'webkit';
	return selector.replace(/:any\(/g, `:-${prefix}-any(`);
}

function escapeForGql(repo) {
	return repo.replace(/[/-]/g, '_');
}

function buildGQL(links) {
	const repoIssueMap = new Map();
	for (const {repo, type, id} of links) {
		const issues = repoIssueMap.get(repo) || new Map();
		issues.set(id, type);
		repoIssueMap.set(repo, issues);
	}
	return `query
		{${
			[...repoIssueMap.entries()].map(([repo, issues]) => `
				repo${escapeForGql(repo)}: repository(
					owner: "${repo.split('/')[0]}",
					name: "${repo.split('/')[1]}"
				) {${
					[...issues.entries()].map(([id, type]) => `
						id${id}: ${type}(number: ${id}) {
							state
						}
					`).join('\n')
				}}
			`).join('\n')
		}}
	`.replace(/\t+/g, '').replace(/\n/g, '');
}

function getNewLinks() {
	const newLinks = new Set();
	const links = select.all(anySelector(`
		:any(
			.js-issue-title,
			.markdown-body
		)
		:any(
			a[href*="/pull/"],
			a[href*="/issues/"]
		):not(.ILS)
	`));
	for (const link of links) {
		link.classList.add('ILS');
		let [, repo, type, id] = link.pathname.match(issueUrlRegex) || [];
		if (id) {
			type = type.replace('issues', 'issue').replace('pull', 'pullRequest');
			newLinks.add({link, repo, type, id});
		}
	}
	return newLinks;
}

async function apply() {
	const links = getNewLinks();
	if (links.size === 0) {
		return;
	}

	for (const {link, type} of links) {
		link.insertAdjacentHTML('beforeEnd', icons['open' + type]);
	}

	const query = buildGQL(links);
	const response = await fetch(endpoint, {
		method: 'POST',
		headers: new Headers({
			Authorization: `bearer ${token}`
		}),
		body: JSON.stringify({query})
	});
	const {data} = await response.json();

	for (const {link, repo, type, id} of links) {
		const state = data['repo' + escapeForGql(repo)]['id' + id].state.toLowerCase();
		link.classList.add(stateColorMap[state]);
		if (state !== 'open' && state + type !== 'closedpullRequest') {
			link.querySelector('svg').outerHTML = icons[state + type];
		}
	}
}

function onAjaxedPages(cb) {
	cb();
	document.addEventListener('pjax:end', cb);
}

function onNewComments(cb) {
	cb();
	const commentList = select('.js-discussion');
	if (commentList) {
		new MutationObserver(cb).observe(commentList, {childList: true});
	}
}

async function init() {
	const options = await new OptionsSync().getAll();
	token = options.token;
	if (token) {
		onAjaxedPages(() => onNewComments(apply));
	} else {
		console.error('GitHub Issue Link Status: you will need to set a token in the options for this extension to work.');
	}
}

init();
