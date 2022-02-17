const path = require('path');
const webpack = require('webpack');

module.exports = (env, opts) => {
	const NDEBUG = opts.mode == 'production';
	const devtool = (NDEBUG)? undefined : 'eval-source-map';
	return {
		entry: './src/index.js',
		output: {
			path: path.resolve(__dirname, './dist'),
			filename: 'metamask.js',
			libraryTarget: 'umd',
			globalObject: 'this',
			library: 'metamask',
			clean: true
		},
		module: {
			rules: [{
				test: /\.js$/,
				include: [path.resolve(__dirname, 'src')],
				exclude: /node_modules/,
				use: {
					loader: 'babel-loader',
					// https://stackoverflow.com/questions/34973442/how-to-stop-babel-from-transpiling-this-to-undefined-and-inserting-use-str
					options: {
						sourceType: 'unambiguous'
					}
				}
			}]
		},
		devtool,
		optimization: {
			emitOnErrors: true,
			minimize: true,
			minimizer: [
				(compiler) => {
					const TerserPlugin = require('terser-webpack-plugin');
					new TerserPlugin({
						// https://www.coditty.com/code/angular-how-to-remove-console-log-from-production-build
						terserOptions: {
							compress: {
								drop_console: NDEBUG,
							},
						},
					}).apply(compiler);
				},
			],
		},
	};
};

