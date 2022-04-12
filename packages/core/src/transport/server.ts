import { Abstract, tokenId } from '@tsdi/ioc';
import { Logger, Log } from '@tsdi/logs';
import { Runner } from '../metadata/decor';
import { OnDispose } from '../lifecycle';
import { Startup } from '../startup';
import { Protocol, RequestBase, WritableResponse } from './packet';
import { Endpoint } from './endpoint';

/**
 * abstract transport server.
 */
@Abstract()
@Runner('startup')
export abstract class TransportServer<TRequest extends RequestBase , TResponse extends WritableResponse> implements Startup, OnDispose {

    @Log()
    protected readonly logger!: Logger;
    /**
     * startup server.
     */
    abstract startup(): Promise<void>;
    /**
     * transport endpoint.
     */
    abstract get endpoint(): Endpoint<TRequest, TResponse>;
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
export abstract class ServerFactory<TRequest extends RequestBase , TResponse extends WritableResponse> {
    /**
     * create by options.
     * @param options 
     */
    abstract create(options: ServerOption): TransportServer<TRequest, TResponse>;
}
