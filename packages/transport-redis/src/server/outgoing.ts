import { TransportSession, HeaderPacket } from '@tsdi/core';
import { ReidsTransport } from '../transport';
import { MessageOutgoing } from '@tsdi/platform-server-transport';



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

    override createHeaderPacket(): HeaderPacket {
        const topic = this.getReply(this.topic);
        return {
            id: this.id,
            topic,
            headers: this.getHeaders(),
        }
    }

    getReply(topic: string) {
        return topic + '.reply';
    }

}
