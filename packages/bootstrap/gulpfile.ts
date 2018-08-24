import * as gulp from 'gulp';
import { ITaskOption, Development } from 'development-tool';
import { Operation } from 'development-core';
const through = require('through2');
import { classAnnotations } from '@ts-ioc/annotations'
// import 'development-tool-node';
const resolve = require('rollup-plugin-node-resolve');
const rollupSourcemaps = require('rollup-plugin-sourcemaps');
const commonjs = require('rollup-plugin-commonjs');
// import { rollup } from 'rollup';
const rollup = require('gulp-rollup');
const rename = require('gulp-rename');
const uglify = require('gulp-uglify');
const del = require('del');
// const builtins = require('rollup-plugin-node-builtins');
// const globals = require('rollup-plugin-node-globals');


Development.create(gulp, __dirname, [
    <ITaskOption>{
        src: 'src',
        dist: 'lib',
        testSrc: 'test/**/*.spec.ts',
        loader: 'development-tool-node',
        asserts: {
            ts: {
                src: 'src/**/*.ts',
                tsPipes: [
                    () => classAnnotations()
                ],
                loader: 'development-assert-ts'
            }
        }
    },
    <ITaskOption>{
        src: ['lib/**/*.js'],
        dist: 'bundles',
        oper: Operation.release | Operation.deploy,
        loader: [
            {
                name: 'delbundles',
                task: () => del('bundles')
            },
            {
                name: 'rollup',
                pipes: [
                    (ctx) => {
                        return rollup({
                            name: 'bootstrap.umd.js',
                            format: 'umd',
                            plugins: [
                                resolve(),
                                commonjs(),
                                // globals(),
                                // builtins(),
                                rollupSourcemaps()
                            ],
                            external: [
                                'reflect-metadata',
                                'events',
                                'tslib',
                                'log4js',
                                '@ts-ioc/core',
                                '@ts-ioc/aop'
                            ],
                            globals: {
                                'reflect-metadata': 'Reflect'
                            },
                            input: './lib/index.js'
                        })
                    },
                    () => rename('bootstrap.umd.js')
                ]
            },
            {
                name: 'zip',
                src: 'bundles/bootstrap.umd.js',
                pipes: [
                    () => rename('bootstrap.umd.min.js'),
                    () => uglify()
                ]
            }
        ]
    }
]).start();
