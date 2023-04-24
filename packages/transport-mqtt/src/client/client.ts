import { Injectable, promisify } from '@tsdi/ioc';
import { Client, TransportEvent, TransportRequest } from '@tsdi/core';
import { ev } from '@tsdi/transport';
import { InjectLog, Logger } from '@tsdi/logs';
import * as mqtt from 'mqtt';
import { Observable, of } from 'rxjs';
import { MqttHandler } from './handler';
import { MqttClientOpts } from './options';


/**
 * mqtt client.
 */
@Injectable({ static: false })
export class MqttClient extends Client<TransportRequest, TransportEvent> {

    @InjectLog()
    private logger?: Logger;

    private mqtt?: mqtt.MqttClient;

    private clientId?: string;
    constructor(readonly handler: MqttHandler, private options: MqttClientOpts) {
        super()
    }



    protected connect(): Observable<any> {
        if (this.mqtt && !this.mqtt.disconnected && this.mqtt.connected) {
            return of(this.mqtt);
        }

        return new Observable((sbscriber) => {
            const client = this.mqtt ?? mqtt.connect(this.options.connectOpts);
            const onError = (err: any) => {
                this.logger?.error(err);
                sbscriber.error(err);
            }
            const onConnect = (packet: mqtt.IConnectPacket) => {
                this.mqtt = client;
                this.clientId = packet.clientId;
                sbscriber.next(client);
            }
            client.on(ev.ERROR, onError);
            client.on(ev.CONNECT, onConnect)

            return () => {
                client.off(ev.ERROR, onError);
                client.off(ev.CONNECT, onConnect);
            }

        })

    }

    protected override async onShutdown(): Promise<void> {
        if (!this.mqtt || this.mqtt.disconnected) return;
        await promisify<void, boolean | undefined, Object | undefined>(this.mqtt.end, this.mqtt)(true, undefined)
            .catch(err => {
                this.logger?.error(err);
                return err;
            });
    }


    // protected createSocket(opts: MqttClientOpts): net.Socket | tls.TLSSocket | ws.WebSocket {
    //     const connOpts = opts.connectOpts;
    //     switch (connOpts.protocol) {
    //         case 'mqtt':
    //         case 'tcp':
    //             if (!connOpts.options.port) {
    //                 connOpts.options.port = 1883;
    //             }
    //             return net.connect(connOpts.options);
    //         case 'mqtts':
    //         case 'tls':
    //             if (!connOpts.options.key || !connOpts.options.cert) {
    //                 throw new Execption('Missing secure protocol key')
    //             }
    //             if (!connOpts.options.port) {
    //                 connOpts.options.port = 8883;
    //             }
    //             return tls.connect(connOpts.options);
    //         case 'ws':
    //         case 'wss':
    //             return new ws.WebSocket(connOpts.url, connOpts.options);
    //         default:
    //             throw new Execption('Unknown protocol for secure connection: "' + (connOpts as any).protocol + '"!')
    //     }
    // }


    // protected override createConnection(opts: MqttClientOpts): MqttConnection {
    //     const socket = this.createSocket(opts);
    //     const packet = this.context.get(MqttPacketFactory);
    //     const conn = new MqttConnection(socket, packet, opts.connectionOpts);
    //     return conn;
    // }

    // protected onConnect(duplex: net.Socket | tls.TLSSocket | ws.WebSocket, opts?: ConnectionOpts | undefined): Observable<Connection<net.Socket | tls.TLSSocket | ws.WebSocket>> {
    //     const logger = this.logger;
    //     const packetor = this.context.get(MqttPacketFactory);
    //     return new Observable((observer: Observer<Connection<net.Socket | tls.TLSSocket | ws.WebSocket>>) => {
    //         const client = new DuplexConnection(duplex, packetor, opts);
    //         if (opts?.keepalive) {
    //             client.setKeepAlive(true, opts.keepalive);
    //         }

    //         const onError = (err: Error) => {
    //             logger.error(err);
    //             observer.error(err);
    //         }
    //         const onClose = () => {
    //             client.end();
    //         };
    //         const onConnected = () => {
    //             observer.next(client);
    //         }
    //         client.on(ev.ERROR, onError);
    //         client.on(ev.CLOSE, onClose);
    //         client.on(ev.END, onClose);
    //         client.on(ev.CONNECT, onConnected);

    //         return () => {
    //             client.off(ev.ERROR, onError);
    //             client.off(ev.CLOSE, onClose);
    //             client.off(ev.END, onClose);
    //             client.off(ev.CONNECT, onConnected);
    //         }
    //     });
    // }

}
