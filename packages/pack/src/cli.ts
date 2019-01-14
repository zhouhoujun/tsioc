#!/usr/bin/env node
require('ts-node').register();
require('tsconfig-paths').register();
import { rm, cp, mkdir, exec } from 'shelljs';
import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import * as program from 'commander';
import { Workflow, isAcitvityClass } from '@ts-ioc/activities';
import { PackConfigure, isPackClass, PackModule } from '@ts-ioc/pack';

const cliRoot = path.join(path.normalize(__dirname), '../');
const packageConf = require(cliRoot + '/package.json');
const processRoot = path.join(path.dirname(process.cwd()), path.basename(process.cwd()));

if (process.argv.indexOf('scaffold') > -1) {
    process.argv.push('--verbose');
}


program
    // .arguments('-r ts-node/register tsconfig-paths/register')
    .version(packageConf.version)
    .command('run [fileName]')
    .description('run activity file.')
    .option('--boot [bool]', 'with default container boot activity.')
    .action((fileName, options) => {
        if (fileName) {
            fileName = path.join(processRoot, fileName);
        } else {
            fileName = path.join(processRoot, 'taskfile.ts');
            if (!fs.existsSync(fileName)) {
                fileName = path.join(processRoot, 'taskfile.js');
            }
        }
        if (!fs.existsSync(fileName)) {
            console.log(chalk.red(`'${fileName}' not exsists`));
            process.exit(1);
        }
        if (options.boot) {
            require(fileName);
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
    });

program
    .command('build [env]')
    .description('build the application')
    .option('-e, --env [string]', 'use that particular environment.ts during the build, just like @angular/cli')
    .option('-c, --clean [bool]', 'destroy the build folder prior to compilation, default for prod')
    .option('-w, --watch [bool]', 'listen for changes in filesystem and rebuild')
    .option('-f, --config [string]', 'path to configuration file for library build')
    .option('-d, --deploy [bool]', 'run deploy activity')
    .option('--verbose [bool]', 'log all messages in list format')
    .option('--closure [bool]', 'bundle and optimize with closure compiler (default)')
    .option('-r, --rollup [bool]', 'bundle with rollup and optimize with closure compiler')
    .action((env, options) => {
        let Worflow = Workflow.create().use(PackModule);
        let config = require(path.join(processRoot, env)) as PackConfigure;
        config.watch = options.watch === true;

        Worflow.bootstrap(config);
    });

program
    .command('serve [env]')
    .description('spawn the local express server')
    .option('-e, --env [string]', 'use that particular environment.ts during the build, just like @angular/cli')
    .option('-c, --clean [bool]', 'destroy the build folder prior to compilation, default for prod')
    .option('-w, --watch [bool]', 'listen for changes in filesystem and rebuild')
    .option('-f, --config [string]', 'path to configuration file for library build')
    .option('-d, --deploy [bool]', 'run deploy activity')
    .option('--verbose [bool]', 'log all messages in list format')
    .option('--closure [bool]', 'bundle and optimize with closure compiler (default)')
    .option('-r, --rollup [bool]', 'bundle with rollup and optimize with closure compiler')
    .action((serve, options) => {
        let Worflow = Workflow.create().use(PackModule);
        let config = require(path.join(processRoot, serve)) as PackConfigure;
        config.watch = options.watch === true;

        Worflow.bootstrap(config);
    });

program
    .command('new [app]')
    .description('new my-app')
    .option('--src [string]', 'specify a path to an existing src folder')
    .option('--skip-install [bool]', 'prevents install during scaffold')
    .option('--yarn [bool]', 'use yarn instead of npm to install')
    .action((app, options) => {
        if (fs.existsSync(path.join(processRoot, app))) {
            console.log(chalk.red(app + ' already exists'));
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
        let Worflow = Workflow.create().use(PackModule);
        Worflow.run();
    });


program.parse(process.argv);
