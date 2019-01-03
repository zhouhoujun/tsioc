#!/usr/bin/env node

import { rm, cp, mkdir, exec } from 'shelljs';
import * as fs from 'fs';
import * as path from 'path';
import * as colors from 'colors';
import program from 'commander';
import findup from 'findup';
import { PackModule } from './PackModule';
import { Workflow, isAcitvityClass } from '@taskfr/core';
import { PackConfigure, isPackClass } from './core';

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
        fileName = fileName || 'taskfile.ts';
        fileName = path.join(processRoot, fileName);
        if (options.boot) {
            exec('node -r ts-node/register tsconfig-paths/register ' + fileName);
        } else {
            let wf = Workflow.create().use(PackModule);
            let md = require(fileName);
            let activites = Object.values(md);
            if (activites.some(v => isPackClass(v))) {
                wf.sequence(...activites.filter(v => isPackClass(v)));
            } else if (activites.some(v => isAcitvityClass(v))) {
                wf.sequence(...activites.filter(v => isAcitvityClass(v)));
            } else {
                wf.bootstrap(md);
            }
        }
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
    .action((env, options) => {
        let taskContainer = Workflow.create().use(PackModule);
        let config = require(path.join(processRoot, env)) as PackConfigure;
        config.watch = options.watch === true;

        taskContainer.bootstrap(config);
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
        let taskContainer = Workflow.create().use(PackModule);
        let config = require(path.join(processRoot, serve)) as PackConfigure;
        config.watch = options.watch === true;

        taskContainer.bootstrap(config);
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
    .command('g, generate [string]', 'generate schematics packaged with cmd')
    .option('--ng [bool]', 'generate angular project')
    .action((build, options) => {
        let taskContainer = Workflow.create().use(PackModule);
        taskContainer.run();
    })
    .parse(process.argv);
