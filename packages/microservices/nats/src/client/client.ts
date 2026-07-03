import { Injectable, isString, Context, Inject } from '@tsdi/ioc';
import { Pattern, RequestInitOpts, TopicRequestOptions, ResponseEvent, Events, PatternFormatter } from '@tsdi/common';
import { AbstractClient, ClientHandler } from '@tsdi/client';
import { SOCKET } from '@tsdi/transport';
import { InjectLog, Logger } from '@tsdi/logger';
import { defer, Observable } from 'rxjs';
import { connect, NatsConnection } from 'nats';
import { NATS_CLIENT_OPTIONS, NatsClientOptions } from './options';
import { NatsRequest } from './request';

@Injectable()
export class NatsClient extends AbstractClient<NatsRequest<any>, ResponseEvent<any>, TopicRequestOptions> {

    @InjectLog()
    private logger!: Logger;

    private nc?: NatsConnection;

    constructor(
        readonly handler: ClientHandler<NatsRequest<any>, ResponseEvent<any>>,
        @Inject(NATS_CLIENT_OPTIONS, { nullable: true }) private options: NatsClientOptions
    ) {
        super();
    }

    protected connect(): Observable<NatsConnection> {
        return defer(async () => {
            if (this.nc) return this.nc;

            const servers = this.options.servers || [this.options.url || 'nats://localhost:4222'];
            this.nc = await connect({ servers });

            this.nc.closed().then(() => {
                this.logger?.info('NATS client connection closed');
            }).catch(err => {
                this.logger?.error('NATS client connection closed with error:', err);
            });

            return this.nc;
        });
    }

    protected initContext(context: Context, req: NatsRequest<any>): void {
        context.set(NatsClient, this);
        context.set(NatsRequest, req);
        context.set(SOCKET, this.nc as any);
    }

    protected buildRequest(first: NatsRequest<any> | Pattern, options: RequestInitOpts<any, TopicRequestOptions>): NatsRequest<any> {
        if (first instanceof NatsRequest) {
            return first;
        }
        if (isString(first)) {
            return new NatsRequest(first, null, options);
        } else {
            return new NatsRequest(this.handler.injector.get(PatternFormatter).format(first), first, options);
        }
    }

    protected async onShutdown(): Promise<void> {
        if (!this.nc) return;

        const connection = this.nc;
        this.nc = undefined;
        try {
            await connection.drain();
        } catch {
            // ignore drain failures during shutdown and force close below
        }
        try {
            await connection.close();
        } catch {
            // ignore close failures during shutdown
        }
    }

    protected isValid(connection: NatsConnection): boolean {
        return !connection.isClosed();
    }
}
