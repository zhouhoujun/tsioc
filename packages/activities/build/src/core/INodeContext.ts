import { Express2, ObjectMap } from '@ts-ioc/core';
import { Src, IActivityContext } from '@taskfr/core';

/**
 * cmd options.
 *
 * @export
 * @interface CmdOptions
 */
export interface CmdOptions {
    force?: boolean;
    silent?: boolean;
}


/**
 * node activity context.
 *
 * @export
 * @interface INodeActivityContext
 */
export interface INodeActivityContext extends IActivityContext {
    /**
     * package file.
     *
     * @type {string}
     * @memberof INodeContext
     */
    packageFile: string;

    /**
     * has args.
     *
     * @param {*} arg
     * @returns {boolean}
     * @memberof INodeContext
     */
    hasArg(arg): boolean;

    /**
     * get evn args.
     *
     * @returns {ObjectMap<any>}
     * @memberof INodeContext
     */
    getEnvArgs(): ObjectMap<any>;

    /**
     * get root folders.
     *
     * @param {Express2<string, string, boolean>} [express]
     * @returns {string[]}
     * @memberof INodeContext
     */
    getRootFolders(express?: Express2<string, string, boolean>): string[];

    /**
     * get folders in an dir.
     *
     * @param {string} pathstr
     * @param {Express2<string, string, boolean>} [express]
     * @returns {string[]}
     * @memberof INodeContext
     */
    getFolders(pathstr: string, express?: Express2<string, string, boolean>): string[];

    /**
     * filter fileName in directory.
     *
     * @param {Src} express
     * @param {(fileName: string) => boolean} [filter]
     * @param {(filename: string) => string} [mapping]
     * @returns {Promise<string[]>}
     * @memberof INodeContext
     */
    getFiles(express: Src, filter?: (fileName: string) => boolean, mapping?: (filename: string) => string): Promise<string[]>;

    /**
     * copy file.
     *
     * @param {Src} src
     * @param {string} dist
     * @param {CmdOptions} [options]
     * @memberof INodeContext
     */
    copyFile(src: Src, dist: string, options?: CmdOptions);

    /**
     * copu dir.
     *
     * @param {Src} src
     * @param {string} dist
     * @param {CmdOptions} [options]
     * @memberof INodeContext
     */
    copyDir(src: Src, dist: string, options?: CmdOptions);

    /**
     * copy file to.
     *
     * @param {string} filePath
     * @param {string} dist
     * @returns {Promise<any>}
     * @memberof INodeContext
     */
    copyTo(filePath: string, dist: string): Promise<any>;

    /**
     * del files.
     *
     * @param {Src} src file match options.
     * @returns {Promise<any>}
     * @memberof INodeContext
     */
    del(src: Src): Promise<any>;

    /**
     * to root path.
     *
     * @param {string} pathstr
     * @returns {string}
     * @memberof INodeContext
     */
    toRootPath(pathstr: string): string;

    /**
     * get package.
     *
     * @returns {*}
     * @memberof INodeContext
     */
    getPackage(): any;

    /**
     * get package version.
     *
     * @returns {string}
     * @memberof INodeContext
     */
    getPackageVersion(): string;

    /**
     * get module version.
     *
     * @param {string} name
     * @param {boolean} [dependencies]
     * @returns {string}
     * @memberof INodeContext
     */
    getModuleVersion(name: string, dependencies?: boolean): string;

}
