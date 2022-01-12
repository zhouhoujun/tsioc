import { Abstract } from '@tsdi/ioc';
import { TransportType } from '../types';
import { AbstractServer } from './server';

/**
 * server option.
 */
export interface ServerOption extends Record<string, any> {
    /**
     * transport type.
     */
    transport: TransportType;
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
