import { ExecptionFilter, Interceptor } from '@tsdi/core';
import { Abstract, Injectable, tokenId, TypeOf } from '@tsdi/ioc';
import { IClientOptions } from 'mqtt';
import { CatchInterceptor, LogInterceptor, TransportServer, TransportServerOpts, RespondInterceptor, TransportEvent, TransportRequest } from '@tsdi/transport';


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
export class MqttServer extends TransportServer {

    constructor(options: MqttServerOpts) {
        super(options);
    }

    protected override getDefaultOptions() {
        return defaults
    }
}
