import { Src, ContextActivity, Task, ActivityContext, InputDataToken, InjectActivityContextToken, ActivityMetaAccessorToken, ActivityConfigure } from '@ts-ioc/activities';
import { Inject, Injectable, ObjectMap, Express2, isArray, isString, assertExp, Providers, MetaAccessorToken } from '@ts-ioc/core';
import { toAbsolutePath } from '@ts-ioc/platform-server';
import { existsSync, readdirSync, lstatSync } from 'fs';
import { join, dirname, normalize, relative } from 'path';
import {
    mkdir, cp, rm
    /* ls, test, cd, ShellString, pwd, ShellArray, find, mv, TestOptions, cat, sed */
} from 'shelljs';
import * as globby from 'globby';
import { CmdOptions, INodeActivityContext } from './INodeContext';
import { ProcessRunRootToken } from '@ts-ioc/bootstrap';

const minimist = require('minimist');
const del = require('del');

/**
 * node activity.
 *
 * @export
 * @abstract
 * @class NodeActivity
 * @extends {ContextActivity}
 * @template T
 */
@Task
@Providers([
    { provide: MetaAccessorToken, useExisting: ActivityMetaAccessorToken }
])
export abstract class NodeActivity extends ContextActivity {

    /**
     * node activity context.
     *
     * @type {NodeActivityContext<any>}
     * @memberof NodeActivity
     */
    context: NodeActivityContext<any>;

    protected isValidContext(ctx: any): boolean {
        return ctx instanceof NodeActivityContext;
    }

    /**
     * execute build activity.
     *
     * @protected
     * @abstract
     * @param {NodeActivityContext} ctx
     * @returns {Promise<void>}
     * @memberof NodeActivity
     */
    protected abstract async execute(): Promise<void>;

    protected vaildExecAcitve(config: ActivityConfigure) {
        config.baseContextType = NodeActivityContext;
    }
}


/**
 * node activity context token.
 */
export const NodeActivityContextToken = new InjectActivityContextToken(NodeActivity);


/**
 * pipe activity context.
 *
 * @export
 * @class NodeActivityContext
 * @extends {ActivityContext}
 * @implements {IActivityContext<ITransform>}
 */
@Injectable(NodeActivityContextToken)
export class NodeActivityContext<T> extends ActivityContext<T> implements INodeActivityContext {

    packageFile = 'package.json';

    constructor(@Inject(InputDataToken) input: any) {
        super(input);
    }

    private args: ObjectMap<any>;
    /**
     * get evn args.
     *
     * @returns {ObjectMap<any>}
     * @memberof NodeContext
     */
    getEnvArgs(): ObjectMap<any> {
        if (!this.args) {
            this.args = minimist(process.argv.slice(2));
        }
        return this.args;
    }

    hasArg(arg): boolean {
        return process.argv.indexOf(arg) > -1 || process.argv.indexOf('--' + arg) > -1;
    }

    /**
     * get root folders.
     *
     * @param {Express2<string, string, boolean>} [express]
     * @returns {string[]}
     * @memberof NodeContext
     */
    getRootFolders(express?: Express2<string, string, boolean>): string[] {
        return this.getFolders(this.getRootPath(), express);
    }

    /**
     * get folders of path.
     *
     * @param {string} pathstr
     * @param {Express2<string, string, boolean>} [express]
     * @returns {string[]}
     * @memberof NodeContext
     */
    getFolders(pathstr: string, express?: Express2<string, string, boolean>): string[] {
        pathstr = normalize(pathstr);
        let dir = readdirSync(pathstr);
        let folders = [];
        dir.forEach(d => {
            let sf = join(pathstr, d);
            let f = lstatSync(sf);
            if (f.isDirectory()) {
                if (express) {
                    let fl = express(sf, d);
                    if (fl) {
                        folders.push(fl);
                    }
                } else {
                    folders.push(sf);
                }
            }
        });
        return folders;
    }

