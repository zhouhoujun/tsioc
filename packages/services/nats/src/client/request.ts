import { BaseTopicRequest, TopicRequestCloneOpts } from '@tsdi/common';

export class NatsRequest<T> extends BaseTopicRequest<T> {

    clone(): NatsRequest<T>;
    clone<V>(update: TopicRequestCloneOpts<V>): NatsRequest<V>;
    clone(update: TopicRequestCloneOpts<T>): NatsRequest<T>;
    clone(update: TopicRequestCloneOpts<any> = {}): NatsRequest<any> {
        const init = this.cloneOpts(update);
        return new NatsRequest(update.topic ?? this.topic, this.pattern, init);
    }

}