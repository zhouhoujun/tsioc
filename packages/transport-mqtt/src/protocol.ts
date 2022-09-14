import { TransportStatus, IncomingMsg, ListenOpts, IncomingHeaders, Packet } from '@tsdi/core';
import { Injectable } from '@tsdi/ioc';
import { ConnectionOpts, ev, PacketGenerator, PacketParser, TransportProtocol } from '@tsdi/transport';
import { Duplex, TransformCallback } from 'stream';
import {
    Parser, parser, writeToStream,
    IConnectPacket, IConnackPacket, IPublishPacket, IPubackPacket, IPubrecPacket,
    IPubrelPacket, IPubcompPacket, ISubscribePacket, ISubackPacket, IUnsubscribePacket,
    IUnsubackPacket, IPingreqPacket, IPingrespPacket, IDisconnectPacket, IAuthPacket
} from 'mqtt-packet';

export interface AuthOptions extends Omit<IAuthPacket, 'cmd'> {
    cmd?: 'connect'
}

export interface ConnectOptions extends Omit<IConnectPacket, 'cmd'> {
    cmd?: 'connect'
}
export interface ConnackOptions extends Omit<IConnackPacket, 'cmd'> {
    cmd?: 'connack'
}
export interface PublishOptions extends Omit<IPublishPacket, 'cmd'> {
    cmd?: 'publish'
}
export interface PubackOptions extends Omit<IPubackPacket, 'cmd'> {
    cmd?: 'puback'
}

export interface PubrecOptions extends Omit<IPubrecPacket, 'cmd'> {
    cmd?: 'pubrec'
}
export interface PubrelOptions extends Omit<IPubrelPacket, 'cmd'> {
    cmd?: 'pubrel'
}

export interface PubcompOptions extends Omit<IPubcompPacket, 'cmd'> {
    cmd?: 'pubcomp'
}
export interface SubscribeOptions extends Omit<ISubscribePacket, 'cmd'> {
    cmd?: 'subscribe'
}
export interface SubackOptions extends Omit<ISubackPacket, 'cmd'> {
    cmd?: 'suback'
}

export interface UnsubscribeOptions extends Omit<IUnsubscribePacket, 'cmd'> {
    cmd?: 'unsubscribe'
}
export interface UnsubackOptions extends Omit<IUnsubackPacket, 'cmd'> {
    cmd?: 'unsuback'
}
export interface PubackOptions extends Omit<IPubackPacket, 'cmd'> {
    cmd?: 'puback'
}

export interface PubcompOptions extends Omit<IPubcompPacket, 'cmd'> {
    cmd?: 'pubcomp'
}
export interface PubrelOptions extends Omit<IPubrelPacket, 'cmd'> {
    cmd?: 'pubrel'
}
export interface PubrecOptions extends Omit<IPubrecPacket, 'cmd'> {
    cmd?: 'pubrec'
}

export interface PingreqOptions extends Omit<IPingreqPacket, 'cmd'> {
    cmd?: 'pingreq'
}

export interface PingrespOptions extends Omit<IPingrespPacket, 'cmd'> {
    cmd?: 'pingresp'
}

export interface DisconnectOptions extends Omit<IDisconnectPacket, 'cmd'> {
    cmd?: 'disconnect'
}

export declare type PacketOptions = ConnectOptions |
    PublishOptions |
    ConnackOptions |
    SubscribeOptions |
    SubackOptions |
    UnsubscribeOptions |
    UnsubackOptions |
    PubackOptions |
    PubcompOptions |
    PubrelOptions |
    PingreqOptions |
    PingrespOptions |
    DisconnectOptions |
    PubrecOptions |
    AuthOptions;


@Injectable()
export class MqttProtocol extends TransportProtocol {
    constructor() {
        super()
    }
    valid(header: string): boolean {
        throw new Error('Method not implemented.');
    }
    transform(opts: ConnectionOpts): PacketParser {
        return new MqttPacketParser(opts);
    }
    generate(stream: Duplex, opts: ConnectionOpts): PacketGenerator {
        return new MqttPacketGenerator(stream, opts);
    }
    get protocol(): string {
        throw new Error('Method not implemented.');
    }
    get status(): TransportStatus {
        throw new Error('Method not implemented.');
    }
    isAbsoluteUrl(url: string): boolean {
        throw new Error('Method not implemented.');
    }
    isUpdate(incoming: IncomingMsg): boolean {
        throw new Error('Method not implemented.');
    }
    isSecure(incoming: IncomingMsg): boolean {
        throw new Error('Method not implemented.');
    }
    parse(incoming: IncomingMsg, opts: ListenOpts, proxy?: boolean | undefined): URL {
        throw new Error('Method not implemented.');
    }
    match(protocol: string): boolean {
        throw new Error('Method not implemented.');
    }
    parsePacket(packet: any): Packet<IncomingHeaders> {
        throw new Error('Method not implemented.');
    }

}

export class MqttPacketParser extends PacketParser {

    private parser!: Parser;
    constructor(opts: ConnectionOpts) {
        super(opts);
        this.setOptions(opts);
    }

    override _transform(chunk: any, encoding: BufferEncoding, callback: TransformCallback): void {
        this.parser.parse(chunk);
        callback();
    }

    setOptions(opts: ConnectionOpts): void {
        this.parser = parser(opts);
        this.parser.on(ev.PACKET, (packet) => {
            this.push(packet)
        });
        this.parser.on(ev.ERROR, (...args: any[]) => this.emit(ev.ERROR, ...args));
    }

}

export class MqttPacketGenerator extends PacketGenerator {
    constructor(private output: Duplex, private opts: ConnectionOpts) {
        super(opts);
        this.setOptions(opts);
    }

    override _write(chunk: any, encoding: BufferEncoding, callback: (error?: Error | null | undefined) => void): void {
        try {
            writeToStream(chunk, this.output, this.opts)
            callback();
        } catch (err) {
            callback(err as Error);
        }
    }

    setOptions(opts: ConnectionOpts): void {
        this.opts = opts;
    }

}