    /**
     * filter fileName in directory.
     *
     * @param {Src} express
     * @param {(fileName: string) => boolean} [filter]
     * @param {(filename: string) => string} [mapping]
     * @returns {Promise<string[]>}
     * @memberof NodeContext
     */
    async getFiles(express: Src, filter?: (fileName: string) => boolean, mapping?: (filename: string) => string): Promise<string[]> {
        assertExp(isString(express) || isArray(express), 'input express param type error!');
        let filePaths: string[] = await globby(express);
        if (filter) {
            filePaths = filePaths.filter(filter);
        }

        if (mapping) {
            return filePaths.map(mapping);
        }

        return filePaths;
    }

    copyFile(src: Src, dist: string, options?: CmdOptions) {
        if (options && options.force) {
            rm('-f', dist);
            cp(src, dist);
        } else {
            cp(src, dist);
        }
    }

    copyDir(src: Src, dist: string, options?: CmdOptions) {
        if (!existsSync(dist)) {
            mkdir('-p', dist);
        }
        if (options && options.force) {
            rm('-rf', normalize(join(dist, '/')));
            mkdir('-p', normalize(join(dist, '/')));
            cp('-R', normalize(src + '/*'), normalize(join(dist, '/')));
        } else {
            cp('-R', normalize(src + '/*'), normalize(join(dist, '/')));
        }
    }

    async copyTo(filePath: string, dist: string): Promise<any> {
        const outFile = join(dist, filePath.replace(/(node_modules)[\\\/]/g, ''));
        return new Promise((res) => {
            if (!existsSync(outFile)) {
                if (!existsSync(dirname(outFile))) {
                    mkdir('-p', dirname(outFile));
                }
                cp('-R', join(filePath), outFile);
                res();
            }
        });
    }

    del(src: Src): Promise<any> {
        return del(src);
    }

    /**
     * to root path.
     *
     * @param {string} pathstr
     * @returns {string}
     * @memberof NodeContext
     */
    toRootPath(pathstr: string): string {
        let root = this.getRootPath();
        return root ? toAbsolutePath(root, pathstr) : pathstr;
    }

    /**
     * convert path to relative root path.
     *
     * @param {string} pathstr
     * @returns {string}
     * @memberof NodeActivityContext
     */
    relativeRoot(pathstr: string): string {
        if (/^(.{1,2}\/?\\?)?$/.test(pathstr)) {
            return pathstr;
        }
        let fullpath = this.toRootPath(pathstr);
        let root = this.getContainer().get(ProcessRunRootToken) || process.cwd();
        return relative(root, fullpath) || '.';
    }

    getRootPath(): string {
        let ctx = this.find(c => c.config && c.config.baseURL);
        if (ctx) {
            return ctx.config.baseURL;
        }
        return this.getContainer().get(ProcessRunRootToken) || process.cwd();
    }

    toRootSrc(src: Src): Src {
        let root = this.getRootPath();
        if (root) {
            if (isString(src)) {
                return this.prefixSrc(root, src);
            } else {
                return src.map(s => this.prefixSrc(root, s));
            }
        }
        return src;
    }

    private prefixSrc(root: string, strSrc: string): string {
        let prefix = '';
        if (/^!/.test(strSrc)) {
            prefix = '!';
            strSrc = strSrc.substring(1, strSrc.length);
        }
        return prefix + toAbsolutePath(root, strSrc);
    }

    private _package: any;
    /**
     * get package.
     *
     * @returns {*}
     * @memberof NodeContext
     */
    getPackage(): any {
        let filename = this.relativeRoot(this.packageFile);
        if (!this._package) {
            this._package = require(filename);
        }
        return this._package;
    }
    /**
     * get package version.
     *
     * @returns {string}
     * @memberof NodeContext
     */
    getPackageVersion(): string {
        let packageCfg = this.getPackage();
        if (!packageCfg) {
            return '';
        }
        return packageCfg.version || '';
    }
    /**
     * get module version.
     *
     * @param {string} name
     * @param {boolean} [dependencies=false]
     * @returns {string}
     * @memberof NodeContext
     */
    getModuleVersion(name: string, dependencies = false): string {
        let packageCfg = this.getPackage();
        if (!packageCfg) {
            return '';
        }
        let version = '';
        if (packageCfg.dependencies) {
            version = packageCfg.dependencies[name];
        }
        if (!dependencies && !version && packageCfg.devDependencies) {
            version = packageCfg.devDependencies[name];
        }

        return version || '';
    }
}
