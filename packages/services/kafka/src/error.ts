import { MessageExecption } from '@tsdi/common/transport';


export class InvalidKafkaClientTopicError extends MessageExecption {
    constructor(topic?: string) {
        super(
            `The client consumer did not subscribe to the corresponding reply topic (${topic}).`,
        );
    }
}
