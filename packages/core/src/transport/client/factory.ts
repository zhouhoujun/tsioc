import { Abstract } from '@tsdi/ioc';
import { AbstractClient } from './client';
import { TransportType } from '../types';

/**
 * client option.
 */
export interface ClientOption extends Record<string, any> {
    /**
     * transport type.
     */
    transport: TransportType;
}

/**
 * client abstract factory.
 */
@Abstract()
export abstract class ClientFactory {
    /**
     * create by options.
     * @param options 
     */
    abstract create(options: ClientOption): AbstractClient;
}
