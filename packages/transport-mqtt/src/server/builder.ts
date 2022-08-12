import { ListenOpts, PacketParser, ServerBuilder, ServerSession, ServerStream, TransportContext, TransportServer, TransportServerOpts } from '@tsdi/transport';
import { Duplex, DuplexOptions } from 'stream';
import { writeToStream } from 'mqtt-packet';
import { Server, ConnectionContext, IncomingHeaders, Endpoint } from '@tsdi/core';
import { InvocationContext } from '@tsdi/ioc';
import { Observable } from 'rxjs';
import { MqttServerOpts } from './server';


// export class MqttStream extends ServerStream {

//     constructor(duplex: Duplex, opts?: DuplexOptions) {
//         super(duplex, opts);


//     }

// }


export class MqttServeBuilder extends ServerBuilder<TransportServer> {
    buildServer(opts: MqttServerOpts): Promise<any> {
        throw new Error('Method not implemented.');
    }
    listen(server: any, opts: ListenOpts): Promise<void> {
        throw new Error('Method not implemented.');
    }
    getParser(context: InvocationContext<any>, opts: MqttServerOpts): PacketParser {
        throw new Error('Method not implemented.');
    }
    buildContext(server: TransportServer, stream: ServerStream, headers: IncomingHeaders): TransportContext {
        throw new Error('Method not implemented.');
    }
    connect(server: any, parser: PacketParser, opts?: any): Observable<ServerSession> {
        throw new Error('Method not implemented.');
    }
    handle(context: TransportContext, endpoint: Endpoint<any, any>): void {
        throw new Error('Method not implemented.');
    }


}
