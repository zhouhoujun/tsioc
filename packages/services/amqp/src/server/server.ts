import { Execption, Inject, Injectable, lang } from '@tsdi/ioc';
import { InjectLog, Logger } from '@tsdi/logger';
import { TransportSession, ev } from '@tsdi/common/transport';
import { Server, ServerTransportSessionFactory } from '@tsdi/endpoints';
import * as amqp from 'amqplib';
import { AMQP_SERV_OPTS, AmqpMicroServiceOpts } from './options';
import { AmqpEndpointHandler } from './handler';




@Injectable()
export class AmqpServer extends Server {

    @InjectLog()
    private logger!: Logger;

    private _connected = false;
    private _conn: amqp.Connection | null = null;
    private _channel: amqp.Channel | null = null;
    private _session?: TransportSession<amqp.Channel>;

    constructor(
        readonly handler: AmqpEndpointHandler,
        @Inject(AMQP_SERV_OPTS) private options: AmqpMicroServiceOpts) {
        super();
    }

    protected async connect(): Promise<any> {

        const conn = this._conn = await this.createConnection(this.options.retryAttempts || 3, this.options.retryDelay ?? 3000);
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
            this._conn = await this.createConnection(this.options.retryAttempts || 3, this.options.retryDelay ?? 3000);
            this.onStart();
        });
    }
    protected async onStart(): Promise<any> {
        await this.connect();
        if (!this._conn) throw new Execption('Amqp Connection has not connected.');

        const channel = this._channel = await this._conn.createChannel();

        const transportOpts = this.options.transportOpts!;
        if (!transportOpts.transport) {
            transportOpts.transport = 'amqp';
        }
        transportOpts.serverSide = true;

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
        const session = this._session = injector.get(ServerTransportSessionFactory).create(injector, channel, transportOpts);
        session.listen(this.handler)
        // injector.get(RequestHandler).handle(this.endpoint, session, this.logger, this.options);

    }

    protected async createConnection(retrys: number, retryDelay: number): Promise<amqp.Connection> {
        try {
            if (retrys) {
                const conn = await amqp.connect(this.options.serverOpts!);
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
