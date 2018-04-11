import * as gulp from 'gulp';
import { ITaskOption, Development, IContext } from 'development-tool';
import { Operation } from 'development-core';
const through = require('through2');
import { classAnnotations } from 'typescript-class-annotations'
// import 'development-tool-node';
const resolve = require('rollup-plugin-node-resolve');
const rollupSourcemaps = require('rollup-plugin-sourcemaps');
const commonjs = require('rollup-plugin-commonjs');
// import { rollup } from 'rollup';
const rollup = require('gulp-rollup');
const rename = require('gulp-rename');
const uglify = require('gulp-uglify');
const del = require('del');

let argFactory = (ctx: IContext) => {
    if (ctx.oper & Operation.deploy) {
        return '--access=public';
    } else if (ctx.oper & Operation.release) {
        return '--release';
    } else {
        return ctx.oper & Operation.test ? '--test' : '';
    }
}

Development.create(gulp, __dirname, [
    <ITaskOption>{
        refs: [
            {
                name: 'core',
                path: (ctx) => 'packages/core',
                cmd: (ctx) => (ctx.oper & Operation.deploy) ? 'npm publish' : 'gulp start',
                args: argFactory
            }
        ],
        tasks: [
            {
                loader: [
                    {
                        name: 'copy-to-aop',
                        src: ['packages/core/**', '!packages/core/test/**', '!packages/core/src/**', '!packages/core/node_modules/**'],
                        dist: 'packages/aop/node_modules/@ts-ioc/core',
                        pipes: []
                    },
                    {
                        name: 'copy-to-logs',
                        src: ['packages/core/**', '!packages/core/test/**', '!packages/core/src/**', '!packages/core/node_modules/**'],
                        dist: 'packages/logs/node_modules/@ts-ioc/core',
                        pipes: []
                    },
                    {
                        name: 'copy-to-server',
                        src: ['packages/core/**', '!packages/core/test/**', '!packages/core/src/**', '!packages/core/node_modules/**'],
                        dist: 'packages/platform-server/node_modules/@ts-ioc/core',
                        pipes: []
                    }
                ]
            }
        ]
    },
    <ITaskOption>{
        refs: [
            {
                name: 'aop',
                path: (ctx) => 'packages/aop',
                cmd: (ctx) => (ctx.oper & Operation.deploy) ? 'npm publish' : 'gulp start',
                args: argFactory
            },
        ],
        tasks: [
            {
                loader: [{
                    name: 'copy',
                    src: ['packages/aop/**', '!packages/aop/test/**', '!packages/aop/src/**', '!packages/aop/node_modules/**'],
                    dist: 'packages/logs/node_modules/@ts-ioc/aop',
                    pipes: []
                }]
            }
        ]
    },
    {
        refs: [
            {
                name: 'logs',
                path: (ctx) => 'packages/logs',
                cmd: (ctx) => (ctx.oper & Operation.deploy) ? 'npm publish' : 'gulp start',
                args: argFactory
            },
            {
                name: 'platform-browser',
                path: (ctx) => 'packages/platform-browser',
                cmd: (ctx) => (ctx.oper & Operation.deploy) ? 'npm publish' : 'gulp start',
                args: argFactory
            },
            {
                name: 'platform-server',
                path: (ctx) => 'packages/platform-server',
                cmd: (ctx) => (ctx.oper & Operation.deploy) ? 'npm publish' : 'gulp start',
                args: argFactory
            }
        ]
    }
]).start();
