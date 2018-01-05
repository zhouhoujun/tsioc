import * as gulp from 'gulp';
import { ITaskOption, Development } from 'development-tool';
// import 'development-tool-node';
const resolve = require('rollup-plugin-node-resolve');
const rollupSourcemaps = require('rollup-plugin-sourcemaps');
const commonjs = require('rollup-plugin-commonjs');
// import { rollup } from 'rollup';
const rollup = require('gulp-rollup');
const rename = require('gulp-rename');
const uglify = require('gulp-uglify');
const del = require('del');

Development.create(gulp, __dirname, [
    <ITaskOption>{
        src: 'src',
        dist: 'lib',
        testSrc: 'test/**/*.spec.ts',
        loader: 'development-tool-node'
    },
    <ITaskOption>{
        src: ['lib/**/*.js', '!lib/node/**', '!lib/index.js'],
        dist: 'bundles',
        loader: [
            {
                name: 'delbundles',
                task: () => del('bundles')
            },
            {
                name: 'browser',
                pipes: [
                    (ctx) => {
                        return rollup({
                            name: 'tsioc.umd.js',
                            format: 'umd',
                            plugins: [
                                resolve({ jsnext: true }),
                                commonjs(),
                                rollupSourcemaps()
                            ],
                            external: [
                                'reflect-metadata'
                            ],
                            globals: {
                                'reflect-metadata': 'Reflect'
                            },
                            input: './lib/browser.js'
                        })
                    },
                    () => rename('tsioc.umd.js'),
                    () => uglify()
                ]
            }
        ]
    }
]).start();
