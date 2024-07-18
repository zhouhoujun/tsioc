import { BaseTopicRequest, TopicRequestCloneOpts } from '@tsdi/common';

export class KafkaRequest<T> extends BaseTopicRequest<T> {

    clone(): KafkaRequest<T>;
    clone<V>(update: TopicRequestCloneOpts<V>): KafkaRequest<V>;
    clone(update: TopicRequestCloneOpts<T>): KafkaRequest<T>;
    clone(update: TopicRequestCloneOpts<any> = {}): KafkaRequest<any> {
        const init = this.cloneOpts(update);
        return new KafkaRequest(update.topic ?? this.topic, this.pattern, init);
    }

}