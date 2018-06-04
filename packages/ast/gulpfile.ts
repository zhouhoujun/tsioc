import * as gulp from 'gulp';
import { ITaskOption, Development } from 'development-tool';
import { Operation } from 'development-core';
const through = require('through2');
import { classAnnotations } from '@ts-ioc/annotations';
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
        dist: 'lib',
        src: 'src',
        testSrc: 'test/**/*.spec.ts',
        // test: false,
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
                            name: 'aop.umd.js',
                            format: 'umd',
                            plugins: [
                                resolve(),
                                commonjs(),
                                rollupSourcemaps()
                            ],
                            external: [
                                'reflect-metadata',
                                'log4js',
                                'tslib',
                                '@ts-ioc/core'
                            ],
                            globals: {
                                'reflect-metadata': 'Reflect',
                                'log4js': 'log4js',
                                '@ts-ioc/core': '@ts-ioc/core'
                            },
                            input: './lib/index.js'
                        })
                    },
                    () => rename('aop.umd.js')
                ]
            },
            {
                name: 'zip',
                src: 'bundles/aop.umd.js',
                pipes: [
                    () => rename('aop.umd.min.js'),
                    () => uglify()
                ]
            }
        ]
    }
]).start();
