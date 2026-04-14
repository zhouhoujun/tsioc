#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-var-requires */
import * as fs from 'fs';
import * as path from 'path';
import * as chalk from 'chalk';
import { program } from 'commander';
import { execSync } from 'child_process';
import { handleBuild, BuildOptions } from './BuildCommand';
import { handleServe, ServeOptions } from './ServeCommand';
const resolve = require('resolve');
const cliRoot = path.join(path.normalize(__dirname), '../');
const packageConf = require(cliRoot + '/package.json');
const processRoot = path.join(path.dirname(process.cwd()), path.basename(process.cwd()));
process.env.INIT_CWD = processRoot;

let cwdPackageConf: string | undefined = path.join(processRoot, '/package.json');
if (!fs.existsSync(cwdPackageConf)) {
    cwdPackageConf = undefined;
}

function requireCwd(id: string) {
    try {
        return require(resolve.sync(id, { basedir: processRoot, package: cwdPackageConf }));
    } catch (err) {
        // require ts-config/paths or globals
        return require(id);
    }
}

requireCwd('ts-node').register();

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

        const packs = ['typescript', 'ts-node', 'tsconfig-paths', 'tslib', 'zone.js', 'bluebird'];
        let initcmds = `${packs.join('@latest ') + '@latest'} `;
        const version = typeof options.version === 'string' ? `@${options.version || 'latest'} ` : '@latest ';
        let cmds: string[];
        switch (action) {
            case 'activity':
                console.log(chalk.gray('init activity project...'));
                cmds = [
                    '@tsdi/ioc',
                    '@tsdi/annotations',
                    '@tsdi/aop',
                    '@tsdi/logger',
                    '@tsdi/core',
                    '@tsdi/activities'
                ];
                if (options.browser) {
                    cmds.push('@tsdi/platform-browser');
                    cmds.push('@tsdi/platform-browser-boot');
                    cmds.push('@tsdi/platform-browser/activities');
                } else {
                    cmds.push('@tsdi/platform-server');
                    cmds.push('@tsdi/platform-server-boot');
                    cmds.push('@tsdi/platform-server/activities');
                }
                initcmds = `npm install ${initcmds} ${cmds.join(version) + version} --save${options.dev ? '-dev' : ''}`;
                console.log(initcmds);
                execSync(initcmds, { cwd: processRoot });
                break;
            case 'pack':
                console.log(chalk.gray('init pack project...'));
                cmds = [
                    '@tsdi/ioc',
                    '@tsdi/annotations',
                    '@tsdi/aop',
                    '@tsdi/logger',
                    '@tsdi/core',
                    '@tsdi/platform-server',
                    '@tsdi/activities',
                    '@tsdi/platform-server/activities',
                    '@tsdi/pack',
                    '@tsdi/unit',
                    '@tsdi/unit-console'
                ];
                initcmds = `npm install ${initcmds} ${cmds.join(version) + version} --save${options.dev ? '-dev' : ''}`;
                console.log(initcmds);
                execSync(initcmds, { cwd: processRoot });
                break;
            case 'boot':
                console.log(chalk.gray('init boot project...'));
                cmds = [
                    '@tsdi/ioc',
                    '@tsdi/annotations',
                    '@tsdi/aop',
                    '@tsdi/core',
                    '@tsdi/logger'
                ];
                if (options.browser) {
                    cmds.push('@tsdi/platform-browser');
                } else {
                    cmds.push('@tsdi/platform-server');
                }
                initcmds = `npm install ${initcmds} ${cmds.join(version) + version} --save${options.dev ? '-dev' : ''}`;
                console.log(initcmds);
                execSync(initcmds, { cwd: processRoot });
                break;
            default:
                console.log(chalk.gray('init tsioc project...'));
                cmds = [
                    '@tsdi/ioc',
                    '@tsdi/core',
                    '@tsdi/annotations',
                    '@tsdi/aop',
                    '@tsdi/logger'
                ];
                initcmds = `npm install ${initcmds} ${cmds.join(version) + version} --save${options.dev ? '-dev' : ''}`;
                console.log(initcmds);
                execSync(initcmds, { cwd: processRoot });
                break;
        }
    });


function requireRegisters() {
    requireCwd('tsconfig-paths').register();
}

function runActivity(fileName: string, options: any) {
    const wf = requireCwd('@tsdi/activities');

    let config;
    if (options.config && typeof options.config === 'string') {
        config = requireCwd(options.config);
    }
    config = config || {};
    if (typeof options.debug === 'boolean') {
        config.debug = options.debug;
    }

    const md = requireCwd(fileName);
    const activites = Object.values(md);
    if (activites.some(v => wf.isAcitvityClass(v))) {
        wf.Workflow.sequence(...activites.filter(v => wf.isAcitvityClass(v)));
    }
}

function vaildifyFile(fileName: string, defaultFile = 'taskfile'): string {
    if (!fileName) {
        defaultFile = defaultFile.trim().replace(/(\.ts|\.js)$/, '');
        ['.ts', '.js'].some(ext => {
            if (fs.existsSync(path.join(processRoot, defaultFile + ext))) {
                fileName = defaultFile + ext;
                return true;
            }
        });
        fileName && process.argv.push(fileName);
    }
    fileName = path.normalize(fileName);
    if (!fs.existsSync(path.join(processRoot, fileName))) {
        console.log(chalk.red(`'${path.join(processRoot, fileName)}' not exsists`));
        process.exit(1);
    }
    return path.join(processRoot, fileName);
}


