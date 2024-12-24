import { BaseTopicRequest, TopicRequestOptions, RequestCloneOpts } from '@tsdi/common';

export class RedisRequest<T> extends BaseTopicRequest<T, TopicRequestOptions> {
    clone(): RedisRequest<T>;
    clone<V>(update: RequestCloneOpts<V, TopicRequestOptions>): RedisRequest<V>;
    clone(update: RequestCloneOpts<T, TopicRequestOptions>): RedisRequest<T>;
    clone(update: RequestCloneOpts<any, TopicRequestOptions> = {}): RedisRequest<any> {
        const init = this.cloneOpts(update);
        return new RedisRequest(update.topic ?? this.topic, this.pattern, init);
    }

}