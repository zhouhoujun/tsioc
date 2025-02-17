import { BaseTopicRequest, RequestCloneOpts, RequestInitOpts } from '@tsdi/common';
import { MqttReqOptions } from './options';
import { IClientPublishOptions } from 'mqtt';

export class MqttRequest<T> extends BaseTopicRequest<T, MqttReqOptions> {

    protected override getResponseTopic(topic: string, options: RequestInitOpts<any, MqttReqOptions>): string {
        return options.properties?.responseTopic ?? super.getResponseTopic(topic, options);
    }


    override getExtentOptions(): IClientPublishOptions {
        const { qos, dup, retain, properties } = this.initOptions;
        return {
            qos,
            dup,
            retain,
            properties
        }
    }

    clone(): MqttRequest<T>;
    clone<V>(update: RequestCloneOpts<V, MqttReqOptions>): MqttRequest<V>;
    clone(update: RequestCloneOpts<T, MqttReqOptions>): MqttRequest<T>;
    clone(update: RequestCloneOpts<any, MqttReqOptions> = {}): MqttRequest<any> {
        const init = { ...this.getExtentOptions(), ... this.cloneOpts(update) };
        return new MqttRequest(update.topic ?? this.topic, this.pattern, init);
    }

}