program
    .command('test [files]')
    .description('run unit test.')
    .option('--config [string]', 'config file path.')
    .option('-b, --browser [bool]', 'test browser project or not.')
    .option('-c, --coverage [bool]', 'enable coverage collection.')
    .option('--coverage-dir [string]', 'coverage output directory (overrides NODE_V8_COVERAGE).')
    .option('--node [bool]', 'test in node environment (default).')
    .option('--debug [bool]', 'enable debug log or not')
    .action((files, options) => {
        requireRegisters();
        if (Array.isArray(files)) {
            files = files.filter(f => f && typeof f === 'string');
        } else {
            if (!files || !(typeof files === 'string')) {
                files = 'test/**/*.(js|ts)';
            }
        }
        const unit = requireCwd('@tsdi/unit');


        let config;
        if (typeof options.config === 'string') {
            config = requireCwd(options.config);
        }
        config = config || {};
        config.baseURL = config.baseURL || processRoot;
        if (typeof options.debug === 'boolean') {
            config.debug = options.debug;
        }
        if (options.browser) {
            options.env = 'browser';
        }
        // Handle coverage options
        const coverageEnabled = options.coverage === true || process.env.COVERAGE === '1' || process.env.COVERAGE === 'true';
        if (coverageEnabled) {
            config.coverage = config.coverage || {};
            config.coverage.enabled = true;
            // Set coverage output directory from CLI option or existing config
            if (typeof options.coverageDir === 'string') {
                config.coverage.outputDir = options.coverageDir;
                // Override NODE_V8_COVERAGE environment variable
                process.env.NODE_V8_COVERAGE = options.coverageDir;
            }
        }
        unit.runTest(files, config);
    });


program
    .command('run [fileName]')
    .description('run ts file.')
    .option('--activity [bool]', 'target file is activity.')
    .option('--config [string]', 'path to configuration file for activities build')
    .option('--debug [bool]', 'enable debug log or not')
    .allowUnknownOption(true)
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
    .command('build [taskfile]')
    .description('build project. For components/core/boot packages, compile TypeScript files. For activity projects, run build activities.')
    .option('-t, --target <target>', 'build target: components, core, boot')
    .option('--src <pattern>', 'source files pattern (default: src/**/*.ts)')
    .option('--outDir <dir>', 'output directory (default: lib)')
    .option('--tsconfig <path>', 'TypeScript config file path')
    .option('--bundle [bool]', 'bundle files into single output')
    .option('--minify [bool]', 'minify output')
    .option('--sourcemap [bool]', 'generate source maps')
    .option('--declaration [bool]', 'generate declaration files')
    .option('--outputStyle <style>', 'output style: esm2020, esm2022, fesm2020, fesm2022')
    .option('--platform <platform>', 'target platform: browser, node')
    .option('--entry <file>', 'entry point for bundling')
    .option('--boot [bool]', 'target file with Workflow instance to boot activity.')
    .option('-e, --env [string]', 'use that particular environment.ts during the build')
    .option('-c, --clean [bool]', 'destroy the build folder prior to compilation')
    .option('-w, --watch [bool]', 'listen for changes in filesystem and rebuild')
    .option('--config [string]', 'path to configuration file')
    .option('--debug [bool]', 'enable debug log or not')
    .option('-d, --deploy [bool]', 'run deploy activity')
    .option('--verbose [bool]', 'log all messages in list format')
    .option('--closure [bool]', 'bundle and optimize with closure compiler')
    .option('-r, --rollup [bool]', 'bundle with rollup and optimize with closure compiler')
    .allowUnknownOption(true)
    .action((taskfile, options) => {
        requireRegisters();
        
        // Check if target option is provided for new build functionality
        if (options.target && ['components', 'core', 'boot'].includes(options.target)) {
            handleBuild(options as BuildOptions, processRoot);
            return;
        }
        
        // Check if no taskfile and no explicit target - auto-detect
        if (!taskfile && !options.target) {
            handleBuild(options as BuildOptions, processRoot);
            return;
        }
        
        // Legacy taskfile-based build
        taskfile = vaildifyFile(taskfile);
        if (options.boot) {
            requireCwd(taskfile);
        } else {
            runActivity(taskfile, options);
        }
    });

program
    .command('serve [taskfile]')
    .description('start preview server for components or boot services')
    .option('-p, --port <port>', 'port to listen on (default: 3000)')
    .option('-h, --host <host>', 'host to bind to (default: localhost)')
    .option('--root <dir>', 'root directory to serve (default: lib)')
    .option('--entry <file>', 'component preview entry file')
    .option('-w, --watch [bool]', 'enable hot reload on file changes')
    .option('--open [bool]', 'open browser automatically')
    .option('--cors [bool]', 'enable CORS')
    .option('--index <file>', 'index HTML file name (default: index.html)')
    .option('--tsconfig <path>', 'TypeScript config file path')
    .option('--boot [bool]', 'boot application service (use @tsdi/boot)')
    .option('-e, --env [string]', 'use that particular environment.ts during the build')
    .option('-c, --clean [bool]', 'destroy the build folder prior to compilation')
    .option('--config [string]', 'path to configuration file')
    .option('--debug [bool]', 'enable debug log or not')
    .option('--verbose [bool]', 'log all messages in list format')
    .allowUnknownOption(true)
    .action((taskfile, options) => {
        requireRegisters();
        
        // Check if boot option or no taskfile - use new serve functionality
        if (options.boot || (!taskfile && !process.argv.includes('--boot'))) {
            handleServe(options as ServeOptions, processRoot);
            return;
        }
        
        // Legacy taskfile-based serve
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
