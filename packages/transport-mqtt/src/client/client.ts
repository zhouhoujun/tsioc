import { Inject, Injectable, InvocationContext, promisify } from '@tsdi/ioc';
import { TransportRequest, DisconnectExecption, OfflineExecption } from '@tsdi/common';
import { Client, TRANSPORT_SESSION, TransportSession, LOCALHOST, ev } from '@tsdi/transport';
import { InjectLog, Logger } from '@tsdi/logger';
import * as mqtt from 'mqtt';
import { Observable, of } from 'rxjs';
import { MqttHandler } from './handler';
import { MQTT_CLIENT_OPTS, MqttClientOpts } from './options';
import { MqttTransportSessionFactory } from '../transport';


/**
 * mqtt client.
 */
@Injectable({ static: false })
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
        const opts = {
            host: LOCALHOST,
            port: 1883,
            ...this.options.connectOpts
        };
        const conn = (opts.url ? mqtt.connect(opts.url, opts) : mqtt.connect(opts));
        this._session = this.handler.injector.get(MqttTransportSessionFactory).create(conn, this.options.transportOpts!);
        return conn;
    }

    protected override initContext(context: InvocationContext<any>): void {
        context.setValue(Client, this);
        context.setValue(TRANSPORT_SESSION, this._session);
    }

    protected override async onShutdown(): Promise<void> {
        if (!this.mqtt) return;
        this._session?.destroy();
        await promisify(this.mqtt.end, this.mqtt)(true)
            .catch(err => {
                this.logger?.error(err);
                return err;
            });
        this.mqtt = null;
    }

}
