import options from './options-storage.js';
import * as icons from './icons.js';

let token;
const __DEV__ = false;
const endpoint = location.hostname === 'github.com'
	? 'https://api.github.com/graphql'
	: `${location.origin}/api/graphql`;
const issueUrlRegex = /^[/]([^/]+[/][^/]+)[/](issues|pull)[/](\d+)([/]|$)/;
const stateColorMap = {
	pullrequest: {
		open: ['text-green', 'color-text-success', 'color-fg-success'],
		closed: ['text-red', 'color-text-danger', 'color-fg-danger'],
		merged: ['text-purple', 'color-purple-5', 'color-fg-done'],
	},
	issue: {
		open: ['text-green', 'color-text-success', 'color-fg-success'],
		closed: ['text-purple', 'color-purple-5', 'color-fg-done'],
	},
};

function getIcon(state, type, isDraft = false) {
	const iconName = isDraft && state === 'open' ? 'draft' + type : state + type;
	if (!(iconName in icons)) {
		console.error('GitHub Issue Link Status: No icon named', iconName, 'found');
		return '';
	}

	if (iconName === 'draftpullrequest') {
		return icons.draftpullrequest.replace('<svg', '<svg class="octicon color-text-tertiary"');
	}

	return icons[iconName].replace('<svg', '<svg class="octicon"');
}

function esc(repo) {
	return '_' + repo.replace(/[./-]/g, '_');
}

function query(q) {
	q = `query {${q}}`;
	if (__DEV__) {
		console.log(q);
	}

	return q.replace(/\s{2,}/g, ''); // Minify
}

function join(iterable, merger) {
	return [...iterable.entries()].map(item => merger(item)).join('\n');
}

function buildGQL(links) {
	const repoIssueMap = new Map();
	for (const {repo, id} of links) {
		const issues = repoIssueMap.get(repo) || new Set();
		issues.add(id);
		repoIssueMap.set(repo, issues);
	}

	return query(
		join(repoIssueMap, ([repo, issues]) =>
			esc(repo) + `: repository(
				owner: "${repo.split('/')[0]}",
				name: "${repo.split('/')[1]}"
			) {${join(issues, ([id]) => `
				${esc(id)}: issueOrPullRequest(number: ${id}) {
					__typename
					... on PullRequest {
						state,
						isDraft
					}
					... on Issue {
						state
					}
				}
			`)}}
		`),
	);
}

function getNewLinks() {
	const newLinks = new Set();
	const links = document.querySelectorAll(`
		:is(
			.js-issue-title,
			.markdown-body
		)
		a[href^="${location.origin}"]:is(
			a[href*="/pull/"],
			a[href*="/issues/"]
		):not(.ILS)
	`);
	for (const link of links) {
		link.classList.add('ILS');
		let [, repo, type, id] = link.pathname.match(issueUrlRegex) || [];
		if (id) {
			type = type.replace('issues', 'issue').replace('pull', 'pullrequest');
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
		link.insertAdjacentHTML('beforeEnd', getIcon('open', type));
	}

	const query = buildGQL(links);
	const response = await fetch(endpoint, {
		method: 'POST',
		headers: {
			Authorization: `bearer ${token}`,
		},
		body: JSON.stringify({query}),
	});
	if (response.status === 401) {
		console.error('GitHub Issue Link Status: The token was not accepted, it’s likely expired');
		return;
	}

	const {data} = await response.json();

	for (const {link, repo, id} of links) {
		try {
			const item = data[esc(repo)][esc(id)];
			const type = item.__typename.toLowerCase();
			const state = item.state.toLowerCase();

			link.classList.add(...stateColorMap[type][state]);

			link.querySelector('svg').outerHTML = getIcon(state, type, item.isDraft);
		} catch {/* Probably a redirect */}
	}
}

function onAjaxedPages(cb) {
	cb();
	document.addEventListener('pjax:end', cb);
}

function onNewComments(cb) {
	cb();
	const commentList = document.querySelector('.js-discussion');
	if (commentList) {
		// When new comments come in via ajax
		new MutationObserver(cb).observe(commentList, {childList: true});

		// When you edit your own comment
		commentList.addEventListener('submit', () => setTimeout(cb, 1000)); // Close enough
	}
}

async function init() {
	({token} = await options.getAll());
	if (token) {
		onAjaxedPages(() => onNewComments(apply));
	} else {
		console.error('GitHub Issue Link Status: you will need to set a token in the options for this extension to work.');
	}
}

init();
