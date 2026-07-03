import { Injectable, isString, Context, Inject } from '@tsdi/ioc';
import { Pattern, Events, RequestInitOpts, TopicRequestOptions, ResponseEvent, PatternFormatter, defaultFormatter } from '@tsdi/common';
import { AbstractClient, ClientHandler } from '@tsdi/client';
import { SOCKET } from '@tsdi/transport';
import { InjectLog, Logger } from '@tsdi/logger';
import { defer, Observable, switchMap } from 'rxjs';
import * as amqp from 'amqplib';
import { AMQP_CLIENT_OPTIONS, AmqpClientOptions } from './options';
import { AmqpRequest } from './request';

@Injectable()
export class AmqpClient extends AbstractClient<AmqpRequest<any>, ResponseEvent<any>, TopicRequestOptions> {

    @InjectLog()
    private logger!: Logger;

    private connection?: amqp.Connection;
    private channel?: amqp.Channel;

    constructor(
        readonly handler: ClientHandler<AmqpRequest<any>, ResponseEvent<any>>,
        @Inject(AMQP_CLIENT_OPTIONS, { nullable: true }) private options: AmqpClientOptions
    ) {
        super();
    }

    protected connect(): Observable<amqp.Channel> {
        return defer(async () => {
            if (this.channel) return this.channel;

            const url = this.options.url || 'amqp://localhost:5672';
            this.connection = await amqp.connect(url);
            this.channel = await this.connection.createChannel();

            this.connection.on(Events.CLOSE, () => {
                this.logger?.info('AMQP client connection closed');
                this.channel = undefined;
                this.connection = undefined;
            });

            this.connection.on(Events.ERROR, (err: Error) => {
                this.logger?.error('AMQP client connection error:', err);
            });

            return this.channel;
        });
    }

    protected initContext(context: Context, req: AmqpRequest<any>): void {
        context.set(AmqpClient, this);
        context.set(AmqpRequest, req);
        context.set(SOCKET, this.channel as any);
    }

    protected buildRequest(first: AmqpRequest<any> | Pattern, options: RequestInitOpts<any, TopicRequestOptions>): AmqpRequest<any> {
        if (first instanceof AmqpRequest) {
            return first;
        }
        if (isString(first)) {
            return new AmqpRequest(first, null, options);
        } else {
            const formatter = this.handler.injector.get(PatternFormatter, defaultFormatter);
            return new AmqpRequest(formatter.format(first), first, options);
        }
    }
    
    protected async onShutdown(): Promise<void> {
        const channel = this.channel;
        const connection = this.connection;
        this.channel = undefined;
        this.connection = undefined;

        if (channel) {
            try {
                await channel.close();
            } catch {
                // ignore channel close failures during shutdown
            }
        }
        if (connection) {
            try {
                await connection.close();
            } catch {
                // ignore connection close failures during shutdown
            }
        }
    }

    protected isValid(connection: amqp.Channel): boolean {
        try {
            connection.checkQueue('');
            return true;
        } catch {
            return false;
        }
    }

    protected createConnection(opts: AmqpClientOptions): Promise<amqp.Connection> {
        return amqp.connect(opts.url || 'amqp://localhost:5672');
    }
}
