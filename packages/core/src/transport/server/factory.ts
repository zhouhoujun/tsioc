import { Abstract } from '@tsdi/ioc';
import { Protocol } from '../types';
import { AbstractServer } from './server';

/**
 * server option.
 */
export interface ServerOption extends Record<string, any> {
    /**
     * transport type.
     */
    transport: Protocol;
}

/**
 * server abstract factory.
 */
@Abstract()
export abstract class ServerFactory {
    /**
     * create by options.
     * @param options 
     */
    abstract create(options: ServerOption): AbstractServer;
}
