import { MessageException } from '@tsdi/transport';


export class InvalidKafkaClientTopicError extends MessageException {
    constructor(topic?: string) {
        super(
            `The client consumer did not subscribe to the corresponding reply topic (${topic}).`,
        );
    }
}
