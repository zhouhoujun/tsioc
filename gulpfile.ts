import * as gulp from 'gulp';
import { ITaskOption, Development } from 'development-tool';
import { Operation } from 'development-core';
// import { classAnnotations } from 'typescript-class-annotations'
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
        oper: Operation.release | Operation.deploy,
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
                                resolve(),
                                commonjs(),
                                rollupSourcemaps()
                            ],
                            external: [
                                'reflect-metadata',
                                'log4js'
                            ],
                            globals: {
                                'reflect-metadata': 'Reflect',
                                'log4js': 'log4js'
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
