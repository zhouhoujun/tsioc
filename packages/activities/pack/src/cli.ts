#!/usr/bin/env node

import { rm, cp, mkdir, exec } from 'shelljs';
import * as fs from 'fs';
import * as path from 'path';
import * as colors from 'colors';
import program from 'commander';
import findup from 'findup';
import { PackModule } from './PackModule';
import { TaskContainer } from '@taskfr/core';
import { isClass } from 'packages/core/lib';
import { isMetadataObject } from '@ts-ioc/core';

const cliRoot = findup.sync(__dirname, 'package.json');
const packageConf = require(__dirname + '/package.json');
const processRoot = path.join(path.dirname(process.cwd()), path.basename(process.cwd()));

if (process.argv.indexOf('scaffold') > -1) {
    process.argv.push('--verbose');
}

program
    .arguments('-r ts-node/register tsconfig-paths/register')
    .version(packageConf.version)
    .usage('<keywords>')
    .command('run [fileName]', 'run activity file.')
    .option('--boot [bool]', 'with default container boot activity.')
    .action((fileName, options) => {
        fileName = path.join(processRoot, fileName);
        if (options.boot) {
            exec('node -r ts-node/register tsconfig-paths/register ' + fileName);
        } else {
            let taskContainer = TaskContainer.create(processRoot).use(PackModule);
            let activites = require(fileName);
            taskContainer.bootstrap(...Object.values(activites).filter(v => v && (isClass(v) || isMetadataObject(v, ['token', 'activity']))));
        }
    })
    .command('new [app]', 'new my-app')
    .option('--src [string]', 'specify a path to an existing src folder')
    .option('--skip-install [bool]', 'prevents install during scaffold')
    .option('--yarn [bool]', 'use yarn instead of npm to install')
    .action((app, options) => {
        if (fs.existsSync(path.join(processRoot, app))) {
            console.log(colors.red(app + ' already exists'));
            process.exit();
        }
        if (!fs.existsSync(path.join(processRoot, app))) {
            mkdir(path.join(processRoot, app));
        }
        cp(path.join(cliRoot, 'src', 'scaffold', 'root', 'ngr.config.js'), path.join(processRoot, program.new));

    })
    .command('build [env]', 'build the application')
    .option('-e, --env [string]', 'use that particular environment.ts during the build, just like @angular/cli')
    .option('-c, --clean [bool]', 'destroy the build folder prior to compilation, default for prod')
    .option('-w, --watch [bool]', 'listen for changes in filesystem and rebuild')
    .option('-f, --config [string]', 'path to configuration file for library build')
    .option('-d, --deploy [bool]', 'run deploy activity')
    .option('--verbose [bool]', 'log all messages in list format')
    .option('--closure [bool]', 'bundle and optimize with closure compiler (default)')
    .option('-r, --rollup [bool]', 'bundle with rollup and optimize with closure compiler')
    .action((build, options) => {
        let taskContainer = TaskContainer.create(processRoot).use(PackModule);
        taskContainer.run();
    })
    .command('g, generate [string]', 'generate schematics packaged with cmd')
    .option('--ng [bool]', 'generate angular project')
    .action((build, options) => {
        let taskContainer = TaskContainer.create(processRoot).use(PackModule);
        taskContainer.run();
    })
    .command('serve [env]', 'spawn the local express server')
    .option('-e, --env [string]', 'use that particular environment.ts during the build, just like @angular/cli')
    .option('-c, --clean [bool]', 'destroy the build folder prior to compilation, default for prod')
    .option('-w, --watch [bool]', 'listen for changes in filesystem and rebuild')
    .option('-f, --config [string]', 'path to configuration file for library build')
    .option('-d, --deploy [bool]', 'run deploy activity')
    .option('--verbose [bool]', 'log all messages in list format')
    .option('--closure [bool]', 'bundle and optimize with closure compiler (default)')
    .option('-r, --rollup [bool]', 'bundle with rollup and optimize with closure compiler')
    .action((serve, options) => {
        let taskContainer = TaskContainer.create(processRoot).use(PackModule);
        taskContainer.run();
    })
    .parse(process.argv);

// let cli = () => {

//     let taskContainer = TaskContainer.create(processRoot).use(PackModule);
//     if (program.run) {
//         let options = program.opts();
//         if (options.boot) {
//             exec('ts-node -r tsconfig-paths/register ' + path.join(processRoot, program.run));
//         } else {

//         }
//     }
//     if (program.generate) {
//         if (program.generate === 'library') {
//             program.generate = 'lib';
//         }
//         taskContainer.bootstrap();
//     }

//     if (program.build) {
//         taskContainer.bootstrap();
//     }

//     if (program.new) {
//         taskContainer.bootstrap();
//     }

//     if (program.serve && !program.build) {
//         taskContainer.bootstrap();
//     }
// }

// if (process.argv.indexOf('new') > -1) {
//     if (fs.existsSync(path.join(processRoot, program.new))) {
//         console.log(colors.red(program.new + ' already exists'));
//         process.exit();
//     }
//     if (!fs.existsSync(path.join(processRoot, program.new))) {
//         mkdir(path.join(processRoot, program.new));
//     }
//     cp(path.join(cliRoot, 'src', 'scaffold', 'root', 'ngr.config.js'), path.join(processRoot, program.new));
// }

// fs.writeFile(__dirname + '/build.config.js', JSON.stringify({
//     env: program.build,
//     program: program,
//     projectRoot: program.new ? path.join(processRoot, program.new) : processRoot
// }, null, 4), 'utf-8', cli);


// let exitHandler = (options, err) => {
//     // util.cleanOnExit();
//     if (fs.existsSync(path.join('config', 'environments'))) {
//         rm('-rf', path.join('src', 'environments'));
//         cp('-R', path.join('config', 'environments'), 'src');
//         rm('-rf', path.join('config', 'environments'));
//     }
//     if (err) {
//         console.log(colors.red('NGR ERROR', err));
//     }
//     if (options.exit) {
//         process.exit();
//     }
// }

// // do something when app is closing
// process.on('exit', exitHandler.bind(null, { cleanup: true }));

// // catches ctrl+c event
// process.on('SIGINT', exitHandler.bind(null, { exit: true }));

// // catches "kill pid" (for example: nodemon restart)
// process.on('SIGUSR1', exitHandler.bind(null, { exit: true }));
// process.on('SIGUSR2', exitHandler.bind(null, { exit: true }));

// // catches uncaught exceptions
// process.on('uncaughtException', exitHandler.bind(null, { exit: true }));
