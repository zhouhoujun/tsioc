import { BaseTopicRequest, TopicRequestCloneOpts } from '@tsdi/common';

export class AmqpRequest<T> extends BaseTopicRequest<T> {

    clone(): AmqpRequest<T>;
    clone<V>(update: TopicRequestCloneOpts<V>): AmqpRequest<V>;
    clone(update: TopicRequestCloneOpts<T>): AmqpRequest<T>;
    clone(update: TopicRequestCloneOpts<any> = {}): AmqpRequest<any> {
        const init = this.cloneOpts(update);
        return new AmqpRequest(update.topic ?? this.topic, this.pattern, init);
    }

}