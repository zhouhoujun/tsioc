// import * as gulp from 'gulp';
// import { ITaskOption, Development, IContext } from 'development-tool';
// import { Operation, ITaskContext } from 'development-core';
// const through = require('through2');
// // import 'development-tool-node';
// const jeditor = require('gulp-json-editor');
// const resolve = require('rollup-plugin-node-resolve');
// const rollupSourcemaps = require('rollup-plugin-sourcemaps');
// const commonjs = require('rollup-plugin-commonjs');
// // import { rollup } from 'rollup';
// const rollup = require('gulp-rollup');
// const rename = require('gulp-rename');
// const uglify = require('gulp-uglify');
// const del = require('del');

// let argFactory = (ctx: ITaskContext) => {
//     if (ctx.oper & Operation.deploy) {
//         return '--access=public';
//     } else if (ctx.oper & Operation.release) {
//         return '--release';
//     } else {
//         return ctx.oper & Operation.test ? '--test' : '';
//     }
// }

// let versionSetting = (ctx: ITaskContext) => {
//     return jeditor((json: any) => {
//         let version = ctx.env['version'] || '';
//         if (version) {
//             json.version = version;
//             if (json.peerDependencies) {
//                 Object.keys(json.peerDependencies).forEach(key => {
//                     if (/^@ts-ioc/.test(key)) {
//                         json.peerDependencies[key] = '^' + version;
//                     }
//                 })
//             }
//         }
//         return json;
//     })
// }

