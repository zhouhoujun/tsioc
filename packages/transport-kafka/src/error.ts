import { MessageExecption } from '@tsdi/core';


export class InvalidKafkaClientTopicError extends MessageExecption {
    constructor(topic?: string) {
        super(
            `The client consumer did not subscribe to the corresponding reply topic (${topic}).`,
        );
    }
}
