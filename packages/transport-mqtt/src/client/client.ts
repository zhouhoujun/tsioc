import { Abstract, Execption, Injectable, tokenId } from '@tsdi/ioc';
import { ExecptionFilter, Interceptor, RequestOptions, TransportEvent, TransportRequest } from '@tsdi/core';
import { Connection, ConnectionOpts, ev, LogInterceptor, TransportClient, TransportClientOpts } from '@tsdi/transport';
import { IConnectPacket } from 'mqtt-packet';
import { Observable, Observer } from 'rxjs';
import { Duplex } from 'stream';
import * as net from 'net';
import * as tls from 'tls';
import * as ws from 'ws';
import { MqttPacketFactory, MqttIcomingUtil, PacketOptions } from '../transport';
import { MqttConnection } from '../server/connection';



export interface MqttConnectionOpts extends IConnectPacket {
    /**
     * 'mqttjs_' + Math.random().toString(16).substr(2, 8)
     */
    clientId: string;
    /**
     * 'MQTT'
     */
    protocolId?: 'MQTT' | 'MQIsdp';
    /**
     * 4
     */
    protocolVersion?: 4 | 5 | 3
    /**
     * true, set to false to receive QoS 1 and 2 messages while offline
     */
    clean?: boolean;
    /**
     *  10 seconds, set to 0 to disable
     */
    keepalive?: number;
    /**
     * the username required by your broker, if any
     */
    username?: string;
    /**
     * the password required by your broker, if any
     */
    password?: Buffer;

    /**
     * 1000 milliseconds, interval between two reconnections
     */
    reconnectPeriod?: number
    /**
     * 30 * 1000 milliseconds, time to wait before a CONNACK is received
     */
    connectTimeout?: number
    // /**
    //  * a Store for the incoming packets
    //  */
    // incomingStore?: Store
    // /**
    //  * a Store for the outgoing packets
    //  */
    // outgoingStore?: Store
    queueQoSZero?: boolean
    reschedulePings?: boolean
    servers?: Array<{
        host: string
        port: number
        protocol?: 'wss' | 'ws' | 'mqtt' | 'mqtts' | 'tcp' | 'ssl' | 'wx' | 'wxs'
    }>
    /**
     * true, set to false to disable re-subscribe functionality
     */
    resubscribe?: boolean;
}

export interface MqttTcpConnectOpts {
    protocol: 'tcp' | 'mqtt';
    options: net.TcpNetConnectOpts;
}

export interface MqttTlsConnectOpts {
    protocol: 'mqtts' | 'ssl' | 'tls';
    options: tls.ConnectionOptions;
}


export interface MqttWsConnectOpts {
    protocol: 'ws' | 'wss';
    url: string;
    options?: ws.ClientOptions;
}

@Abstract()
export abstract class MqttClientOpts extends TransportClientOpts {
    abstract connectOpts: MqttTcpConnectOpts | MqttTlsConnectOpts | MqttWsConnectOpts;
}

/**
 * Mqtt client interceptors.
 */
export const MQTT_INTERCEPTORS = tokenId<Interceptor<TransportRequest, TransportEvent>[]>('MQTT_INTERCEPTORS');

/**
 * Mqtt client interceptors.
 */
export const MQTT_EXECPTIONFILTERS = tokenId<ExecptionFilter[]>('MQTT_EXECPTIONFILTERS');

export type MqttReqOptions = PacketOptions & RequestOptions;

const defaults = {
    encoding: 'utf8',
    transport: {
        strategy: MqttIcomingUtil,
    },
    interceptorsToken: MQTT_INTERCEPTORS,
    execptionsToken: MQTT_EXECPTIONFILTERS,
    interceptors: [
        LogInterceptor
    ],
    connectOpts: {
        protocol: 'mqtt',
        options: {
            host: 'localhost',
            port: 1883
        }
    },
} as MqttClientOpts;

/**
 * mqtt client.
 */
@Injectable()
export class MqttClient extends TransportClient<MqttReqOptions, MqttClientOpts> {
    constructor(options: MqttClientOpts) {
        super(options)
    }

    protected override getDefaultOptions() {
        return defaults;
    }

    protected override createDuplex(opts: MqttClientOpts): Duplex {
        const connOpts = opts.connectOpts;
        switch (connOpts.protocol) {
            case 'mqtt':
            case 'tcp':
                if (!connOpts.options.port) {
                    connOpts.options.port = 1883;
                }
                return net.connect(connOpts.options);
            case 'mqtts':
            case 'tls':
                if (!connOpts.options.key || !connOpts.options.cert) {
                    throw new Execption('Missing secure protocol key')
                }
                if (!connOpts.options.port) {
                    connOpts.options.port = 8883;
                }
                return tls.connect(connOpts.options);
            case 'ws':
            case 'wss':
                return ws.createWebSocketStream(new ws.WebSocket(connOpts.url, connOpts.options));
            default:
                throw new Execption('Unknown protocol for secure connection: "' + (connOpts as any).protocol + '"!')
        }
    }

    
    protected createConnection(socket: Duplex, opts?: ConnectionOpts | undefined): Connection {
        const packet = this.context.get(MqttPacketFactory);
        const conn = new MqttConnection(socket, packet, opts);
        return conn
    }
    
    protected onConnect(duplex: Duplex, opts?: ConnectionOpts | undefined): Observable<Connection> {
        const logger = this.logger;
        const packetor = this.context.get(MqttPacketFactory);
        return new Observable((observer: Observer<Connection>) => {
            const client = new Connection(duplex, packetor, opts);
            if (opts?.keepalive) {
                client.setKeepAlive(true, opts.keepalive);
            }

            const onError = (err: Error) => {
                logger.error(err);
                observer.error(err);
            }
            const onClose = () => {
                client.end();
            };
            const onConnected = () => {
                observer.next(client);
            }
            client.on(ev.ERROR, onError);
            client.on(ev.CLOSE, onClose);
            client.on(ev.END, onClose);
            client.on(ev.CONNECT, onConnected);

            return () => {
                client.off(ev.ERROR, onError);
                client.off(ev.CLOSE, onClose);
                client.off(ev.END, onClose);
                client.off(ev.CONNECT, onConnected);
            }
        });
    }

}
