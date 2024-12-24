import { BaseTopicRequest, TopicRequestOptions, RequestCloneOpts } from '@tsdi/common';

export class AmqpRequest<T> extends BaseTopicRequest<T, TopicRequestOptions> {

    clone(): AmqpRequest<T>;
    clone<V>(update: RequestCloneOpts<V, TopicRequestOptions>): AmqpRequest<V>;
    clone(update: RequestCloneOpts<T, TopicRequestOptions>): AmqpRequest<T>;
    clone(update: RequestCloneOpts<any, TopicRequestOptions> = {}): AmqpRequest<any> {
        const init = this.cloneOpts(update);
        return new AmqpRequest(update.topic ?? this.topic, this.pattern, init);
    }

}