#!/usr/bin/env node
require('ts-node').register();
require('tsconfig-paths').register();
import { rm, cp, mkdir } from 'shelljs';
import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import * as program from 'commander';
import { execSync } from 'child_process';
// import { Workflow, isAcitvityClass } from '@ts-ioc/activities';
// import { PackConfigure, isPackClass, PackModule } from '@ts-ioc/pack';
const resolve = require('resolve');
const cliRoot = path.join(path.normalize(__dirname), '../');
const packageConf = require(cliRoot + '/package.json');
const processRoot = path.join(path.dirname(process.cwd()), path.basename(process.cwd()));
process.env.INIT_CWD = processRoot;

let cwdPackageConf = path.join(processRoot, '/package.json');
if (!fs.existsSync(cwdPackageConf)) {
    cwdPackageConf = undefined;
}

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
            const wf = require(resolve.sync('@ts-ioc/activities', { basedir: processRoot, package: cwdPackageConf }));
            const pk = require(resolve.sync('@ts-ioc/pack', { basedir: processRoot, package: cwdPackageConf }));
            const bd = require(resolve.sync('@ts-ioc/build', { basedir: processRoot, package: cwdPackageConf }));
            let wfi = wf.Workflow.create().use(pk.PackModule);
            let md = require(fileName);
            let activites = Object.values(md);
            if (activites.some(v => pk.isPackClass(v))) {
                wfi.sequence(...activites.filter(v => pk.isPackClass(v)));
            } else if (activites.some(v => bd.isAssetClass(v))) {
                wfi.sequence(...activites.filter(v => bd.isAssetClass(v)(v)));
            } else if (activites.some(v => wf.isAcitvityClass(v))) {
                wfi.sequence(...activites.filter(v => wf.isAcitvityClass(v)));
            } else {
                wfi.bootstrap(md);
            }
        }
    });


program.command('init [action]')
    .description('init tsioc project.')
    .option('-b, --browser [bool]', 'init browser project or not.')
    .action((action, options) => {
        if (!cwdPackageConf) {
            execSync('npm init', { cwd: processRoot });
        }
        let cmds: string[];
        switch (action) {
            case 'activity':
                cmds = [
                    'npm install @ts-ioc/core',
                    'npm install @ts-ioc/aop',
                    'npm install @ts-ioc/logs',
                    'npm install @ts-ioc/bootstrap',
                    'npm install @ts-ioc/activities'
                ];
                if (options.browser) {
                    cmds.push('@ts-ioc/platform-browser');
                    cmds.push('@ts-ioc/platform-browser-bootstrap');
                    cmds.push('@ts-ioc/platform-browser-activities');
                } else {
                    cmds.push('@ts-ioc/platform-server');
                    cmds.push('@ts-ioc/platform-server-bootstrap');
                    cmds.push('@ts-ioc/platform-server-activities');
                }
                execSync(cmds.join('\n') + '\n', { cwd: processRoot });
                break;
            case 'pack':
                cmds = [
                    'npm install @ts-ioc/core',
                    'npm install @ts-ioc/aop',
                    'npm install @ts-ioc/logs',
                    'npm install @ts-ioc/bootstrap',
                    '@ts-ioc/platform-server',
                    '@ts-ioc/platform-server-bootstrap',
                    'npm install @ts-ioc/activities',
                    '@ts-ioc/platform-server-activities',
                    'npm install @ts-ioc/build',
                    'npm install @ts-ioc/pack',
                    'npm install @ts-ioc/unit',
                    'npm install @ts-ioc/unit-console'
                ];
                execSync(cmds.join('\n') + '\n', { cwd: processRoot });
                break;
            case 'boot':
                cmds = [
                    'npm install @ts-ioc/core',
                    'npm install @ts-ioc/aop',
                    'npm install @ts-ioc/logs',
                    'npm install @ts-ioc/bootstrap'
                ];
                if (options.browser) {
                    cmds.push('@ts-ioc/platform-browser');
                    cmds.push('@ts-ioc/platform-browser-bootstrap');
                } else {
                    cmds.push('@ts-ioc/platform-server');
                    cmds.push('@ts-ioc/platform-server-bootstrap');
                }
                execSync(cmds.join('\n') + '\n', { cwd: processRoot });
                break;
            default:
                cmds = [
                    'npm install @ts-ioc/core',
                    'npm install @ts-ioc/aop',
                    'npm install @ts-ioc/logs'
                ];
                if (options.browser) {
                    cmds.push('@ts-ioc/platform-browser');
                } else {
                    cmds.push('@ts-ioc/platform-server');
                }
                execSync(cmds.join('\n') + '\n', { cwd: processRoot });
                break;
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
        const wf = require(resolve.sync('@ts-ioc/activities', { basedir: processRoot, package: cwdPackageConf }));
        const pk = require(resolve.sync('@ts-ioc/pack', { basedir: processRoot, package: cwdPackageConf }));
        let wfi = wf.Workflow.create().use(pk.PackModule);
        let config = require(path.join(processRoot, env));
        config.watch = options.watch === true;
        wfi.bootstrap(config);
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
        const wf = require(resolve.sync('@ts-ioc/activities', { basedir: processRoot, package: cwdPackageConf }));
        const pk = require(resolve.sync('@ts-ioc/pack', { basedir: processRoot, package: cwdPackageConf }));
        let wfi = wf.Workflow.create().use(pk.PackModule);
        let config = require(path.join(processRoot, serve));
        config.watch = options.watch === true;
        wfi.bootstrap(config);
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
        const wf = require(resolve.sync('@ts-ioc/activities', { basedir: processRoot, package: cwdPackageConf }));
        const pk = require(resolve.sync('@ts-ioc/pack', { basedir: processRoot, package: cwdPackageConf }));
        let wfi = wf.Workflow.create().use(pk.PackModule);
        let config = require(path.join(processRoot, build));
        config.watch = options.watch === true;
        wfi.bootstrap(config);
    });


program.parse(process.argv);
