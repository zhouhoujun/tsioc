import { MessageExecption } from '@tsdi/common';


export class InvalidKafkaClientTopicError extends MessageExecption {
    constructor(topic?: string) {
        super(
            `The client consumer did not subscribe to the corresponding reply topic (${topic}).`,
        );
    }
}
