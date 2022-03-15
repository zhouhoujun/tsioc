import { Abstract, tokenId } from '@tsdi/ioc';
import { ILogger, Logger } from '@tsdi/logs';
import { Runner } from '../metadata/decor';
import { OnDispose } from '../lifecycle';
import { Startup } from '../startup';
import { Protocol, TransportRequest, TransportResponse } from './packet';
import { TransportEndpoint } from './endpoint';


/**
 * abstract transport server.
 */
@Abstract()
@Runner('startup')
export abstract class TransportServer<TRequest extends TransportRequest = TransportRequest, TResponse extends TransportResponse = TransportResponse> implements Startup, OnDispose {

    @Logger()
    protected readonly logger!: ILogger;
    /**
     * startup server.
     */
    abstract startup(): Promise<void>;
    /**
     * transport endpoint.
     */
    abstract get handler(): TransportEndpoint<TRequest, TResponse>;
    /**
     * close server.
     */
    abstract close(): Promise<void>;
    /**
     * on dispose.
     */
    async onDispose(): Promise<void> {
        await this.close();
    }

}

/**
 * server option.
 */
 export interface ServerOption extends Record<string, any> {
    url?: string;
    host?: string;
    port?: number;
    /**
     * transport protocol type.
     */
    protocol: Protocol;
}

export const SERVEROPTION = tokenId<ServerOption>('SERVEROPTION');

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
