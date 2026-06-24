import { BaseTopicRequest, RequestCloneOpts, TopicRequestOptions, RequestInitOpts, Pattern } from '@tsdi/common';

export class AmqpRequest<T = any> extends BaseTopicRequest<T, TopicRequestOptions> {
    constructor(
        topic: string,
        pattern: Pattern | null | undefined,
        init: RequestInitOpts<T, TopicRequestOptions>,
        _defaultMethod = ''
    ) {
        super(topic, pattern, init, _defaultMethod);
    }

    protected override getResponseTopic(topic: string): string {
        return `${topic}.response`;
    }

    clone(): AmqpRequest<T>;
    clone<V>(update: RequestCloneOpts<V, TopicRequestOptions>): AmqpRequest<V>;
    clone(update: RequestCloneOpts<T, TopicRequestOptions>): AmqpRequest<T>;
    clone(update: RequestCloneOpts<any, TopicRequestOptions> = {}): AmqpRequest<any> {
        const opts = this.cloneOpts(update);
        return new AmqpRequest(update.topic ?? this.topic, this.pattern, opts);
    }
}
