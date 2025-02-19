import { BaseTopicRequest, RequestCloneOpts, RequestInitOpts, TopicRequestOptions } from '@tsdi/common';

export class KafkaRequest<T> extends BaseTopicRequest<T, TopicRequestOptions> {

    clone(): KafkaRequest<T>;
    clone<V>(update: RequestCloneOpts<V, TopicRequestOptions>): KafkaRequest<V>;
    clone(update: RequestCloneOpts<T, TopicRequestOptions>): KafkaRequest<T>;
    clone(update: RequestCloneOpts<any, TopicRequestOptions> = {}): KafkaRequest<any> {
        const init = this.cloneOpts(update);
        return new KafkaRequest(update.topic ?? this.topic, this.pattern, init);
    }

    protected override getResponseTopic(topic: string, options: RequestInitOpts<T, TopicRequestOptions<any>>): string {
        return `${topic}.reply`
    }

}