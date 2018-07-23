import * as gulp from 'gulp';
import { ITaskOption, Development } from 'development-tool';
import { Operation } from 'development-core';
const through = require('through2');
import { classAnnotations } from '../aop/node_modules/@ts-ioc/annotations'
// import 'development-tool-node';
const resolve = require('rollup-plugin-node-resolve');
const rollupSourcemaps = require('rollup-plugin-sourcemaps');
const commonjs = require('rollup-plugin-commonjs');
const builtins = require('rollup-plugin-node-builtins');
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
            }
            // {
            //     name: 'rollup',
            //     pipes: [
            //         (ctx) => {
            //             return rollup({
            //                 name: 'platform-server.js',
            //                 format: 'es5',
            //                 plugins: [
            //                     commonjs(),
            //                     builtins(),
            //                     rollupSourcemaps()
            //                 ],
            //                 external: [
            //                     'reflect-metadata',
            //                     'log4js',
            //                     'globby',
            //                     'minimatch',
            //                     'inherits',
            //                     '@ts-ioc/core'
            //                 ],
            //                 globals: {
            //                     'reflect-metadata': 'Reflect',
            //                     'log4js': 'log4js',
            //                     'globby': 'globby',
            //                     'minimatch': 'minimatch',
            //                     'inherits': 'inherits',
            //                     '@ts-ioc/core': '@ts-ioc/core',
            //                     '@ts-ioc/aop': '@ts-ioc/aop'
            //                 },
            //                 input: './lib/index.js'
            //             })
            //         },
            //         () => rename('platform-server.js')
            //     ]
            // }
        ]
    },
    {
        refs: [
            {
                name: 'platform-server-bootstrap',
                path: (ctx) => 'bootstrap',
                cmd: (ctx) => (ctx.oper & Operation.deploy) ? 'gulp release' : 'gulp start'
            },
        ]
    }
]).start();
