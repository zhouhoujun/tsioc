import { Inject, Injectable, InvocationContext, promisify } from '@tsdi/ioc';
import { Client, TransportEvent, TransportRequest } from '@tsdi/core';
import { LOCALHOST, OfflineExecption, ev } from '@tsdi/transport';
import { InjectLog, Logger } from '@tsdi/logs';
import * as mqtt from 'mqtt';
import { Observable, of } from 'rxjs';
import { MqttHandler } from './handler';
import { MQTT_CLIENT_OPTS, MqttClientOpts } from './options';


/**
 * mqtt client.
 */
@Injectable({ static: false })
export class MqttClient extends Client<TransportRequest, TransportEvent> {

    @InjectLog()
    private logger?: Logger;

    private mqtt?: mqtt.Client | null;

    private clientId?: string;
    constructor(
        readonly handler: MqttHandler,
        @Inject(MQTT_CLIENT_OPTS) private options: MqttClientOpts) {
        super()
    }


    protected isValidate(mqtt: mqtt.Client | null | undefined): boolean {
        return (mqtt && !mqtt.disconnected && mqtt.connected) as boolean
    }

    protected connect(): Observable<any> {
        if (this.isValidate(this.mqtt)) {
            return of(this.mqtt);
        }

        return new Observable((sbscriber) => {
            const opts = {
                host: LOCALHOST,
                port: 1883,
                ...this.options.connectOpts
            };
            const client = this.mqtt ?? (opts.url ? mqtt.connect(opts.url, opts) : mqtt.connect(opts));
            const onError = (err: any) => {
                this.logger?.error(err);
                sbscriber.error(err);
            }
            const onConnect = (packet: mqtt.IConnectPacket) => {
                this.mqtt = client;
                this.clientId = packet.clientId;
                sbscriber.next(client);
                sbscriber.complete();
            }

            const onOffline = () => {
                sbscriber.next(new OfflineExecption());
            }
            const onDisConnect = (packet: mqtt.IDisconnectPacket) => {

            };

            client.on(ev.ERROR, onError);
            client.on(ev.CONNECT, onConnect);
            client.on(ev.OFFLINE, onOffline);
            client.on(ev.DISCONNECT, onDisConnect);

            return () => {
                client.off(ev.ERROR, onError);
                client.off(ev.CONNECT, onConnect);
                client.off(ev.OFFLINE, onOffline);
                client.off(ev.DISCONNECT, onDisConnect);
            }

        })

    }

    protected override initContext(context: InvocationContext<any>): void {
        super.initContext(context);
        this.mqtt && context.setValue(mqtt.Client, this.mqtt);
    }

    protected override async onShutdown(): Promise<void> {
        if (!this.mqtt) return;
        await promisify<void, boolean | undefined>(this.mqtt.end, this.mqtt)(true)
            .catch(err => {
                this.logger?.error(err);
                return err;
            });
        this.mqtt = null;
    }

}
