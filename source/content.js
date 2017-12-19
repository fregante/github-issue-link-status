import 'webext-dynamic-content-scripts';
import select from 'select-dom';
import OptionsSync from 'webext-options-sync';

const endpoint = 'https://api.github.com/graphql';
const issueUrlRegex = /^[/](.+[/][^/]+)[/](issues|pull)[/](\d+)([/]|$)/;

let token;

function escapeForGql(repo) {
	return repo.replace(/[/-]/g, '_');
}

function buildGQL(links) {
	const repoIssueMap = new Map();
	for (const {repo, type, id} of links.values()) {
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
	const newLinks = new Map();
	const containers = select.all(`
		.js-issue-title,
		.timeline-comment-wrapper
	`);
	const links = select.all(`
		a[href*="/pull/"]:not(.webext-link-status),
		a[href*="/issues/"]:not(.webext-link-status)
	`, containers);
	for (const link of links) {
		link.classList.add('webext-link-status');
		let [, repo, type, id] = link.pathname.match(issueUrlRegex) || [];
		if (id) {
			type = type.replace('issues', 'issue').replace('pull', 'pullRequest');
			newLinks.set(link, {repo, type, id});
		}
	}
	return newLinks;
}

async function apply() {
	const links = getNewLinks();
	if (links.size === 0) {
		return;
	}

	const gcl = buildGQL(links);
	const response = await fetch(endpoint, {
		method: 'POST',
		headers: new Headers({
			Authorization: `bearer ${token}`
		}),
		body: `{"query": ${JSON.stringify(gcl)}}`
	});
	const {data} = await response.json();

	for (const [link, {repo, type, id}] of links) {
		const state = data['repo' + escapeForGql(repo)]['id' + id].state.toLowerCase();
		link.classList.add('ILS--' + state);
		link.classList.add('ILS--' + type);
	}
}

async function init() {
	const options = await new OptionsSync().getAll();
	token = options.token;
	if (token) {
		document.addEventListener('pjax:end', apply);
		apply();
	} else {
		console.error('GitHub Issue Link Status: you will need to set a token in the options for this extension to work.');
	}
}

init();
