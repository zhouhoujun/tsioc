import { ObjectMap, tokenId, Type } from '@tsdi/ioc';
import { LoadType } from '@tsdi/core';
import { ModuleConfigure } from '../modules/ModuleConfigure';

/**
 *  process run root.
 */
export const ProcessRunRootToken = tokenId<string>('BOOT_PROCESS_ROOT');


export interface IConnectionOptions {
    asDefault?: boolean;
    name?: string;
    /**
     * db type.
     */
    type: string;
    host: string;
    port: number;
    username?: string;
    password?: string;
    database: string;
    entities?: Type[];
    initDb?(connect: any): Promise<void>;
}

/**
 * runnable configure.
 *
 * @export
 * @interface RunnableConfigure
 * @extends {ModuleConfigure}
 */
export interface RunnableConfigure extends ModuleConfigure {
    /**
     * deps.
     *
     * @type {LoadType[]}
     * @memberof RunnableConfigure
     */
    deps?: LoadType[];
    /**
     * application name.
     *
     * @type {string}
     * @memberof AppConfigure
     */
    name?: string;
    /**
     * set enable debug log or not.
     *
     * @type {boolean}
     * @memberof AppConfigure
     */
    debug?: boolean;

    /**
     * log config.
     *
     * @type {*}
     * @memberof AppConfigure
     */
    logConfig?: any;

    /**
     * custom config key value setting.
     *
     * @type {ObjectMap}
     * @memberOf AppConfigure
     */
    setting?: ObjectMap;

    /**
     * custom config connections.
     *
     * @type {any}
     * @memberof AppConfigure
     */
    connections?: IConnectionOptions | IConnectionOptions[];

    /**
     * models of boot application.
     */
    models?: string[] | Type[];
}
