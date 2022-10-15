const alias = require('@rollup/plugin-alias');
const commonjs = require('@rollup/plugin-commonjs');
const del = require('del');
const fs = require('fs');
const json = require('@rollup/plugin-json');
const glob = require('glob');
const path = require('path');
const replace = require('@rollup/plugin-replace');
const { nodeResolve } = require('@rollup/plugin-node-resolve');

const argsExecute = require('./args-execute');
const configureRollupAlias = require('./configure-rollup-alias');
const rollupPipeline = require('./rollup-pipeline');
const { getVueApps } = require('./get-vue-files');

const defaultOptions = {
    rootPath: path.resolve('..', '..', 'Assets', 'Apps'),
    destinationPath: path.resolve('..', '..', 'wwwroot', 'apps'),
    vueJsNodeModulesPath: path.resolve(__dirname, '..', '..', '..', 'node_modules'),
    stylesPath: 'styles',
    rollupAlias: {},
    isProduction: false,
};

function compileApp(options) {
    const opts = options ? { ...defaultOptions, ...options } : defaultOptions;

    if (!fs.existsSync(opts.vueJsNodeModulesPath)) {
        throw new Error(`The vueJsNodeModulesPath option's path "${opts.vueJsNodeModulesPath}" does not exist!`);
    }
    if (!fs.lstatSync(opts.vueJsNodeModulesPath).isDirectory()) {
        throw new Error(`The vueJsNodeModulesPath option's path "${opts.vueJsNodeModulesPath}" is not a directory!`);
    }

    return rollupPipeline(
        opts.destinationPath,
        getVueApps(opts.rootPath)
            .map((appName) => ({ fileName: appName, entryPath: path.join(opts.rootPath, appName, '/main.js') })),
        [
            json(),
            configureRollupAlias(opts.vueJsNodeModulesPath, opts.isProduction, opts.rollupAlias),
            nodeResolve({ preferBuiltins: true, browser: true, mainFields: ['module', 'jsnext:main'] }),
            replace({
                values: {
                    'process.env.NODE_ENV': JSON.stringify(opts.isProduction ? 'production' : 'development'),
                    'process.env.BUILD': JSON.stringify('web'),
                },
                preventAssignment: true,
            }),
            commonjs(),
        ],
        null,
        (fileName) => path.basename(path.dirname(fileName)));
}

function globPromise(basePath) {
    return new Promise((resolve, reject) => {
        glob(basePath, (err, matches) => (err ? reject(err) : resolve(matches)));
    });
}

function compileCss(options) {
    const opts = options ? { ...defaultOptions, ...options } : defaultOptions;

    return Promise.all(getVueApps(opts.rootPath)
        .map(async (appName) => {
            const paths = await globPromise(path.join(
                opts.rootPath,
                appName,
                opts.stylesPath,
                '*.css'));

            await Promise.all(paths.map((filePath) => fs.promises.copyFile(
                filePath,
                path.join(opts.destinationPath, path.basename(filePath)))));
        }));
}

function compile(options) {
    compileApp(options);
    compileCss(options);
}

function clean(options) {
    const opts = options ? { ...defaultOptions, ...options } : defaultOptions;
    return del(opts.destinationPath, { force: true });
}

module.exports = { compile, clean };
argsExecute(module.exports);
