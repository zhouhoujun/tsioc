import { TransportSession, MessageOutgoing, SendPacket } from '@tsdi/transport';
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


    override createSentPacket(): SendPacket {
        const topic = this.replyTopic ?? this.getReply(this.topic);
        return {
            packet: {
                id: this.id,
                topic,
                headers: this.getHeaders()
            },
            partition: this.replyPartition
        } as SendPacket;
    }

    getReply(topic: string) {
        return topic + '.reply';
    }


}
