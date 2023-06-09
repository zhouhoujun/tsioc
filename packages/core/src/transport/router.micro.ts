import { Abstract, Injector, tokenId } from '@tsdi/ioc';
import { Endpoint } from '../endpoints/endpoint';
import { RouteMatcher, Router } from './router';
import { Routes } from './route';


export type TransportProtocol = 'tcp' | 'redis' | 'mqtt' | 'kafka' | 'amqp' | 'coap' | 'modbus';

/**
 * message router
 * 
 * public api for microserivce router
 */
@Abstract()
export abstract class MessageRouter<T = Endpoint> extends Router<T> {

    abstract get protocol(): TransportProtocol;
}


/**
 * message routers.
 */
export const MESSAGE_ROUTERS = tokenId<MessageRouter[]>('MESSAGE_ROUTERS');


/**
 * microserivce router.
 * 
 * public api for microserivce router
 */
@Abstract()
export abstract class MircoServiceRouter {
    /**
     * get microserivce router
     */
    abstract get<T = Endpoint>(protocol?: TransportProtocol): Router<T>;
    /**
     * register microserivce router
     * @param options 
     */
    abstract register<T = Endpoint>(options: MircoRouterOption): MessageRouter<T>;
}

export interface MircoRouterOption {
    protocol: string;
    injector?: Injector;
    matcher?: RouteMatcher;
    prefix?: string;
    routes?: Routes;
}