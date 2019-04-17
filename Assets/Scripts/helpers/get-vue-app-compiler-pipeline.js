const gulp = require('gulp');
const all = require('gulp-all');
const plumber = require('gulp-plumber');
const rollup = require('gulp-rollup');
const uglify = require('gulp-uglify');
const rename = require('gulp-rename');
const buble = require('rollup-plugin-buble');
const alias = require('rollup-plugin-alias');
const resolve = require('rollup-plugin-node-resolve');
const commonjs = require('rollup-plugin-commonjs');
const replace = require('rollup-plugin-replace');
const json = require('rollup-plugin-json');
const nodeResolve = require('rollup-plugin-node-resolve');
const path = require('path');

const getVueApps = require('./get-vue-apps');

const defaultOptions = {
    rootPath: './Assets/Apps/',
    destinationPath: './wwwroot/Apps/',
    vueJsNodeModulesPath: '../Lombiq.VueJs/node_modules',
    rollupAlias: { }
};

const getVueAppCompilerPipeline = options => {
    const opts = options ? { ...options, ...defaultOptions } : defaultOptions;

    return all(getVueApps(opts.rootPath)
        .map(function (appName) {
            const entryPath = path.join(opts.rootPath, appName, '/main.js');

            return gulp.src(entryPath)
                .pipe(plumber())
                .pipe(rollup({
                    allowRealFiles: true,
                    input: path.join(entryPath),
                    output: {
                        format: 'cjs'
                    },
                    plugins: [
                        json(),
                        nodeResolve({ jsnext: true, preferBuiltins: true, browser: true }),
                        alias({
                            vue: path.resolve(path.join(opts.vueJsNodeModulesPath, 'vue/dist/vue.esm.browser.js')),
                            vuelidate: path.resolve(path.join(opts.vueJsNodeModulesPath, 'vuelidate/')),
                            'vue-router': path.resolve(path.join(opts.vueJsNodeModulesPath, 'vue-router/dist/vue-router.esm.js')),
                            'vue-axios': path.resolve(path.join(opts.vueJsNodeModulesPath, 'vue-axios/')),
                            axios: path.resolve(path.join(opts.vueJsNodeModulesPath, 'axios/')),
                            resolve: ['.js', '/index.js', '/lib/index.js', '/src/index.js'],
                            ...opts.rollupAlias
                        }),
                        resolve(),
                        replace({
                            'process.env.NODE_ENV': JSON.stringify('production'),
                            'process.env.BUILD': JSON.stringify('web')
                        }),
                        commonjs(),
                        buble()
                    ]
                }))
                .pipe(rename(appName + '.js'))
                .pipe(gulp.dest(opts.destinationPath))
                .pipe(uglify())
                .pipe(rename(appName + '.min.js'))
                .pipe(gulp.dest(opts.destinationPath));
        }));
};

module.exports = getVueAppCompilerPipeline;