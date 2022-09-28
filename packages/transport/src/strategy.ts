import { TransportStrategy } from '@tsdi/core';
import { Abstract } from '@tsdi/ioc';
import { Observable } from 'rxjs';
import { Writable, Transform } from 'stream';
import { Connection, ConnectionOpts } from './connection';
import { SteamOptions, TransportStream } from './stream';


/**
 * stream transport strategy.
 */
@Abstract()
export abstract class StreamTransportStrategy extends TransportStrategy {
    abstract transform(connection: Connection): Observable<any>;
    // /**
    //  * valid headers.
    //  * @param header 
    //  */
    // abstract valid(header: string): boolean;
    // /**
    //  * packet parser
    //  * @param connection create parse packet as stream for the own stream.
    //  * @param opts options of type {@link ConnectionOpts}.
    //  */
    // abstract parser(connection: Connection, opts: ConnectionOpts): PacketParser;
    // /**
    //  * packet generator
    //  * @param output the connection wirte output.
    //  * @param opts options of type {@link ConnectionOpts}.
    //  */
    // abstract generator(output: Writable, opts: ConnectionOpts): PacketGenerator;

    // /**
    //  * create parse packet as stream for the own stream.
    //  * @param stream create parser for the own stream. type of {@link TransportStream}.
    //  * @param opts options of type {@link SteamOptions}.
    //  */
    // abstract streamParser(stream: TransportStream, opts: SteamOptions): StreamParser;
    // /**
    //  * create packet generator for the own stream.
    //  * @param output 
    //  * @param packetId 
    //  * @param opts options of type {@link SteamOptions}.
    //  */
    // abstract streamGenerator(output: Writable, packetId: number, opts: SteamOptions): StreamGenerator;
}
