import { BootContext, BootOption } from './BootContext';
import { ContextInit } from './BootApplication';
import { LoadType, Type } from '@tsdi/ioc';
import { IContainerPool } from './core';


export interface IBootApplication<T extends BootContext = BootContext> extends ContextInit<T> {

    /**
     * boot target.
     *
     * @type {(Type | BootOption | T)}
     * @memberof IBootApplication
     */
    target?: Type | BootOption | T;

    getContext(): T;

    run(deps?: LoadType[] | LoadType | string, ...args: string[]): Promise<T>;

    getPools(): IContainerPool;

    /**
     * boot applicaton extends.
     *
     * @returns {LoadType[]}
     * @memberof IBootApplication
     */
    getBootDeps(): LoadType[];
}
