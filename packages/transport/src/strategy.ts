import { TransportStrategy, TransportStrategyOpts } from '@tsdi/core';
import { Abstract, TypeOf } from '@tsdi/ioc';
import { Writable, Transform } from 'stream';
import { Connection, ConnectionOpts } from './connection';
import { SteamOptions, TransportStream } from './stream';

export interface StreamTransportStrategyOpts extends TransportStrategyOpts {
    strategy: TypeOf<StreamTransportStrategy>;
}


/**
 * stream transport strategy.
 */
@Abstract()
export abstract class StreamTransportStrategy extends TransportStrategy {
    /**
     * valid headers.
     * @param header 
     */
    abstract valid(header: string): boolean;
    /**
     * packet parser
     * @param connection create parse packet as stream for the own stream.
     * @param opts options of type {@link ConnectionOpts}.
     */
    abstract parser(connection: Connection, opts: ConnectionOpts): PacketParser;
    /**
     * packet generator
     * @param output the connection wirte output.
     * @param opts options of type {@link ConnectionOpts}.
     */
    abstract generator(output: Writable, opts: ConnectionOpts): PacketGenerator;

    /**
     * create parse packet as stream for the own stream.
     * @param stream create parser for the own stream. type of {@link TransportStream}.
     * @param opts options of type {@link SteamOptions}.
     */
    abstract streamParser(stream: TransportStream, opts: SteamOptions): StreamParser;
    /**
     * create packet generator for the own stream.
     * @param output 
     * @param packetId 
     * @param opts options of type {@link SteamOptions}.
     */
    abstract streamGenerator(output: Writable, packetId: number, opts: SteamOptions): StreamGenerator;
}

@Abstract()
export abstract class PacketParser extends Transform {
    abstract setOptions(opts: ConnectionOpts): void;
}

@Abstract()
export abstract class PacketGenerator extends Writable {
    abstract setOptions(opts: ConnectionOpts): void;
}

@Abstract()
export abstract class StreamParser extends Transform {
    abstract setOptions(opts: SteamOptions): void;
}

@Abstract()
export abstract class StreamGenerator extends Writable {
    abstract setOptions(opts: SteamOptions): void;
}


export interface Closeable {
    readonly closed?: boolean;
    close(...args: any[]): void;
}
