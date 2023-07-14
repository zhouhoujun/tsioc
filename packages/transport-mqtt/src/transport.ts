import { Decoder, Encoder, StreamAdapter, Packet, TransportSession, TransportSessionFactory, TransportSessionOpts, HeaderPacket, IReadableStream, SendOpts } from '@tsdi/core';
import { Abstract, Injectable, Optional } from '@tsdi/ioc';
import { TopicTransportSession, ev } from '@tsdi/transport';
import { Client } from 'mqtt';
import { Buffer } from 'buffer';



@Abstract()
export abstract class MqttTransportSessionFactory extends TransportSessionFactory<Client> {

}

@Injectable()
export class MqttTransportSessionFactoryImpl implements MqttTransportSessionFactory {

    constructor(
        private streamAdapter: StreamAdapter,
        @Optional() private encoder: Encoder,
        @Optional() private decoder: Decoder) {

    }

    create(socket: Client, opts: TransportSessionOpts): TransportSession<Client> {
        return new MqttTransportSession(socket, this.streamAdapter, opts.encoder ?? this.encoder, opts.decoder ?? this.decoder, opts);
    }

}
export class MqttTransportSession extends TopicTransportSession<Client> {
    write(chunk: Buffer, packet: HeaderPacket, callback?: ((err?: any) => void) | undefined): void {
        this.socket.publish(packet.url!, chunk, callback);
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
