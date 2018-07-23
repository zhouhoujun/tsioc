import * as gulp from 'gulp';
import { ITaskOption, Development } from 'development-tool';
import { Operation } from 'development-core';
const through = require('through2');
import { classAnnotations } from '../aop/node_modules/@ts-ioc/annotations'
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
                            name: 'logs.umd.js',
                            format: 'umd',
                            plugins: [
                                resolve(),
                                commonjs(),
                                rollupSourcemaps()
                            ],
                            external: [
                                'reflect-metadata',
                                'tslib',
                                'log4js',
                                '@ts-ioc/core',
                                '@ts-ioc/aop'
                            ],
                            globals: {
                                'reflect-metadata': 'Reflect',
                                'log4js': 'log4js',
                                '@ts-ioc/core': '@ts-ioc/core',
                                '@ts-ioc/aop': '@ts-ioc/aop'
                            },
                            input: './lib/index.js'
                        })
                    },
                    () => rename('logs.umd.js')
                ]
            },
            {
                name: 'zip',
                src: 'bundles/logs.umd.js',
                pipes: [
                    () => rename('logs.umd.min.js'),
                    () => uglify()
                ]
            }
        ]
    }
]).start();
