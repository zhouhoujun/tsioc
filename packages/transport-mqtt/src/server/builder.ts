import { Server, ConnectionContext, IncomingHeaders, Endpoint, ListenOpts } from '@tsdi/core';
import { InvocationContext } from '@tsdi/ioc';
import { Connection, PacketProtocol, ServerBuilder, ServerSession, ServerStream, TransportContext, TransportServer, TransportServerOpts } from '@tsdi/transport';
import { Duplex, DuplexOptions } from 'stream';
import { writeToStream } from 'mqtt-packet';
import { Observable } from 'rxjs';
import { MqttServerOpts } from './server';


// export class MqttStream extends ServerStream {

//     constructor(duplex: Duplex, opts?: DuplexOptions) {
//         super(duplex, opts);


//     }

// }


export class MqttServeBuilder extends ServerBuilder<TransportServer> {
    protected buildServer(opts: TransportServerOpts<any>): Promise<TransportServer> {
        throw new Error('Method not implemented.');
    }
    protected listen(server: TransportServer, opts: ListenOpts): Promise<void> {
        throw new Error('Method not implemented.');
    }
    protected getParser(context: InvocationContext<any>, opts: TransportServerOpts<any>): PacketProtocol {
        throw new Error('Method not implemented.');
    }
    protected connect(server: TransportServer, parser: PacketProtocol, opts?: any): Observable<Connection> {
        throw new Error('Method not implemented.');
    }
    protected handle(context: TransportContext, endpoint: Endpoint<any, any>): void {
        throw new Error('Method not implemented.');
    }

}
