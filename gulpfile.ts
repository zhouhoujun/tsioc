import * as gulp from 'gulp';
import { ITaskOption, Development, IContext } from 'development-tool';
import { Operation, ITaskContext } from 'development-core';
const through = require('through2');
import { classAnnotations } from 'typescript-class-annotations'
import { version } from 'punycode';
// import 'development-tool-node';
const jeditor = require('gulp-json-editor');
const resolve = require('rollup-plugin-node-resolve');
const rollupSourcemaps = require('rollup-plugin-sourcemaps');
const commonjs = require('rollup-plugin-commonjs');
// import { rollup } from 'rollup';
const rollup = require('gulp-rollup');
const rename = require('gulp-rename');
const uglify = require('gulp-uglify');
const del = require('del');

let argFactory = (ctx: ITaskContext) => {
    if (ctx.oper & Operation.deploy) {
        return '--access=public';
    } else if (ctx.oper & Operation.release) {
        return '--release';
    } else {
        return ctx.oper & Operation.test ? '--test' : '';
    }
}

let versionSetting = (ctx: ITaskContext) => {
    return jeditor((json: any) => {
        let version = ctx.env['version'] || '';
        if (version) {
            json.version = version;
            if (json.peerDependencies) {
                Object.keys(json.peerDependencies).forEach(key => {
                    json.peerDependencies[key] = version;
                })
            }
        }
        return json;
    })
}

Development.create(gulp, __dirname, [
    {
        oper: Operation.release,
        loader: [
            {
                name: 'packages-version',
                src: ['packages/**/package.json', '!node_modules/**/package.json'],
                dist: 'packages',
                pipes: [
                    (ctx) => versionSetting(ctx)
                ]
            },
            {
                name: 'main-version',
                src: 'package.json',
                dist: './',
                pipes: [
                    (ctx) => versionSetting(ctx)
                ]
            }
        ]
    },
    <ITaskOption>{
        refs: [
            {
                name: 'class-annotations',
                path: (ctx) => 'packages/class-annotations',
                cmd: (ctx) => (ctx.oper & Operation.deploy) ? 'npm publish' : 'gulp start',
                args: argFactory
            }
        ],
        tasks: [
            {
                name: 'annotation',
                loader: [
                    {
                        name: 'copy-to-core',
                        src: ['packages/class-annotations/**', '!packages/class-annotations/test/**', '!packages/class-annotations/src/**', '!packages/class-annotations/node_modules/**'],
                        dist: 'packages/core/node_modules/@ts-ioc/class-annotations',
                        pipes: []
                    },
                    {
                        name: 'copy-to-aop',
                        src: ['packages/class-annotations/**', '!packages/class-annotations/test/**', '!packages/class-annotations/src/**', '!packages/class-annotations/node_modules/**'],
                        dist: 'packages/aop/node_modules/@ts-ioc/class-annotations',
                        pipes: []
                    },
                    {
                        name: 'copy-to-logs',
                        src: ['packages/class-annotations/**', '!packages/class-annotations/test/**', '!packages/class-annotations/src/**', '!packages/class-annotations/node_modules/**'],
                        dist: 'packages/logs/node_modules/@ts-ioc/class-annotations',
                        pipes: []
                    },
                    {
                        name: 'copy-to-browser',
                        src: ['packages/class-annotations/**', '!packages/class-annotations/test/**', '!packages/class-annotations/src/**', '!packages/class-annotations/node_modules/**'],
                        dist: 'packages/platform-browser/node_modules/@ts-ioc/class-annotations',
                        pipes: []
                    },
                    {
                        name: 'copy-to-server',
                        src: ['packages/class-annotations/**', '!packages/class-annotations/test/**', '!packages/class-annotations/src/**', '!packages/class-annotations/node_modules/**'],
                        dist: 'packages/platform-server/node_modules/@ts-ioc/class-annotations',
                        pipes: []
                    }
                ]
            }
        ]
    },
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
                name: 'core',
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
                        name: 'copy-to-browser',
                        src: ['packages/core/**', '!packages/core/test/**', '!packages/core/src/**', '!packages/core/node_modules/**'],
                        dist: 'packages/platform-browser/node_modules/@ts-ioc/core',
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
                name: 'aop',
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
