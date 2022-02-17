const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = (env, opts) => {
	const NDEBUG = opts.mode == 'production';
	const devtool = (NDEBUG)? undefined : 'eval-source-map';
	return {
		entry: './src/index.js',
		output: {
			path: path.resolve(__dirname, './dist'),
			filename: 'walletconnect.[name].js',
			libraryTarget: 'umd',
			globalObject: 'this',
			library: 'walletconnect',
			clean: true
		},
		// https://stackoverflow.com/questions/64557638/how-to-polyfill-node-core-modules-in-webpack-5
		resolve: {
			fallback: {
				fs: false,
				tls: false,
				net: false,
				path: false,
				zlib: false,
				http: false,
				https: false,
				stream: false,
				crypto: require.resolve('crypto-browserify'),
			}
		},
		plugins: [
			// https://github.com/ipfs/js-ipfs/issues/3369
			new webpack.ProvidePlugin({
				Buffer: ['buffer', 'Buffer']
			}),
			new HtmlWebpackPlugin({
				template: './src/index.html',
				minify: false
			}),
		],
		module: {
			rules: [{
				test: /\.js$/,
				include: [path.resolve(__dirname, 'src')],
				exclude: /node_modules/,
				use: {
					loader: 'babel-loader',
					// https://stackoverflow.com/questions/34973442/how-to-stop-babel-from-transpiling-this-to-undefined-and-inserting-use-str
					options: {
						sourceType: 'unambiguous',
						exclude: [/node_modules\/core-js/, /node_modules\/webpack\/buildin/],
						presets: [
							['@babel/preset-env',
							{
								modules: false,
								useBuiltIns: 'usage',
								corejs: 'core-js@3',
								debug: !NDEBUG
							}]
						],
						plugins: ['@babel/plugin-transform-runtime']
					}
				}
			}]
		},
		devtool,
		optimization: {
			splitChunks: {
				chunks: 'all',
			},
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

