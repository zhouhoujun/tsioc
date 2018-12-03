import { IContainer, Injectable } from '@ts-ioc/core';
import { AppConfigure, ApplicationBuilder, IApplicationBuilder, AnyApplicationBuilder, IConfigureLoader, ConfigureLoaderToken } from '@ts-ioc/bootstrap';
import { existsSync } from 'fs';
import * as path from 'path';
import { ServerModule } from '@ts-ioc/platform-server';

export interface ServerBuildExts {
    /**
     * root url
     *
     * @type {string}
     * @memberof IPlatformServer
     */
    baseURL: string;
}

/**
 * server application builder.
 *
 * @export
 * @interface IServerApplicationBuilder
 * @extends {IApplicationBuilder<T>}
 * @template T
 */
export interface IApplicationBuilderServer<T> extends IApplicationBuilder<T>, ServerBuildExts {

}

export interface AnyApplicationBuilderServer extends AnyApplicationBuilder, ServerBuildExts {

}

@Injectable(ConfigureLoaderToken)
export class ConfigureFileLoader implements IConfigureLoader<AppConfigure> {
    constructor(private baseURL: string, private container: IContainer) {

    }
    async load(uri?: string): Promise<AppConfigure> {
        if (uri) {
            if (existsSync(uri)) {
                return require(uri) as AppConfigure;
            } else if (existsSync(path.join(this.baseURL, uri))) {
                return require(path.join(this.baseURL, uri)) as AppConfigure;
            } else {
                console.log(`config file: ${uri} not exists.`)
                return null;
            }
        } else {
            let cfgmodeles: AppConfigure;
            let cfgpath = path.join(this.baseURL, './config');
            ['.js', '.ts', '.json'].forEach(ext => {
                if (cfgmodeles) {
                    return false;
                }
                if (existsSync(cfgpath + ext)) {
                    cfgmodeles = require(cfgpath + ext);
                    return false;
                }
                return true;
            });
            return cfgmodeles;
        }
    }

}


/**
 * server app.
 *
 * @export
 * @template T
 * @param {string} [baseURL]
 * @returns {IApplicationBuilderServer<T>}
 */
export function serverApp<T>(baseURL?: string): IApplicationBuilderServer<T> {
    return new ServerApplicationBuilder<T>(baseURL);
}

/**
 * application builder for server side.
 *
 * @export
 * @class Bootstrap
 */
export class ServerApplicationBuilder<T> extends ApplicationBuilder<T> implements IApplicationBuilderServer<T> {

    constructor(public baseURL: string) {
        super(baseURL);
        this.use(ServerModule, ConfigureFileLoader)
    }

    /**
     * create instance.
     *
     * @static
     * @param {string} rootdir
     * @returns {ApplicationBuilder}
     * @memberof ApplicationBuilder
     */
    static create(rootdir: string): AnyApplicationBuilderServer {
        return new ServerApplicationBuilder<any>(rootdir);
    }

}

