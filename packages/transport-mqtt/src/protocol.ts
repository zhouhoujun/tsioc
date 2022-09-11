import { TransportStatus, IncomingPacket, ListenOpts } from '@tsdi/core';
import { Injectable } from '@tsdi/ioc';
import { ConnectionOpts, PacketGenerator, PacketParser, TransportProtocol } from '@tsdi/transport';
import { Duplex } from 'stream';

@Injectable()
export class MqttProtocol extends TransportProtocol {
    valid(header: string): boolean {
        throw new Error('Method not implemented.');
    }
    transform(opts: ConnectionOpts): PacketParser {
        throw new Error('Method not implemented.');
    }
    generate(stream: Duplex, opts: ConnectionOpts): PacketGenerator {
        throw new Error('Method not implemented.');
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
    isUpdate(incoming: IncomingPacket): boolean {
        throw new Error('Method not implemented.');
    }
    isSecure(incoming: IncomingPacket): boolean {
        throw new Error('Method not implemented.');
    }
    parse(incoming: IncomingPacket, opts: ListenOpts, proxy?: boolean | undefined): URL {
        throw new Error('Method not implemented.');
    }
    match(protocol: string): boolean {
        throw new Error('Method not implemented.');
    }

}