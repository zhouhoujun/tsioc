import { Abstract, Injectable, tokenId } from '@tsdi/ioc';
import { ExecptionFilter, Interceptor, RequestOptions, TransportEvent, TransportRequest } from '@tsdi/core';
import { ClientConnection, LogInterceptor, RequestStrategy, TransportClient, TransportClientOpts } from '@tsdi/transport';
import * as mqtt from 'mqtt';
import { MqttProtocol } from '../protocol';
import { Duplex } from 'form-data';



@Abstract()
export abstract class MqttClientOptions extends TransportClientOpts {
    abstract url?: string;
    abstract connectOpts?: mqtt.IClientOptions;
}

/**
 * Mqtt client interceptors.
 */
export const MQTT_INTERCEPTORS = tokenId<Interceptor<TransportRequest, TransportEvent>[]>('MQTT_INTERCEPTORS');

/**
 * Mqtt client interceptors.
 */
export const MQTT_EXECPTIONFILTERS = tokenId<ExecptionFilter[]>('MQTT_EXECPTIONFILTERS');

export interface MqttPacket extends RequestOptions {
    // cmd: string;
    retain?: boolean;
    dup?: boolean;
    length?: number;
    topic?: string;
    payload?: any;
}

const defaults = {
    encoding: 'utf8',
    transport: MqttProtocol,
    interceptorsToken: MQTT_INTERCEPTORS,
    execptionsToken: MQTT_EXECPTIONFILTERS,
    interceptors: [
        LogInterceptor
    ]
} as MqttClientOptions;

/**
 * mqtt client.
 */
@Injectable()
export class MqttClient extends TransportClient<MqttPacket> {
    constructor(options: MqttClientOptions) {
        super(options)
    }

    protected override getDefaultOptions() {
        return defaults;
    }

    protected override createDuplex(opts: TransportClientOpts): Duplex {
        throw new Error('Method not implemented.');
    }

}
