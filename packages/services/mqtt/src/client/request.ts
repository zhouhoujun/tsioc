import { BaseTopicRequest, TopicRequestCloneOpts } from '@tsdi/common';

export class MqttRequest<T> extends BaseTopicRequest<T> {

    clone(): MqttRequest<T>;
    clone<V>(update: TopicRequestCloneOpts<V>): MqttRequest<V>;
    clone(update: TopicRequestCloneOpts<T>): MqttRequest<T>;
    clone(update: TopicRequestCloneOpts<any> = {}): MqttRequest<any> {
        const init = this.cloneOpts(update);
        return new MqttRequest(update.topic ?? this.topic, this.pattern, init);
    }

}