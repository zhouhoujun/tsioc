import { EMPTY_OBJ, Inject, Injectable, InvocationContext, promisify } from '@tsdi/ioc';
import { TransportEvent, TransportRequest } from '@tsdi/common';
import { DisconnectExecption, OfflineExecption, ev } from '@tsdi/common/transport';
import { Client, ClientTransportSession, ClientTransportSessionFactory } from '@tsdi/common/client';
import { InjectLog, Logger } from '@tsdi/logger';
import * as mqtt from 'mqtt';
import { Observable } from 'rxjs';
import { MqttHandler } from './handler';
import { MqttClientOpts } from './options';


/**
 * mqtt client.
 */
@Injectable()
export class MqttClient extends Client<TransportRequest, TransportEvent, MqttClientOpts> {

    @InjectLog()
    private logger?: Logger;

    private mqtt?: mqtt.Client | null;
    private _session?: ClientTransportSession<mqtt.Client>;

    constructor(readonly handler: MqttHandler) {
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
        const options = this.getOptions();
        const opts = options.connectOpts ?? EMPTY_OBJ;
        const conn = (opts.url ? mqtt.connect(opts.url, opts) : mqtt.connect(opts));
        const transportOpts = options.transportOpts!;

        const injector = this.handler.injector;
        this._session = injector.get(ClientTransportSessionFactory).create(injector, conn, transportOpts);
        return conn;
    }

    protected override initContext(context: InvocationContext<any>): void {
        context.setValue(Client, this);
        context.setValue(ClientTransportSession, this._session);
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

