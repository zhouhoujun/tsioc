import { TransportSession, HeaderPacket } from '@tsdi/core';
import { MessageOutgoing } from '@tsdi/platform-server-transport';
import { KafkaTransport } from '../const';


/**
 * outgoing message.
 */
export class KafkaOutgoing extends MessageOutgoing<KafkaTransport, number> {

    constructor(
        session: TransportSession<KafkaTransport>,
        id: number,
        topic: string,
        readonly replyTopic: string,
        readonly replyPartition: string) {
        super(session, id, topic, replyTopic);
    }


    override createSentPacket(): HeaderPacket {
        const topic = this.replyTopic ?? this.getReply(this.topic);
        return {
            id: this.id,
            topic,
            headers: this.getHeaders(),
            partition: this.replyPartition
        } as HeaderPacket;
    }

    getReply(topic: string) {
        return topic + '.reply';
    }


}
