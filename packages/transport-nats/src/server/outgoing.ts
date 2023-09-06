import { TransportSession, MessageOutgoing, SendPacket } from '@tsdi/transport';
import { NatsConnection } from 'nats';



/**
 * outgoing message.
 */
export class NatsOutgoing extends MessageOutgoing<NatsConnection, number> {

    constructor(
        session: TransportSession<NatsConnection>,
        id: number,
        readonly url: string,
        replyTo: string) {
        super(session, id, url, replyTo);
    }

    override createSentPacket(): SendPacket {
        const url = this.replyTo ?? this.url;
        return {
            packet: {
                id: this.id,
                url,
                headers: this.getHeaders()
            }
        }
    }

}
