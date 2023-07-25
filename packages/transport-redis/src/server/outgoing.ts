import { TransportSession } from '@tsdi/core';
import { HeaderPacket } from '@tsdi/common';
import { MessageOutgoing } from '@tsdi/transport';
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

    override createSentPacket(): HeaderPacket {
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
