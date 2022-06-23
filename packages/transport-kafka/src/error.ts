import { TransportError } from '@tsdi/core';


export class InvalidKafkaClientTopicError extends TransportError {
    constructor(topic?: string) {
        super(
            `The client consumer did not subscribe to the corresponding reply topic (${topic}).`,
        );
    }
}
