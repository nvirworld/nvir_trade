const path = require('path');
const webpack = require('webpack');

// To serve gzip compressed resources, it is required to config the web server
//const CompressionPlugin = require('compression-webpack-plugin');
//const zopfli = require('@gfx/zopfli');

const HtmlWebpackPlugin = require('html-webpack-plugin');

// https://github.com/kalcifer/webpack-library-example/blob/master/webpack.config.babel.js
// https://webpack.js.org/guides/environment-variables/
// https://stackoverflow.com/questions/34973442/how-to-stop-babel-from-transpiling-this-to-undefined-and-inserting-use-str

//let cnt = 0;

module.exports = (env, opts) => {
	//console.dir(opts);
	const NDEBUG = opts.mode == 'production';
	const devtool = (NDEBUG)? undefined : 'eval-source-map';
	return {
		//mode: env.mode,
		//mode: process.env.NODE_ENV,
		entry: './src/index.js',
		output: {
			path: path.resolve(__dirname, './dist'),
			//filename: 'wallet.js',
			//filename: 'wallet.[name][hash:8].js',
			filename: 'wallet.[name].[contenthash].js',
//			filename(pathData) {
//				if (pathData.chunk.name !== 'main') {
//					return '[contenthash].js';
//				}
//				return 'wallet.js';
//			},
			libraryTarget: 'umd',
			//libraryTarget: 'this',
			globalObject: 'this',
			library: 'wallet',
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
		// https://github.com/ipfs/js-ipfs/issues/3369
		plugins: [
			new webpack.ProvidePlugin({
				Buffer: ['buffer', 'Buffer']
			}),
//			new CompressionPlugin({
//				compressionOptions: {
//					numiterations: 15,
//				},
//				algorithm(input, compressionOptions, callback) {
//					return zopfli.gzip(input, compressionOptions, callback);
//				},
//			}),
			// https://github.com/jantimon/html-webpack-plugin
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
//					options: {
//						sourceType: 'unambiguous',
//					}
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
				chunks: 'all'
			},
			//runtimeChunk: 'single',
//			splitChunks: {
//				chunks: 'all',
//				maxInitialRequests: Infinity,
//				minSize: 0,
//				cacheGroups: {
//					vendor: {
//						//maxSize: 200 * 1024,
//						test: /[\\/]node_modules[\\/]/,
//						name: 'vendors',
////						name(module, chunks, cacheGroupKey) {
////							console.log(cnt++, '----------------------------------------------------');
////							//console.dir(module);
////							//console.dir(module.identifier(), module.context);
////							console.log('module_id', module.identifier());
////							console.log('module_ctx', module.context);
////							console.dir(chunks);
////							console.log('group_key:', cacheGroupKey);
////							return 'vendors';
////						},
////						name(module) {
////							const packageName = module.context.match(/[\\/]node_modules[\\/](.*?)([\\/]|$)/)[1];
////							return `npm.${packageName.replace('@', '')}`;
////						},
////						name(module) {
////							return `${cnt++}`;
////						},
//						//reuseExistingChunk: true,
//					}
//				}
//			},
////			splitChunks: {
////				cacheGroups: {
////					commons: {
////						test: /[\\/]node_modules[\\/]/,
////						name: 'vendors',
////						chunks: 'all'
////					}
////				}
////			},
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

