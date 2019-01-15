#!/usr/bin/env node
require('ts-node').register();
// require('tsconfig-paths').register();
import { rm, cp, mkdir } from 'shelljs';
import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import * as program from 'commander';
import { execSync } from 'child_process';
import { isString } from 'util';
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
    .version(packageConf.version)
    .command('init [action]')
    .description('init tsioc project. action is project init type: "activity","pack", "boot", default: tsioc')
    .option('-b, --browser [bool]', 'init browser project or not.')
    .option('-v, --version [string]', 'the version of tsioc to init.')
    .option('--dev [bool]', 'init tsioc with devDependencies.')
    .action((action, options) => {
        if (!cwdPackageConf) {
            execSync('npm init', { cwd: processRoot });
        }

        let packs = ['typescript', 'ts-node', 'tsconfig-paths', 'tslib', 'zone.js', 'bluebird'];
        let initcmds = `${packs.join('@latest ') + '@latest'} `;
        let version = isString(options.version) ? `@${options.version || 'latest'} ` : '@latest ';
        let cmds: string[];
        switch (action) {
            case 'activity':
                console.log(chalk.gray('init activity project...'));
                cmds = [
                    '@ts-ioc/core',
                    '@ts-ioc/annotations',
                    '@ts-ioc/aop',
                    '@ts-ioc/logs',
                    '@ts-ioc/bootstrap',
                    '@ts-ioc/activities'
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
                initcmds = `npm install ${initcmds} ${cmds.join(version) + version} --save${options.dev ? '-dev' : ''}`;
                console.log(initcmds);
                execSync(initcmds, { cwd: processRoot });
                break;
            case 'pack':
                console.log(chalk.gray('init pack project...'));
                cmds = [
                    '@ts-ioc/core',
                    '@ts-ioc/annotations',
                    '@ts-ioc/aop',
                    '@ts-ioc/logs',
                    '@ts-ioc/bootstrap',
                    '@ts-ioc/platform-server',
                    '@ts-ioc/platform-server-bootstrap',
                    '@ts-ioc/activities',
                    '@ts-ioc/platform-server-activities',
                    '@ts-ioc/build',
                    '@ts-ioc/pack',
                    '@ts-ioc/unit',
                    '@ts-ioc/unit-console'
                ];
                initcmds = `npm install ${initcmds} ${cmds.join(version) + version} --save${options.dev ? '-dev' : ''}`;
                console.log(initcmds);
                execSync(initcmds, { cwd: processRoot });
                break;
            case 'boot':
                console.log(chalk.gray('init boot project...'));
                cmds = [
                    '@ts-ioc/core',
                    '@ts-ioc/annotations',
                    '@ts-ioc/aop',
                    '@ts-ioc/logs',
                    '@ts-ioc/bootstrap'
                ];
                if (options.browser) {
                    cmds.push('@ts-ioc/platform-browser');
                    cmds.push('@ts-ioc/platform-browser-bootstrap');
                } else {
                    cmds.push('@ts-ioc/platform-server');
                    cmds.push('@ts-ioc/platform-server-bootstrap');
                }
                initcmds = `npm install ${initcmds} ${cmds.join(version) + version} --save${options.dev ? '-dev' : ''}`;
                console.log(initcmds);
                execSync(initcmds, { cwd: processRoot });
                break;
            default:
                console.log(chalk.gray('init tsioc project...'));
                cmds = [
                    '@ts-ioc/core',
                    '@ts-ioc/annotations',
                    '@ts-ioc/aop',
                    '@ts-ioc/logs'
                ];
                if (options.browser) {
                    cmds.push('@ts-ioc/platform-browser');
                } else {
                    cmds.push('@ts-ioc/platform-server');
                }
                initcmds = `npm install ${initcmds} ${cmds.join(version) + version} --save${options.dev ? '-dev' : ''}`;
                console.log(initcmds);
                execSync(initcmds, { cwd: processRoot });
                break;
        }
    });



function requireCwd(id: string) {
    try {
        return require(resolve.sync(id, { basedir: processRoot, package: cwdPackageConf }));
    } catch (err) {
        // require ts-config/paths or globals
        return require(id);
    }
}

function requireRegisters() {
    requireCwd('tsconfig-paths').register();
}

function runActivity(fileName, options) {
    const wf = requireCwd('@ts-ioc/activities');
    const pk = requireCwd('@ts-ioc/pack');
    const bd = requireCwd('@ts-ioc/build');
    let wfi = wf.Workflow.create().use(pk.PackModule);
    let md = requireCwd(fileName);
    let activites = Object.values(md);
    if (activites.some(v => pk.isPackClass(v))) {
        wfi.sequence(...activites.filter(v => pk.isPackClass(v)));
    } else if (activites.some(v => bd.isAssetClass(v))) {
        wfi.sequence(...activites.filter(v => bd.isAssetClass(v)));
    } else if (activites.some(v => wf.isAcitvityClass(v))) {
        wfi.sequence(...activites.filter(v => wf.isAcitvityClass(v)));
    } else {
        md.watch = options.watch === true;
        wfi.bootstrap(md);
    }
}

function vaildifyFile(fileName): string {
    if (!fileName) {
        if (fs.existsSync(path.join(processRoot, 'taskfile.ts'))) {
            fileName = 'taskfile.ts';
        } else if (fs.existsSync(path.join(processRoot, 'taskfile.js'))) {
            fileName = 'taskfile.js';
        }
    }
    if (!fs.existsSync(path.join(processRoot, fileName))) {
        console.log(chalk.red(`'${path.join(processRoot, fileName)}' not exsists`));
        process.exit(1);
    }
    return path.join(processRoot, fileName);
}

program
    .command('run [fileName]')
    .description('run activity file.')
    .option('--activity [bool]', 'target file is activity.')
    .action((fileName, options) => {
        requireRegisters();
        fileName = vaildifyFile(fileName);
        if (options.activity) {
            runActivity(fileName, options)
        } else {
            requireCwd(resolve.sync(fileName, { basedir: processRoot, package: cwdPackageConf }));
        }
    });

program
    .command('test [files]')
    .description('run activity file.')
    .option('--config [string]', 'config file path.')
    .action((files, options) => {
        requireRegisters();
        files = path.join(processRoot, files || 'test/**/*.ts');
        let unit = requireCwd('@ts-ioc/unit');
        let ConsoleReporter = requireCwd('@ts-ioc/unit-console').ConsoleReporter;
        let config;
        if (isString(options.config)) {
            config = requireCwd(options.config);
        }
        config = config || {};
        unit.runTest(files, config, ConsoleReporter);
    });


program
    .command('build [taskfile]')
    .description('build the application')
    .option('--boot [bool]', 'target file with Workflow instace to boot activity.')
    .option('-e, --env [string]', 'use that particular environment.ts during the build, just like @angular/cli')
    .option('-c, --clean [bool]', 'destroy the build folder prior to compilation, default for prod')
    .option('-w, --watch [bool]', 'listen for changes in filesystem and rebuild')
    .option('-f, --config [string]', 'path to configuration file for library build')
    .option('-d, --deploy [bool]', 'run deploy activity')
    .option('--verbose [bool]', 'log all messages in list format')
    .option('--closure [bool]', 'bundle and optimize with closure compiler (default)')
    .option('-r, --rollup [bool]', 'bundle with rollup and optimize with closure compiler')
    .action((taskfile, options) => {
        requireRegisters();
        taskfile = vaildifyFile(taskfile);
        if (options.boot) {
            requireCwd(taskfile);
        } else {
            runActivity(taskfile, options);
        }
    });

program
    .command('serve [taskfile]')
    .description('spawn the local express server')
    .option('-e, --env [string]', 'use that particular environment.ts during the build, just like @angular/cli')
    .option('-c, --clean [bool]', 'destroy the build folder prior to compilation, default for prod')
    .option('-w, --watch [bool]', 'listen for changes in filesystem and rebuild')
    .option('-f, --config [string]', 'path to configuration file for library build')
    .option('-d, --deploy [bool]', 'run deploy activity')
    .option('--verbose [bool]', 'log all messages in list format')
    .option('--closure [bool]', 'bundle and optimize with closure compiler (default)')
    .option('-r, --rollup [bool]', 'bundle with rollup and optimize with closure compiler')
    .action((taskfile, options) => {
        requireRegisters();
        taskfile = vaildifyFile(taskfile);
        if (options.boot) {
            requireCwd(taskfile);
        } else {
            runActivity(taskfile, options);
        }
    });

// program
//     .command('new [app]')
//     .description('new my-app')
//     .option('--src [string]', 'specify a path to an existing src folder')
//     .option('--skip-install [bool]', 'prevents install during scaffold')
//     .option('--yarn [bool]', 'use yarn instead of npm to install')
//     .action((app, options) => {
//         if (fs.existsSync(path.join(processRoot, app))) {
//             console.log(chalk.red(app + ' already exists'));
//             process.exit();
//         }
//         if (!fs.existsSync(path.join(processRoot, app))) {
//             mkdir(path.join(processRoot, app));
//         }
//         cp(path.join(cliRoot, 'src', 'scaffold', 'root', 'ngr.config.js'), path.join(processRoot, program.new));

//     })
//     .command('g, generate [string]')
//     .description('generate schematics packaged with cmd')
//     .option('--ng [bool]', 'generate angular project')
//     .action((build, options) => {

//     });


program.parse(process.argv);
