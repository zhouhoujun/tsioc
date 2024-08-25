import { BaseTopicRequest, TopicRequestCloneOpts, TopicRequestInitOpts } from '@tsdi/common';

export class MqttRequest<T> extends BaseTopicRequest<T> {

    clone(): MqttRequest<T>;
    clone<V>(update: TopicRequestCloneOpts<V>): MqttRequest<V>;
    clone(update: TopicRequestCloneOpts<T>): MqttRequest<T>;
    clone(update: TopicRequestCloneOpts<any> = {}): MqttRequest<any> {
        const init = this.cloneOpts(update) as TopicRequestInitOpts;
        return new MqttRequest(update.topic ?? this.topic, this.pattern, init.responseTopic, init);
    }

}