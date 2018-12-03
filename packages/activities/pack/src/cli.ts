#!/usr/bin/env node

import { rm, cp, mkdir } from 'shelljs';
import * as fs from 'fs';
import * as path from 'path';
import * as colors from 'colors';
import program from 'commander';
import findup from 'findup';
import { PackModule } from './PackModule';
import { TaskContainer } from '@taskfr/core';

const cliRoot = findup.sync(__dirname, 'package.json');
const packageConf = require(__dirname + '/package.json');
const processRoot = path.join(path.dirname(process.cwd()), path.basename(process.cwd()));

if (process.argv.indexOf('scaffold') > -1) {
    process.argv.push('--verbose');
}

program
    .version(packageConf.version)
    .usage('<keywords>')
    .option('new [string]', 'new my-app')
    .option('--src [string]', 'specify a path to an existing src folder')
    .option('--skip-install [bool]', 'prevents install during scaffold')
    .option('--yarn [bool]', 'use yarn instead of npm to install')
    .option('build [env]', 'build the application')
    .option('--env [string]', 'use that particular environment.ts during the build, just like @angular/cli')
    .option('--clean [bool]', 'destroy the build folder prior to compilation, default for prod')
    .option('--watch [bool]', 'listen for changes in filesystem and rebuild')
    .option('--config [string]', 'path to configuration file for library build')
    .option('--deploy [bool]', 'run deploy activity')
    .option('--verbose [bool]', 'log all messages in list format')
    .option('--closure [bool]', 'bundle and optimize with closure compiler (default)')
    .option('--rollup [bool]', 'bundle with rollup and optimize with closure compiler')
    .option('g, generate [string]', 'generate schematics packaged with cmd')
    .option('serve, --serve [bool]', 'spawn the local express server')
    .parse(process.argv);

let cli = () => {

    let taskContainer = TaskContainer.create(cliRoot).use(PackModule);
    if (program.generate) {
        if (program.generate === 'library') {
            program.generate = 'lib';
        }
        taskContainer.bootstrap();
    }

    if (program.build) {
        taskContainer.bootstrap();
    }

    if (program.new) {
        taskContainer.bootstrap();
    }

    if (program.serve && !program.build) {
        taskContainer.bootstrap();
    }
}

if (process.argv.indexOf('new') > -1) {
    if (fs.existsSync(path.join(processRoot, program.new))) {
        console.log(colors.red(program.new + ' already exists'));
        process.exit();
    }
    if (!fs.existsSync(path.join(processRoot, program.new))) {
        mkdir(path.join(processRoot, program.new));
    }
    cp(path.join(cliRoot, 'src', 'scaffold', 'root', 'ngr.config.js'), path.join(processRoot, program.new));
}

fs.writeFile(__dirname + '/build.config.js', JSON.stringify({
    env: program.build,
    program: program,
    projectRoot: program.new ? path.join(processRoot, program.new) : processRoot
}, null, 4), 'utf-8', cli);


let exitHandler = (options, err) => {
    // util.cleanOnExit();
    if (fs.existsSync(path.join('config', 'environments'))) {
        rm('-rf', path.join('src', 'environments'));
        cp('-R', path.join('config', 'environments'), 'src');
        rm('-rf', path.join('config', 'environments'));
    }
    if (err) {
        console.log(colors.red('NGR ERROR', err));
    }
    if (options.exit) {
        process.exit();
    }
}

// do something when app is closing
process.on('exit', exitHandler.bind(null, { cleanup: true }));

// catches ctrl+c event
process.on('SIGINT', exitHandler.bind(null, { exit: true }));

// catches "kill pid" (for example: nodemon restart)
process.on('SIGUSR1', exitHandler.bind(null, { exit: true }));
process.on('SIGUSR2', exitHandler.bind(null, { exit: true }));

// catches uncaught exceptions
process.on('uncaughtException', exitHandler.bind(null, { exit: true }));
