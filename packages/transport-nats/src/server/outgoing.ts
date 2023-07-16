import { OutgoingHeader, OutgoingHeaders, ResHeaders, Outgoing, TransportSession, HeaderPacket } from '@tsdi/core';
import { ArgumentExecption, isArray, isFunction, isString } from '@tsdi/ioc';
import { MessageOutgoing } from '@tsdi/platform-server-transport';
import { ev, hdr } from '@tsdi/transport';
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

    override createHeaderPacket(): HeaderPacket {
        const url = this.replyTo ?? this.url;
        return {
            id: this.id,
            url,
            headers: this.getHeaders()
        }
    }

}
