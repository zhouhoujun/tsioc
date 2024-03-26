import { EMPTY_OBJ, Inject, Injectable, InvocationContext, promisify } from '@tsdi/ioc';
import { TransportRequest } from '@tsdi/common';
import { Client } from '@tsdi/common/client';
import { InjectLog, Logger } from '@tsdi/logger';
import * as mqtt from 'mqtt';
import { Observable } from 'rxjs';
import { MqttHandler } from './handler';
import { MQTT_CLIENT_OPTS, MqttClientOpts } from './options';


/**
 * mqtt client.
 */
@Injectable()
export class MqttClient extends Client<TransportRequest, number> {

    @InjectLog()
    private logger?: Logger;

    private mqtt?: mqtt.Client | null;
    private _session?: TransportSession<mqtt.Client>;

    constructor(
        readonly handler: MqttHandler,
        @Inject(MQTT_CLIENT_OPTS) private options: MqttClientOpts) {
        super()
    }

    protected connect(): Observable<any> {

        return new Observable((sbscriber) => {
            let hasConn: boolean;
            if (!this.mqtt) {
                hasConn = false;
                this.mqtt = this.createConnection();
            } else {
                hasConn = true;
            }
            const client = this.mqtt;

            const onError = (err: any) => {
                this.logger?.error(err);
                sbscriber.error(err);
            }
            const onConnect = (packet: mqtt.IConnackPacket) => {
                sbscriber.next(client);
                sbscriber.complete();
            }

            const onOffline = () => {
                this.logger?.info('mqtt client offline!');
                sbscriber.error(new OfflineExecption());
            }
            const onDisConnect = (packet: mqtt.IDisconnectPacket) => {
                this.logger?.info('mqtt client disconnected!', packet.reasonCode);
                sbscriber.error(new DisconnectExecption('mqtt client disconnected! ' + packet.reasonCode ?? ''));
            };

            client.on(ev.ERROR, onError);
            client.on(ev.CONNECT, onConnect);
            client.on(ev.OFFLINE, onOffline);
            client.on(ev.DISCONNECT, onDisConnect);

            if (hasConn) {
                if (client.connected) {
                    sbscriber.next(client);
                    sbscriber.complete();
                } else if (client.disconnected) {
                    client.reconnect()
                }
            }

            return () => {
                client.off(ev.ERROR, onError);
                client.off(ev.CONNECT, onConnect);
                client.off(ev.OFFLINE, onOffline);
                client.off(ev.DISCONNECT, onDisConnect);
            }
        })
    }

    protected createConnection() {
        const opts = this.options.connectOpts ?? EMPTY_OBJ;
        const conn = (opts.url ? mqtt.connect(opts.url, opts) : mqtt.connect(opts));
        const transportOpts = this.options.transportOpts!;
        if(!transportOpts.transport) {
            transportOpts.transport = 'mqtt';
        }
        this._session = this.handler.injector.get(TransportSessionFactory).create(conn, transportOpts);
        return conn;
    }

    protected override initContext(context: InvocationContext<any>): void {
        context.setValue(Client, this);
        context.setValue(TransportSession, this._session);
    }

    protected override async onShutdown(): Promise<void> {
        if (!this.mqtt) return;
        await this._session?.destroy();
        await promisify(this.mqtt.end, this.mqtt)(true)
            .catch(err => {
                this.logger?.error(err);
                return err;
            });
        this.mqtt = null;
    }

}

