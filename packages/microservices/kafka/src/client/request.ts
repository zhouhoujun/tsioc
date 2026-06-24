import { BaseTopicRequest, RequestCloneOpts, TopicRequestOptions, RequestInitOpts, Pattern } from '@tsdi/common';

export class KafkaRequest<T = any> extends BaseTopicRequest<T, TopicRequestOptions> {
    constructor(topic: string, pattern: Pattern | null | undefined, init: RequestInitOpts<T, TopicRequestOptions>, _defaultMethod = '') {
        super(topic, pattern, init, _defaultMethod);
    }

    protected override getResponseTopic(topic: string): string {
        return `${topic}.response`;
    }

    clone(): KafkaRequest<T>;
    clone<V>(update: RequestCloneOpts<V, TopicRequestOptions>): KafkaRequest<V>;
    clone(update: RequestCloneOpts<T, TopicRequestOptions>): KafkaRequest<T>;
    clone(update: RequestCloneOpts<any, TopicRequestOptions> = {}): KafkaRequest<any> {
        const opts = this.cloneOpts(update);
        return new KafkaRequest(update.topic ?? this.topic, this.pattern, opts);
    }
}
