import { Injectable } from '@tsdi/ioc';
import { Incoming, ListenOpts, States, TransportStrategy } from '@tsdi/core';
import { ConnectionOpts, ev, PacketGenerator, PacketParser, Packetor } from '@tsdi/transport';
import { TransformCallback, Writable } from 'stream';
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
export class MqttTransportStrategy extends TransportStrategy {

    private _protocol = 'mqtt';


    isValidCode(code: string | number): boolean {
        throw new Error('Method not implemented.');
    }
    parseCode(code?: string | number | null | undefined): string | number {
        throw new Error('Method not implemented.');
    }
    fromCode(status: string | number): States {
        throw new Error('Method not implemented.');
    }
    toCode(state: States): string | number {
        throw new Error('Method not implemented.');
    }
    isEmpty(code: string | number): boolean {
        throw new Error('Method not implemented.');
    }
    message(code: string | number): string {
        throw new Error('Method not implemented.');
    }

    valid(header: string): boolean {
        throw new Error('Method not implemented.');
    }

    get protocol(): string {
        return this._protocol;
    }

    isAbsoluteUrl(url: string): boolean {
        throw new Error('Method not implemented.');
    }
    isUpdate(incoming: Incoming): boolean {
        throw new Error('Method not implemented.');
    }
    isSecure(incoming: Incoming): boolean {
        throw new Error('Method not implemented.');
    }
    parseURL(incoming: Incoming, opts: ListenOpts, proxy?: boolean | undefined): URL {
        throw new Error('Method not implemented.');
    }
    match(protocol: string): boolean {
        throw new Error('Method not implemented.');
    }
}

@Injectable()
export class MqttPacketor implements Packetor {
    generator(output: Writable, opts: ConnectionOpts): PacketGenerator {
        return new MqttPacketGenerator(output, opts);
    }

    parser(opts: ConnectionOpts): PacketParser {
        return new MqttPacketParser(opts);
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
    constructor(private output: Writable, private opts: ConnectionOpts) {
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
