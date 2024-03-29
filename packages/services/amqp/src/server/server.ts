import { Execption, Inject, Injectable, lang } from '@tsdi/ioc';
import { InjectLog, Logger } from '@tsdi/logger';
import { ev } from '@tsdi/common/transport';
import { Server, TransportSessionFactory, TransportSession, RequestContext } from '@tsdi/endpoints';
import * as amqp from 'amqplib';
import { AmqpMicroServiceOpts } from './options';
import { AmqpEndpointHandler } from './handler';




@Injectable()
export class AmqpServer extends Server<RequestContext, AmqpMicroServiceOpts> {

    @InjectLog()
    private logger!: Logger;

    private _connected = false;
    private _conn: amqp.Connection | null = null;
    private _channel: amqp.Channel | null = null;
    private _session?: TransportSession<amqp.Channel>;

    constructor(readonly handler: AmqpEndpointHandler) {
        super();
    }

    protected async connect(): Promise<any> {

        const options = this.getOptions();

        const conn = this._conn = await this.createConnection(options.retryAttempts || 3, options.retryDelay ?? 3000);
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
            this._conn = await this.createConnection(options.retryAttempts || 3, options.retryDelay ?? 3000);
            this.onStart();
        });
    }
    protected async onStart(): Promise<any> {
        await this.connect();
        if (!this._conn) throw new Execption('Amqp Connection has not connected.');

        const options = this.getOptions();

        const channel = this._channel = await this._conn.createChannel();

        const transportOpts = options.transportOpts!;
        if (!transportOpts.transport) {
            transportOpts.transport = 'amqp';
        }
        if (!transportOpts.noAssert) {
            await channel.assertQueue(transportOpts.queue!, transportOpts.queueOpts)
        }
        await channel.prefetch(transportOpts.prefetchCount || 0, transportOpts.prefetchGlobal);

        await channel.consume(transportOpts.queue!, msg => {
            if (!msg) return;
            channel.emit(ev.MESSAGE, transportOpts.queue, msg)
        }, {
            noAck: true,
            ...transportOpts.consumeOpts
        });

        const injector = this.handler.injector;
        const session = this._session = injector.get(TransportSessionFactory).create(injector, channel, transportOpts);
        session.listen(this.handler)
        // injector.get(RequestHandler).handle(this.endpoint, session, this.logger, options);

    }

    protected async createConnection(retrys: number, retryDelay: number): Promise<amqp.Connection> {
        try {
            if (retrys) {
                const conn = await amqp.connect(this.getOptions().serverOpts!);
                this._connected = true;
                return conn;
            }
        } catch (err) {
            if (retrys) return await lang.delay(retryDelay).then(() => this.createConnection(retrys - 1, retryDelay));
            throw err;
        }
        return null!
    }


    protected async onShutdown(): Promise<any> {
        await this._session?.destroy();
        await this._channel?.close();
        await this._conn?.close();
        this._channel = this._conn = null;
    }

}
