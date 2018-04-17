import * as gulp from 'gulp';
import { ITaskOption, Development } from 'development-tool';
import { Operation } from 'development-core';
const through = require('through2');
import { classAnnotations } from '@ts-ioc/class-annotations'
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
                pipes:[
                    ctx => through.obj(function (file, encoding, callback) {
                        if (file.isNull()) {
                            return callback(null, file);
                        }

                        if (file.isStream()) {
                            return callback('doesn\'t support Streams');
                        }

                        let contents: string = file.contents.toString('utf8');

                        let commonjsGlobal = `var commonjsGlobal = typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {}`;
                        let idx = contents.indexOf(commonjsGlobal);
                        if (idx > 0) {
                            idx = idx + commonjsGlobal.length;
                            let prefix = contents.substring(0, idx);
                            contents = contents.substring(idx);
                            contents = contents.replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, '');
                            contents = contents.replace(/\"use strict\";/gi, '').replace(/\s+/gi, ' ');

                            let prefixs = [
                                `Object.defineProperty(exports, "__esModule", { value: true });`,
                                `var __extends = (commonjsGlobal && commonjsGlobal.__extends) || (function () {
                                    var extendStatics = Object.setPrototypeOf ||
                                        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
                                        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
                                    return function (d, b) {
                                        extendStatics(d, b);
                                        function __() { this.constructor = d; }
                                        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
                                    };
                                })();`.replace(/\s+/gi, ' '),
                                `var __decorate = (commonjsGlobal && commonjsGlobal.__decorate) || function (decorators, target, key, desc) {
                                    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
                                    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
                                    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
                                    return c > 3 && r && Object.defineProperty(target, key, r), r;
                                };`.replace(/\s+/gi, ' '),
                                `var __metadata = (commonjsGlobal && commonjsGlobal.__metadata) || function (k, v) {
                                    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
                                };`.replace(/\s+/gi, ' '),
                                `var __param = (commonjsGlobal && commonjsGlobal.__param) || function (paramIndex, decorator) {
                                    return function (target, key) { decorator(target, key, paramIndex); }
                                };`.replace(/\s+/gi, ' ')
                            ];
                            prefixs.forEach(itm => {
                                prefix = prefix + '\n' + itm;
                                contents = contents.split(itm).join('\n');
                            });

                            contents = prefix + contents;
                        }
                        file.contents = new Buffer(contents);
                        this.push(file);
                        callback();
                    }),
                    () => rename('logs.umd.min.js'),
                    () => uglify()
                ]
            }
        ]
    }
]).start();
