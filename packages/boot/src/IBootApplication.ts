import { BootContext, BootOption } from './BootContext';
import { ContextInit } from './BootApplication';
import { LoadType, Type } from '@tsdi/ioc';
import { IContainerPool } from './core';


export interface IBootApplication extends ContextInit {

    /**
     * boot target.
     *
     * @type {(Type<any> | BootOption | BootContext)}
     * @memberof IBootApplication
     */
    target: Type<any> | BootOption | BootContext;

    getContext(): BootContext;

    run(deps?: LoadType[] | LoadType | string, ...args: string[]): Promise<BootContext>;

    getPools(): IContainerPool;
}
