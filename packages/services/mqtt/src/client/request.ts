import { BaseTopicRequest, RequestInitOpts, TopicRequestCloneOpts, TopicRequestInitOpts } from '@tsdi/common';
import { MqttReqOptions } from './options';

export class MqttRequest<T> extends BaseTopicRequest<T> {

    protected override getResponseTopic(topic: string, options: MqttReqOptions & RequestInitOpts): string {
        return options.properties?.responseTopic ?? super.getResponseTopic(topic, options);
    }


    clone(): MqttRequest<T>;
    clone<V>(update: TopicRequestCloneOpts<V>): MqttRequest<V>;
    clone(update: TopicRequestCloneOpts<T>): MqttRequest<T>;
    clone(update: TopicRequestCloneOpts<any> = {}): MqttRequest<any> {
        const init = this.cloneOpts(update) as TopicRequestInitOpts;
        return new MqttRequest(update.topic ?? this.topic, this.pattern, init);
    }

}