import { BaseTopicRequest, RequestCloneOpts, TopicRequestOptions, RequestInitOpts, Pattern } from '@tsdi/common';

export class RedisRequest<T = any> extends BaseTopicRequest<T, TopicRequestOptions> {
    constructor(
        topic: string,
        pattern: Pattern | null | undefined,
        init: RequestInitOpts<T, TopicRequestOptions>,
        _defaultMethod = ''
    ) {
        super(topic, pattern, init, _defaultMethod);
    }

    protected override getResponseTopic(topic: string): string {
        return `${topic}:response`;
    }

    clone(): RedisRequest<T>;
    clone<V>(update: RequestCloneOpts<V, TopicRequestOptions>): RedisRequest<V>;
    clone(update: RequestCloneOpts<T, TopicRequestOptions>): RedisRequest<T>;
    clone(update: RequestCloneOpts<any, TopicRequestOptions> = {}): RedisRequest<any> {
        const opts = this.cloneOpts(update);
        return new RedisRequest(update.topic ?? this.topic, this.pattern, opts);
    }
}
