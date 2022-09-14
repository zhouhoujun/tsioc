import { EndpointBackend, RequestContext } from '@tsdi/core';
import { Injectable, InvocationContext, Nullable, Token } from '@tsdi/ioc';
import { ev, TransportClient } from '@tsdi/transport';
import { createClient, RedisClientType } from 'redis';
import { RedisClientOpts } from './options';


@Injectable()
export class RedisClient extends TransportClient {
    
    private _client!: RedisClientType;
    private connected: boolean;
    private options!: RedisClientOpts;
    constructor(
        context: InvocationContext,
        @Nullable() options: RedisClientOpts
    ) {
        super(context, options);
        this.connected = false;
    }

    protected async connect(): Promise<void> {
        if(this.connected) return;

        this._client = createClient(this.options.redisOpts);
        this._client.on(ev.MESSAGE, (buf)=> {
            
        });

        
    }
    protected getBackend(): EndpointBackend<any, any> {
        throw new Error('Method not implemented.');
    }

    protected buildRequest(context: RequestContext, url: any, options?: RequstOption | undefined) {
        throw new Error('Method not implemented.');
    }
}
