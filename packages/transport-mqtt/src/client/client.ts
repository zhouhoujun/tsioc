import { Abstract, Injectable, tokenId } from '@tsdi/ioc';
import { ExecptionFilter, Interceptor } from '@tsdi/core';
import { IClientOptions } from 'mqtt';
import { LogInterceptor, TransportClient, TransportClientOpts, TransportEvent, TransportRequest } from '@tsdi/transport';



@Abstract()
export abstract class MqttClientOptions extends TransportClientOpts {
    abstract url?: string;
    abstract options?: IClientOptions
}

/**
 * Mqtt client interceptors.
 */
export const MQTT_INTERCEPTORS = tokenId<Interceptor<TransportRequest, TransportEvent>[]>('MQTT_INTERCEPTORS');

/**
 * Mqtt client interceptors.
 */
export const MQTT_EXECPTIONFILTERS = tokenId<ExecptionFilter[]>('MQTT_EXECPTIONFILTERS');


const defaults = {
    encoding: 'utf8',
    interceptorsToken: MQTT_INTERCEPTORS,
    execptionsToken: MQTT_EXECPTIONFILTERS,
    interceptors: [
        LogInterceptor
    ]
} as MqttClientOptions;

@Injectable()
export class MqttClient extends TransportClient {

    constructor(options: MqttClientOptions) {
        super(options)
    }

    protected override getDefaultOptions() {
        return defaults;
    }
}
