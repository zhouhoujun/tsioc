import { Abstract, Injectable, tokenId } from '@tsdi/ioc';
import { ExecptionFilter, Interceptor } from '@tsdi/core';
import { LogInterceptor, TransportClient, TransportClientOpts, TransportEvent, TransportRequest } from '@tsdi/transport';
import { ClientSubscribeCallback, IClientOptions, IClientPublishOptions, IClientSubscribeOptions, ISubscriptionMap, PacketCallback } from 'mqtt';



@Abstract()
export abstract class MqttClientOptions extends TransportClientOpts {
    abstract url?: string;
    abstract connectOpts?: IClientOptions;
}

/**
 * Mqtt client interceptors.
 */
export const MQTT_INTERCEPTORS = tokenId<Interceptor<TransportRequest, TransportEvent>[]>('MQTT_INTERCEPTORS');

/**
 * Mqtt client interceptors.
 */
export const MQTT_EXECPTIONFILTERS = tokenId<ExecptionFilter[]>('MQTT_EXECPTIONFILTERS');

export interface MqttPacket {
    cmd: string;
    retain?: boolean;
    dup?: boolean;
    length?: number;
    topic?: string;
    payload?: any;
}

const defaults = {
    encoding: 'utf8',
    interceptorsToken: MQTT_INTERCEPTORS,
    execptionsToken: MQTT_EXECPTIONFILTERS,
    interceptors: [
        LogInterceptor
    ]
} as MqttClientOptions;

@Injectable()
export class MqttClient extends TransportClient<MqttPacket> {

    constructor(options: MqttClientOptions) {
        super(options)
    }

    protected override getDefaultOptions() {
        return defaults;
    }

    /**
     * publish - publish <message> to <topic>
     *
     * @param {String} topic - topic to publish to
     * @param {(String|Buffer)} message - message to publish
     *
     * @param {Object}    [opts] - publish options, includes:
     *   @param {Number}  [opts.qos] - qos level to publish on
     *   @param {Boolean} [opts.retain] - whether or not to retain the message
     *   @param {Function}[opts.cbStorePut] - function(){}
     *       called when message is put into `outgoingStore`
     *
     * @param {Function} [callback] - function(err){}
     *    called when publish succeeds or fails
     *
     * @returns {Client} this - for chaining
     * @api public
     *
     * @example client.publish('topic', 'message')
     * @example
     *     client.publish('topic', 'message', {qos: 1, retain: true})
     * @example client.publish('topic', 'message', console.log)
     */
    public publish(topic: string, message: string | Buffer, opts: IClientPublishOptions, callback?: PacketCallback): this;
    public publish(topic: string, message: string | Buffer, callback?: PacketCallback): this;
    publish(topic: string, message: string | Buffer, optOrCb?: IClientPublishOptions | PacketCallback, callback?: PacketCallback): this {

        return this;
    }

    /** 
     * subscribe - subscribe to <topic>
     *
     * @param {String, Array, Object} topic - topic(s) to subscribe to, supports objects in the form {'topic': qos}
     * @param {Object} [opts] - optional subscription options, includes:
     * @param  {Number} [opts.qos] - subscribe qos level
     * @param {Function} [callback] - function(err, granted){} where:
     *    {Error} err - subscription error (none at the moment!)
     *    {Array} granted - array of {topic: 't', qos: 0}
     * @returns {MqttClient} this - for chaining
     * @api public
     * @example client.subscribe('topic')
     * @example client.subscribe('topic', {qos: 1})
     * @example client.subscribe({'topic': 0, 'topic2': 1}, console.log)
     * @example client.subscribe('topic', console.log)
     */
    public subscribe(topic: string | string[], opts: IClientSubscribeOptions, callback?: ClientSubscribeCallback): this;
    public subscribe(topic: string | string[] | ISubscriptionMap, callback?: ClientSubscribeCallback): this;
    subscribe(topic: string | string[] | ISubscriptionMap, args?: IClientSubscribeOptions | ClientSubscribeCallback, callback?: ClientSubscribeCallback): this {
        return this;
    }

    /**
     * unsubscribe - unsubscribe from topic(s)
     *
     * @param {String, Array} topic - topics to unsubscribe from
     * @param {Object} opts - opts of unsubscribe
     * @param {Function} [callback] - callback fired on unsuback
     * @returns {MqttClient} this - for chaining
     * @api public
     * @example client.unsubscribe('topic')
     * @example client.unsubscribe('topic', console.log)
     * @example client.unsubscribe('topic', opts, console.log)
     */
    public unsubscribe(topic: string | string[], opts?: Object, callback?: PacketCallback): this {
        return this;
    }
}
