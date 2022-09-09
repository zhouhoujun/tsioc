import { ExecptionFilter, Interceptor, ListenOpts, TransportEvent, TransportRequest } from '@tsdi/core';
import { Abstract, Injectable, tokenId, TypeOf } from '@tsdi/ioc';
import { CatchInterceptor, LogInterceptor, TransportServer, TransportServerOpts, RespondInterceptor, Connection, ConnectionOpts, TransportProtocol } from '@tsdi/transport';
import * as net from 'net';
import { Observable } from 'rxjs';
import * as tls from 'tls';
import * as ws from 'ws';



@Abstract()
export abstract class MqttServerOpts extends TransportServerOpts {

}

/**
 * Mqtt server interceptors.
 */
export const MQTT_SERV_INTERCEPTORS = tokenId<Interceptor<TransportRequest, TransportEvent>[]>('MQTT_SERV_INTERCEPTORS');

/**
 * Mqtt server interceptors.
 */
export const MQTT_SERV_EXECPTIONFILTERS = tokenId<ExecptionFilter[]>('MQTT_SERV_EXECPTIONFILTERS');

const defaults = {
    json: true,
    encoding: 'utf8',

    interceptorsToken: MQTT_SERV_INTERCEPTORS,
    execptionsToken: MQTT_SERV_EXECPTIONFILTERS,
    interceptors: [
        LogInterceptor,
        CatchInterceptor,
        RespondInterceptor
    ],
    listenOpts: {
        port: 1883,
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
        throw new Error('Method not implemented.');
    }
    
    protected connect(server: net.Server | tls.Server | ws.Server<ws.WebSocket>, parser: TransportProtocol, opts?: ConnectionOpts | undefined): Observable<Connection> {
        throw new Error('Method not implemented.');
    }

    protected listen(server: net.Server | tls.Server | ws.Server<ws.WebSocket>, opts: ListenOpts): Promise<void> {
        throw new Error('Method not implemented.');
    }
}
