import { Abstract } from '@tsdi/ioc';
import { TransportClient } from './client';
import { Protocol } from '../types';

/**
 * client option.
 */
export interface ClientOption extends Record<string, any> {
    /**
     * transport type.
     */
    protocol: Protocol;
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
    abstract create(options: ClientOption): TransportClient;
}
