import { ListenOpts, MESSAGE, MicroService, Outgoing, Packet, TransportContext, TransportSession, TransportSessionFactory } from '@tsdi/core';
import { Inject, Injectable, promisify } from '@tsdi/ioc';
import { InjectLog, Logger } from '@tsdi/logs';
import { MqttClient, connect } from 'mqtt';
import { MQTT_SERV_OPTS, MqttServiceOpts } from './options';
import { MqttEndpoint } from './endpoint';
import { ev } from '@tsdi/transport';
import { MqttIncoming } from './incoming';
import { MqttOutgoing } from './outgoing';
import { Subscription, finalize } from 'rxjs';
import { MqttContext } from './context';



@Injectable()
export class MqttServer extends MicroService<TransportContext, Outgoing> {

    @InjectLog()
    private logger!: Logger;

    constructor(
        readonly endpoint: MqttEndpoint,
        @Inject(MQTT_SERV_OPTS) private options: MqttServiceOpts) {
        super();
    }

    private mqtt?: MqttClient;
    protected override async onStartup(): Promise<any> {
        const opts = {
            ...this.options.connectOpts
        };
        this.endpoint.injector.setValue(ListenOpts, opts);
        this.mqtt = opts.url ? connect(opts.url, opts) : connect(opts);

        const factory = this.endpoint.injector.get(TransportSessionFactory);
        const session = factory.create(this.mqtt, this.options.transportOpts);

        session.on(ev.MESSAGE, (channel: string, packet: Packet) => {
            this.requestHandler(session, packet)
        });


    }

    protected override async onStart(): Promise<any> {

    }

    protected override async onShutdown(): Promise<any> {
        if (!this.mqtt || this.mqtt.disconnected) return;
        await promisify<void, boolean | undefined, Object | undefined>(this.mqtt.end, this.mqtt)(true, undefined)
            .catch(err => {
                this.logger?.error(err);
                return err;
            });
    }

    
    /**
     * request handler.
     * @param observer 
     * @param req 
     * @param res 
     */
    protected requestHandler(session: TransportSession<MqttClient>, packet: Packet): Subscription {
        if (!packet.method) {
            packet.method = MESSAGE;
        }
        const req = new MqttIncoming(session, packet);
        const res = new MqttOutgoing(session, packet.url!, packet.id);

        const ctx = this.createContext(req, res);
        const cancel = this.endpoint.handle(ctx)
            .pipe(finalize(() => {
                ctx.destroy();
            }))
            .subscribe({
                error: (err) => {
                    this.logger.error(err)
                }
            });
        const opts = this.options;
        // opts.timeout && req.socket.stream.setTimeout && req.socket.stream.setTimeout(opts.timeout, () => {
        //     req.emit?.(ev.TIMEOUT);
        //     cancel?.unsubscribe()
        // });
        req.once(ev.ABOUT, () => cancel?.unsubscribe())
        return cancel;
    }

    protected createContext(req: MqttIncoming, res: MqttOutgoing): MqttContext {
        const injector = this.endpoint.injector;
        return new MqttContext(injector, req, res);
    }

}
