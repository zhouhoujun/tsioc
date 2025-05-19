import { Exception, Injectable, lang } from '@tsdi/ioc';
import { InjectLog, Logger } from '@tsdi/logger';
import { ev } from '@tsdi/common/transport';
import { Server, ServerTransportFactory, ServerTransport, RequestContext, getRouter } from '@tsdi/endpoints';
import * as amqp from 'amqplib';
import { Subject } from 'rxjs';
import { AmqpServConfig } from './options';
import { AmqpRequestHandler } from './handler';




@Injectable()
export class AmqpServer extends Server<RequestContext, AmqpServConfig> {

    @InjectLog()
    private logger!: Logger;
    private destroy$: Subject<void>;
    
    private _connected = false;
    private _conn: amqp.Connection | null = null;
    private _channel: amqp.Channel | null = null;
    private _transport?: ServerTransport<amqp.Channel>;

    constructor(readonly handler: AmqpRequestHandler) {
        super();
        this.destroy$ = new Subject();
    }

    protected async connect(): Promise<any> {

        const options = this.getOptions();

        const conn = this._conn = await this.createConnection(options, options.retryAttempts || 3, options.retryDelay ?? 3000);
        this._connected = true;
        conn.on(ev.CONNECT, () => {
            this._connected = true;
        });
        conn.on(ev.CLOSE, (err) => {
            err && this.logger.error(err);
            this.logger.info(`Amqp microservice closed!`);
        });
        conn.on(ev.ERROR, (err) => {
            this.logger.error(err)
        });
        conn.on(ev.DISCONNECT, async (err) => {
            this._connected = false;
            this.logger.error('Disconnected from rmq. Try to reconnect.');
            this.logger.error(err);
            this._conn = await this.createConnection(options, options.retryAttempts || 3, options.retryDelay ?? 3000);
            this.onStart();
        });
    }
    protected async onStart(): Promise<any> {
        await this.connect();
        if (!this._conn) throw new Exception('Amqp Connection has not connected.');

        const options = this.getOptions();

        const channel = this._channel = await this._conn.createChannel();

        if (!options.noAssert) {
            await channel.assertQueue(options.queue!, options.queueOpts)
        }
        await channel.prefetch(options.prefetchCount || 0, options.prefetchGlobal);

        await channel.consume(options.queue!, msg => {
            if (!msg) return;
            channel.emit(ev.MESSAGE, options.queue, msg)
        }, {
            noAck: true,
            ...options.consumeOpts
        });

        const injector = this.handler.injector;
        const router = getRouter(injector, options.protocol ?? 'amqp', true);

        const transport = this._transport = injector.get(ServerTransportFactory).create(injector, channel, options);
        transport.handle(this.handler, this.destroy$);

        this.logger.info(
            `Subscribed successfully! This server is currently subscribed topics.`,
            router.matcher.getPatterns()
        );
    }

    protected async createConnection(options: AmqpServConfig, retrys: number, retryDelay: number): Promise<amqp.Connection> {
        try {
            if (retrys) {
                const conn = await amqp.connect(options.serverOpts!);
                this._connected = true;
                return conn;
            }
        } catch (err) {
            if (retrys) return await lang.delay(retryDelay).then(() => this.createConnection(options, retrys - 1, retryDelay));
            throw err;
        }
        return null!
    }


    protected async onShutdown(): Promise<any> {
        if(!this._conn) return;

        this.destroy$.next();
        this.destroy$.complete();
        
        await this._transport?.destroy();
        await this._channel?.close();
        await this._conn?.close();
        this._channel = this._conn = null;
    }

}
