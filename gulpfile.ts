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
        return '';
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
                name: (ctx) => 'core',
                path: (ctx) => 'packages/core',
                cmd: (ctx) => (ctx.oper & Operation.deploy) ? 'npm publish' : 'gulp start',
                args: argFactory
            },
            {
                name: (ctx) => 'aop',
                path: (ctx) => 'packages/aop',
                cmd: (ctx) => (ctx.oper & Operation.deploy) ? 'npm publish' : 'gulp start',
                args: argFactory
            },
            {
                name: (ctx) => 'logs',
                path: (ctx) => 'packages/logs',
                cmd: (ctx) => (ctx.oper & Operation.deploy) ? 'npm publish' : 'gulp start',
                args: argFactory
            }
        ]
    }
]).start();
