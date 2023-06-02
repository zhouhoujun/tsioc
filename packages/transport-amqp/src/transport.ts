import { Decoder, Encoder, Packet, TransportSession, TransportSessionFactory, TransportSessionOpts } from '@tsdi/core';
import { Injectable, Optional } from '@tsdi/ioc';
import { StreamAdapter, TopicTransportSession, ev } from '@tsdi/transport';
import { Channel } from 'amqplib';
import { Buffer } from 'buffer';


@Injectable()
export class AmqpTransportSessionFactory implements TransportSessionFactory<Channel> {

    constructor(
        private adapter: StreamAdapter,
        @Optional() private encoder: Encoder,
        @Optional() private decoder: Decoder) {

    }

    create(socket: Channel, opts: TransportSessionOpts): TransportSession<Channel> {
        return new AmqpTransportSession(socket, this.adapter, opts.encoder ?? this.encoder, opts.decoder ?? this.decoder, opts.delimiter);
    }

}


export class AmqpTransportSession extends TopicTransportSession<Channel> {

    protected writeBuffer(buffer: Buffer, packet: Packet) {
        this.socket.publish(packet.id, packet.url ?? packet.url!, buffer)
    }
    protected handleFailed(error: any): void {
        this.emit(ev.ERROR, error.message)
    }
    protected onSocket(name: string, event: (...args: any[]) => void): void {
        this.socket.on(name, event)
    }
    protected offSocket(name: string, event: (...args: any[]) => void): void {
        this.socket.off(name, event)
    }

}
