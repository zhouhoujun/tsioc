import { Injectable, Token } from '@tsdi/ioc';
import { Connection, ConnectionOpts, TransportClient, TransportClientOpts } from '@tsdi/transport';
import { Duplex } from 'form-data';
import { Observable } from 'rxjs';

@Injectable()
export class ModbusClient extends TransportClient {

    protected createDuplex(opts: TransportClientOpts): Duplex {
        throw new Error('Method not implemented.');
    }
    protected onConnect(duplex: Duplex, opts?: ConnectionOpts | undefined): Observable<Connection> {
        throw new Error('Method not implemented.');
    }

}