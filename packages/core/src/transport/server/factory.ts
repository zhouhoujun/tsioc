import { Abstract } from '@tsdi/ioc';
import { Protocol } from '../types';
import { TransportServer } from './server';

/**
 * server option.
 */
export interface ServerOption extends Record<string, any> {
    /**
     * transport protocol type.
     */
    protocol: Protocol;
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
    abstract create(options: ServerOption): TransportServer;
}
