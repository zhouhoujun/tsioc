import { BaseTopicRequest, RequestCloneOpts, TopicRequestOptions, RequestInitOpts, Pattern } from '@tsdi/common';

export class MqttRequest<T = any> extends BaseTopicRequest<T, TopicRequestOptions> {


    constructor(
        topic: string,
        pattern: Pattern | null | undefined,
        init: RequestInitOpts<T, TopicRequestOptions>,
        defaultMethod = ''
    ) {
        super(topic, pattern, init, defaultMethod);
    }

    protected override getResponseTopic(topic: string): string {
        return `${topic}/response`;
    }

    clone(): MqttRequest<T>;
    clone<V>(update: RequestCloneOpts<V, TopicRequestOptions>): MqttRequest<V>;
    clone(update: RequestCloneOpts<T, TopicRequestOptions>): MqttRequest<T>;
    clone(update: RequestCloneOpts<any, TopicRequestOptions> = {}): MqttRequest<any> {
        const opts = this.cloneOpts(update);
        return new MqttRequest(update.topic ?? this.topic, this.pattern, opts);
    }
}