// Development.create(gulp, __dirname, [
//     {
//         oper: Operation.release,
//         loader: [
//             {
//                 name: 'packages-version',
//                 src: ['packages/**/package.json', '!node_modules/**/package.json'],
//                 dist: 'packages',
//                 pipes: [
//                     (ctx) => versionSetting(ctx)
//                 ]
//             },
//             {
//                 name: 'main-version',
//                 src: 'package.json',
//                 dist: './',
//                 pipes: [
//                     (ctx) => versionSetting(ctx)
//                 ]
//             }
//         ]
//     },
//     <ITaskOption>{
//         refs: [
//             {
//                 name: 'annotations',
//                 path: (ctx) => 'packages/annotations',
//                 cmd: (ctx) => (ctx.oper & Operation.deploy) ? 'npm publish' : 'gulp start',
//                 args: argFactory
//             }
//         ],
//         tasks: [
//             {
//                 name: 'annotation',
//                 loader: [
//                     {
//                         name: 'copy-to-core',
//                         src: ['packages/annotations/!(test|src|node_modules)/**', 'packages/annotations/package.json'],
//                         dist: 'packages/core/node_modules/@ts-ioc/annotations',
//                         pipes: []
//                     },
//                     {
//                         name: 'copy-to-aop',
//                         src: ['packages/annotations/!(test|src|node_modules)/**', 'packages/annotations/package.json'],
//                         dist: 'packages/aop/node_modules/@ts-ioc/annotations',
//                         pipes: []
//                     },
//                     {
//                         name: 'copy-to-bootstrap',
//                         src: ['packages/annotations/!(test|src|node_modules)/**', 'packages/annotations/package.json'],
//                         dist: 'packages/bootstrap/node_modules/@ts-ioc/annotations',
//                         pipes: []
//                     },
//                     {
//                         name: 'copy-to-logs',
//                         src: ['packages/annotations/!(test|src|node_modules)/**', 'packages/annotations/package.json'],
//                         dist: 'packages/logs/node_modules/@ts-ioc/annotations',
//                         pipes: []
//                     },
//                     {
//                         name: 'copy-to-browser',
//                         src: ['packages/annotations/!(test|src|node_modules)/**', 'packages/annotations/package.json'],
//                         dist: 'packages/platform-browser/node_modules/@ts-ioc/annotations',
//                         pipes: []
//                     },
//                     {
//                         name: 'copy-to-server',
//                         src: ['packages/annotations/!(test|src|node_modules)/**', 'packages/annotations/package.json'],
//                         dist: 'packages/platform-server/node_modules/@ts-ioc/annotations',
//                         pipes: []
//                     }
//                 ]
//             }
//         ]
//     },
//     <ITaskOption>{
//         refs: [
//             {
//                 name: 'core',
//                 path: (ctx) => 'packages/core',
//                 cmd: (ctx) => (ctx.oper & Operation.deploy) ? 'npm publish' : 'gulp start',
//                 args: argFactory
//             }
//         ],
//         tasks: [
//             {
//                 name: 'core',
//                 loader: [
//                     {
//                         name: 'copy-to-aop',
//                         src: ['packages/core/!(src|test|node_modules)/**', 'packages/core/package.json'],
//                         dist: 'packages/aop/node_modules/@ts-ioc/core',
//                         pipes: []
//                     },
//                     {
//                         name: 'copy-to-bootstrap',
//                         src: ['packages/core/!(src|test|node_modules)/**', 'packages/core/package.json'],
//                         dist: 'packages/bootstrap/node_modules/@ts-ioc/core',
//                         pipes: []
//                     },
//                     {
//                         name: 'copy-to-logs',
//                         src: ['packages/core/!(src|test|node_modules)/**', 'packages/core/package.json'],
//                         dist: 'packages/logs/node_modules/@ts-ioc/core',
//                         pipes: []
//                     },
//                     {
//                         name: 'copy-to-browser',
//                         src: ['packages/core/!(src|test|node_modules)/**', 'packages/core/package.json'],
//                         dist: 'packages/platform-browser/node_modules/@ts-ioc/core',
//                         pipes: []
//                     },
//                     {
//                         name: 'copy-to-server',
//                         src: ['packages/core/!(src|test|node_modules)/**', 'packages/core/package.json'],
//                         dist: 'packages/platform-server/node_modules/@ts-ioc/core',
//                         pipes: []
//                     }
//                 ]
//             }
//         ]
//     },
//     <ITaskOption>{
//         refs: [
//             {
//                 name: 'aop',
//                 path: (ctx) => 'packages/aop',
//                 cmd: (ctx) => (ctx.oper & Operation.deploy) ? 'npm publish' : 'gulp start',
//                 args: argFactory
//             },
//         ],
//         tasks: [
//             {
//                 name: 'aop',
//                 loader: [
//                     {
//                         name: 'copy',
//                         src: ['packages/aop/!(src|test|node_modules)/**', 'packages/aop/package.json'],
//                         dist: 'packages/logs/node_modules/@ts-ioc/aop',
//                         pipes: []
//                     },
//                     {
//                         name: 'copy-to-boot',
//                         src: ['packages/aop/!(src|test|node_modules)/**', 'packages/aop/package.json'],
//                         dist: 'packages/bootstrap/node_modules/@ts-ioc/aop',
//                         pipes: []
//                     }
//                 ]
//             }
//         ]
//     },
//     {
//         refs: [
//             {
//                 name: 'logs',
//                 path: (ctx) => 'packages/logs',
//                 cmd: (ctx) => (ctx.oper & Operation.deploy) ? 'npm publish' : 'gulp start',
//                 args: argFactory
//             },
//             {
//                 name: 'bootstrap',
//                 path: (ctx) => 'packages/bootstrap',
//                 cmd: (ctx) => (ctx.oper & Operation.deploy) ? 'npm publish' : 'gulp start',
//                 args: argFactory
//             },
//             {
//                 name: 'platform-browser',
//                 path: (ctx) => 'packages/platform-browser',
//                 cmd: (ctx) => (ctx.oper & Operation.deploy) ? 'npm publish' : 'gulp start',
//                 args: argFactory
//             },
//             {
//                 name: 'platform-server',
//                 path: (ctx) => 'packages/platform-server',
//                 cmd: (ctx) => (ctx.oper & Operation.deploy) ? 'npm publish' : 'gulp start',
//                 args: argFactory
//             }
//         ]
//     }
// ]).start();
