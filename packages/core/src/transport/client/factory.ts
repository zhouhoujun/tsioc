import { Abstract, Injector } from '@tsdi/ioc';
import { TransportClient } from './client';
import { Protocol } from '../packet';

/**
 * client option.
 */
export interface ClientOption extends Record<string, any> {
    /**
     * client url
     */
    url?: string;
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
