import { ListenOpts } from '@tsdi/core';
import { Injectable, Token } from '@tsdi/ioc';
import { Connection, ConnectionOpts, TransportServer, TransportServerOpts } from '@tsdi/transport';
import * as modbus from 'modbus-serial';
import { Observable, Subscription } from 'rxjs';


@Injectable()
export class ModbusServer extends TransportServer {
    
    protected createServer(opts: TransportServerOpts) {
        const server = new modbus.ServerTCP()
    
    }
    protected listen(server: any, opts: ListenOpts): Promise<void> {
        throw new Error('Method not implemented.');
    }
    protected onConnection(server: any, opts?: ConnectionOpts | undefined): Observable<Connection> {
        throw new Error('Method not implemented.');
    }
    
}
