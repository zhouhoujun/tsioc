import { ExecptionFilter, Interceptor, ListenOpts, MiddlewareLike, TransportEvent, TransportRequest } from '@tsdi/core';
import { Abstract, Execption, Injectable, lang, tokenId, TypeOf } from '@tsdi/ioc';
import { CatchInterceptor, LogInterceptor, TransportServer, TransportServerOpts, RespondInterceptor, ConnectionOpts, ServerConnection, StreamTransportStrategy } from '@tsdi/transport';
import { Duplex } from 'stream';
import * as net from 'net';
import * as tls from 'tls';
import * as ws from 'ws';
import { MqttConnection } from './connection';



export interface MqttTcpServerOpts {
    protocol: 'tcp' | 'mqtt';
    options: net.ServerOpts;
}

export interface MqttTlsServerOpts {
    protocol: 'mqtts' | 'ssl' | 'tls';
    options: tls.TlsOptions;
}


export interface MqttWsServerOpts {
    protocol: 'ws' | 'wss';
    options: ws.ServerOptions;
}

@Abstract()
export abstract class MqttServerOpts extends TransportServerOpts {
    abstract serverOpts: MqttTcpServerOpts | MqttTlsServerOpts | MqttWsServerOpts;
}

/**
 * Mqtt server interceptors.
 */
export const MQTT_SERV_INTERCEPTORS = tokenId<Interceptor<TransportRequest, TransportEvent>[]>('MQTT_SERV_INTERCEPTORS');

/**
 * Mqtt server interceptors.
 */
export const MQTT_SERV_EXECPTIONFILTERS = tokenId<ExecptionFilter[]>('MQTT_SERV_EXECPTIONFILTERS');


/**
 * Mqtt server middlewares.
 */
 export const MQTT_MIDDLEWARES = tokenId<MiddlewareLike[]>('MQTT_MIDDLEWARES');


const defaults = {
    json: true,
    encoding: 'utf8',
    serverOpts: {
        protocol: 'mqtt',
        options: {}
    },
    interceptorsToken: MQTT_SERV_INTERCEPTORS,
    execptionsToken: MQTT_SERV_EXECPTIONFILTERS,
    middlewaresToken: MQTT_MIDDLEWARES,
    interceptors: [
        LogInterceptor,
        CatchInterceptor,
        RespondInterceptor
    ],
    listenOpts: {
        host: 'localhost'
    }
} as MqttServerOpts;


@Injectable()
export class MqttServer extends TransportServer<net.Server | tls.Server | ws.Server, MqttServerOpts> {

    constructor(options: MqttServerOpts) {
        super(options);
    }

    protected override getDefaultOptions() {
        return defaults
    }


    protected buildServer(opts: MqttServerOpts): net.Server | tls.Server | ws.Server<ws.WebSocket> {
        const servOpts = opts.serverOpts;
        switch (servOpts.protocol) {
            case 'mqtt':
            case 'tcp':
                if (!opts.listenOpts.port) {
                    opts.listenOpts.port = 1883;
                }
                return new net.Server(servOpts.options);
            case 'mqtts':
            case 'tls':
                if (!servOpts.options.key || !servOpts.options.cert) {
                    throw new Execption('Missing secure protocol key')
                }
                if (!opts.listenOpts.port) {
                    opts.listenOpts.port = 8883;
                }
                return new tls.Server(servOpts.options);
            case 'ws':
            case 'wss':
                if (!opts.listenOpts.port) {
                    opts.listenOpts.port = servOpts.protocol == 'ws' ? 80 : 443;
                }
                return new ws.Server(servOpts.options);
            default:
                throw new Execption('Unknown protocol for secure connection: "' + (servOpts as any).protocol + '"!')
        }
    }

    protected override parseToDuplex(conn: ws.WebSocket, ...args: any[]): Duplex {
        return ws.createWebSocketStream(conn, { objectMode: true });
    }

    protected override createConnection(duplex: Duplex, transport: StreamTransportStrategy, opts?: ConnectionOpts | undefined): ServerConnection {
        return new MqttConnection(duplex, transport, opts);
    }

    protected listen(server: net.Server | tls.Server | ws.Server<ws.WebSocket>, opts: ListenOpts): Promise<void> {
        const defer = lang.defer<void>();
        if (server instanceof ws.Server) {
            const sropts = this.getOptions().serverOpts as ws.ServerOptions;
            if (sropts.server) {
                if (!sropts.server.listening) {
                    // sropts.server.once(ev.LISTENING, defer.resolve);
                    sropts.server.listen(opts, defer.resolve);
                } else {
                    defer.resolve();
                }
            } else {
                // server
                defer.resolve();
            }
        } else {
            server.listen(opts, defer.resolve);
        }
        return defer.promise;
    }
}
