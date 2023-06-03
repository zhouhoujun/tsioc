import { Decoder, Encoder, Packet, TransportSession, TransportSessionFactory } from '@tsdi/core';
import { Injectable, Optional } from '@tsdi/ioc';
import { StreamAdapter, TopicTransportSession, ev } from '@tsdi/transport';
import { Channel } from 'amqplib';
import { Buffer } from 'buffer';
import { AmqpSessionOpts } from './options';


@Injectable()
export class AmqpTransportSessionFactory implements TransportSessionFactory<Channel> {

    constructor(
        private adapter: StreamAdapter,
        @Optional() private encoder: Encoder,
        @Optional() private decoder: Decoder) {

    }

    create(socket: Channel, opts: AmqpSessionOpts): TransportSession<Channel> {
        return new AmqpTransportSession(socket, this.adapter, opts.encoder ?? this.encoder, opts.decoder ?? this.decoder, opts);
    }

}


export class AmqpTransportSession extends TopicTransportSession<Channel, AmqpSessionOpts> {


    protected override bindMessageEvent(options: AmqpSessionOpts): void {
        const queue = options.serverSide ? options.queue ?? 'default' : options.replyQueue ?? options.queue + '.reply';
        this.socket.consume(queue, msg => {
            if (!msg) return;
            this.onData(
                queue,
                msg.content
            )
        }, this.options.consumeOpts);
    }

    protected writeBuffer(buffer: Buffer, packet: Packet) {
        const queue = this.options.serverSide ? this.options.replyQueue ?? this.options.queue + '.reply' : this.options.queue ?? 'default';
        this.socket.sendToQueue(
            queue,
            buffer,
            { correlationId: packet.id, ...this.options.publishOpts }
        )
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
