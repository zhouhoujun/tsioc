import { Endpoint, Transformer, TransportStrategy } from '@tsdi/core';
import { Abstract, Execption } from '@tsdi/ioc';
import { Duplex } from 'stream';
import { Observable } from 'rxjs';
import { Connection, ConnectionOpts } from '../connection';


@Abstract()
export abstract class ServerTransformor extends Transformer {

    parseToDuplex(target: any, ...args: any[]): Duplex {
        throw new Execption('parse connection client to Duplex not implemented.')
    }

    abstract createConnection(duplex: Duplex, opts?: ConnectionOpts): Connection;

    abstract request(connection: Connection, endpoint: Endpoint): Observable<any>;
}


@Abstract()
export abstract class ServerTransportStrategy extends TransportStrategy {

    abstract get transformer(): ServerTransformor;
}
