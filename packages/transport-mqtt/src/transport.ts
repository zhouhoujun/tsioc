import { Decoder, Encoder, Packet, TransportSession, TransportSessionFactory, TransportSessionOpts } from '@tsdi/core';
import { Injectable, Optional } from '@tsdi/ioc';
import { StreamAdapter, TopicTransportSession, ev } from '@tsdi/transport';
import { Client } from 'mqtt';
import { Buffer } from 'buffer';


@Injectable()
export class MqttTransportSessionFactory implements TransportSessionFactory<Client> {

    constructor(
        private streamAdapter: StreamAdapter,
        @Optional() private encoder: Encoder,
        @Optional() private decoder: Decoder) {

    }

    create(socket: Client, opts: TransportSessionOpts): TransportSession<Client> {
        return new MqttTransportSession(socket, this.streamAdapter, opts.encoder ?? this.encoder, opts.decoder ?? this.decoder, opts.delimiter, opts.serverSide);
    }

}

export interface TopicBuffer {
    topic: string;
    buffer: Buffer | null;
    contentLength: number | null;
    cachePkg: Map<number, Packet>;
}


export class MqttTransportSession extends TopicTransportSession<Client> {
    protected writeBuffer(buffer: Buffer, packet: Packet<any>) {
        this.socket.publish(packet.url!, buffer);
    }
    protected handleFailed(error: any): void {
        this.emit(ev.ERROR, error.message);
    }
    protected onSocket(name: string, event: (...args: any[]) => void): void {
        this.socket.on(name, event);
    }
    protected offSocket(name: string, event: (...args: any[]) => void): void {
        this.socket.off(name, event);
    }

}
