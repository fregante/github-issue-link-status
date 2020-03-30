'use strict';
const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
	entry: {
		'github-issue-link-status': './source/github-issue-link-status',
		background: './source/background',
		options: './source/options'
	},
	plugins: [
		new CopyWebpackPlugin([
			{
				from: '**',
				context: 'source',
				ignore: [
					'*.js'
				]
			},
			{
				from: 'node_modules/webext-base-css/webext-base.css'
			}
		])
	],
	output: {
		path: path.join(__dirname, 'distribution'),
		filename: '[name].js'
	}
};
