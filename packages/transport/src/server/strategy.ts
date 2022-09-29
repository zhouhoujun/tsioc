import { Endpoint, InterceptorType, TransportStrategy } from '@tsdi/core';
import { Abstract, Execption } from '@tsdi/ioc';
import { Writable, Readable, Duplex } from 'stream';
import { Observable } from 'rxjs';
import { Connection, ConnectionOpts } from '../connection';


@Abstract()
export abstract class ServerTransportStrategy extends TransportStrategy {
    /**
     * use interceptors.
     * @param interceptor 
     * @param order 
     * @returns 
     */
    abstract use(interceptor: InterceptorType<Writable, Readable>, order?: number): this;


    parseToDuplex(target: any, ...args: any[]): Duplex {
        throw new Execption('parse connection client to Duplex not implemented.')
    }

    abstract createConnection(duplex: Duplex, opts?: ConnectionOpts): Connection;

    abstract request(connection: Connection, endpoint: Endpoint): Observable<any>;
}

