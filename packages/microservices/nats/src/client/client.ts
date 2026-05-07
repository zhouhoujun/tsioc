import { Injectable, isString, Context, Inject } from '@tsdi/ioc';
import { Pattern, RequestInitOpts, UrlRequestOptions, ResponseEvent, Events, PatternFormatter } from '@tsdi/common';
import { AbstractClient, ClientHandler } from '@tsdi/client';
import { SOCKET } from '@tsdi/transport';
import { InjectLog, Logger } from '@tsdi/logger';
import { defer, Observable, switchMap } from 'rxjs';
import { connect, NatsConnection } from 'nats';
import { NATS_CLIENT_OPTIONS, NatsClientOptions } from './options';
import { NatsRequest } from './request';

@Injectable()
export class NatsClient extends AbstractClient<NatsRequest<any>, ResponseEvent<any>, UrlRequestOptions> {

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

    protected buildRequest(first: NatsRequest<any> | Pattern, options: RequestInitOpts<any, UrlRequestOptions>): NatsRequest<any> {
        if (first instanceof NatsRequest) {
            return first;
        }
        const defaultMethod = this.options.microservice ? undefined : 'PUBLISH';
        if (isString(first)) {
            return new NatsRequest(first, null, options, defaultMethod);
        } else {
            return new NatsRequest(this.handler.injector.get(PatternFormatter).format(first), first, options, defaultMethod);
        }
    }

    protected override request(first: Pattern | NatsRequest<any>, options: UrlRequestOptions = {} as any): Observable<any> {
        return this.connect().pipe(
            switchMap(() => super.request(first, options))
        );
    }

    protected async onShutdown(): Promise<void> {
        if (this.nc) {
            try {
                await this.nc.drain();
                await this.nc.close();
            } catch (err) {
                this.logger?.error('NATS client shutdown error:', err);
            }
            this.nc = undefined;
        }
    }

    protected isValid(connection: NatsConnection): boolean {
        return !connection.isClosed();
    }
}
