import { BaseTopicRequest, TopicRequestCloneOpts } from '@tsdi/common';

export class RedisRequest<T> extends BaseTopicRequest<T> {

    clone(): RedisRequest<T>;
    clone<V>(update: TopicRequestCloneOpts<V>): RedisRequest<V>;
    clone(update: TopicRequestCloneOpts<T>): RedisRequest<T>;
    clone(update: TopicRequestCloneOpts<any> = {}): RedisRequest<any> {
        const init = this.cloneOpts(update);
        return new RedisRequest(update.topic ?? this.topic, this.pattern, init);
    }

}