import { Injectable, Context, isString, promisify } from '@tsdi/ioc';
import { DisconnectException, OfflineException } from '@tsdi/core';
import { Pattern, RequestInitOpts, ResponseEvent } from '@tsdi/common';
import { ev } from '@tsdi/common/transport';
import { AbstractClient, ClientTransport, ClientTransportFactory } from '@tsdi/common/client';
import { InjectLog, Logger } from '@tsdi/logger';
import * as mqtt from 'mqtt';
import { Observable } from 'rxjs';
import { MqttHandler } from './handler';
import { MqttClientConfig, MqttReqOptions } from './options';
import { MqttRequest } from './request';


/**
 * mqtt client.
 */
@Injectable()
export class MqttClient extends AbstractClient<MqttReqOptions, MqttRequest<any>, ResponseEvent<any>, MqttClientConfig> {

    @InjectLog()
    private logger?: Logger;

    private mqtt?: mqtt.Client | null;
    private _transport?: ClientTransport<mqtt.Client>;

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
                sbscriber.error(new OfflineException());
            }
            const onDisConnect = (packet: mqtt.IDisconnectPacket) => {
                this.logger?.info('mqtt client disconnected!', packet.reasonCode);
                sbscriber.error(new DisconnectException('mqtt client disconnected! ' + (packet?.reasonCode ?? '')));
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
        const opts = options.connectOpts ?? {};
        const conn = (opts.url ? mqtt.connect(opts.url, opts) : mqtt.connect(opts));

        const context = this.handler.context;
        this._transport = context.get(ClientTransportFactory).create(context, conn, options);
        return conn;
    }

    protected override initContext(context: Context): void {
        context.set(MqttClient, this);
        context.set(ClientTransport, this._transport);
    }

    protected createRequest(pattern: Pattern, options: RequestInitOpts<any, MqttReqOptions>): MqttRequest<any> {
        if (isString(pattern)) {
            return new MqttRequest(pattern, null, options);
        } else {
            const topic = this.formatter.format(pattern);
            return new MqttRequest(topic, pattern, options);
        }
    }

    protected override async onShutdown(): Promise<void> {
        if (!this.mqtt) return;
        await this._transport?.destroy();
        await promisify(this.mqtt.end, this.mqtt)(true)
            .catch(err => {
                this.logger?.error(err);
                return err;
            });
        this.mqtt = null;
    }

}

