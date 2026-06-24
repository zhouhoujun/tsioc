import { BaseTopicRequest, RequestCloneOpts, TopicRequestOptions, RequestInitOpts, Pattern } from '@tsdi/common';

export class NatsRequest<T = any> extends BaseTopicRequest<T, TopicRequestOptions> {
    constructor(
        topic: string,
        pattern: Pattern | null | undefined,
        init: RequestInitOpts<T, TopicRequestOptions>,
        _defaultMethod = ''
    ) {
        super(topic, pattern, init, _defaultMethod);
    }

    protected override getResponseTopic(topic: string): string {
        return `_INBOX.tsdi.${topic}`;
    }

    clone(): NatsRequest<T>;
    clone<V>(update: RequestCloneOpts<V, TopicRequestOptions>): NatsRequest<V>;
    clone(update: RequestCloneOpts<T, TopicRequestOptions>): NatsRequest<T>;
    clone(update: RequestCloneOpts<any, TopicRequestOptions> = {}): NatsRequest<any> {
        const opts = this.cloneOpts(update);
        return new NatsRequest(update.topic ?? this.topic, this.pattern, opts);
    }
}
