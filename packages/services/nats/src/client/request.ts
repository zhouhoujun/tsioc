import { BaseTopicRequest, TopicRequestOptions, RequestCloneOpts, RequestInitOpts } from '@tsdi/common';

export class NatsRequest<T> extends BaseTopicRequest<T, TopicRequestOptions> {

    clone(): NatsRequest<T>;
    clone<V>(update: RequestCloneOpts<V, TopicRequestOptions>): NatsRequest<V>;
    clone(update: RequestCloneOpts<T, TopicRequestOptions>): NatsRequest<T>;
    clone(update: RequestCloneOpts<any, TopicRequestOptions> = {}): NatsRequest<any> {
        const init = this.cloneOpts(update);
        return new NatsRequest(update.topic ?? this.topic, this.pattern, init);
    }

    protected override getResponseTopic(topic: string, options: RequestInitOpts<T, TopicRequestOptions<any>>): string {
        return `${topic}.reply`
    }

}