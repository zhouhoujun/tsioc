import { TransportSession, MessageOutgoing, SendPacket } from '@tsdi/transport';
import { ReidsTransport } from '../transport';



/**
 * outgoing message.
 */
export class RedisOutgoing extends MessageOutgoing<ReidsTransport, number> {

    constructor(
        session: TransportSession<ReidsTransport>,
        id: number,
        topic: string) {
        super(session, id, topic);
    }

    override createSentPacket(): SendPacket {
        const topic = this.getReply(this.topic);
        return {
            packet: {
                id: this.id,
                topic,
                headers: this.getHeaders(),
            }
        }
    }

    getReply(topic: string) {
        return topic + '.reply';
    }

}
