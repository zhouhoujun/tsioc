import { Injectable, Token } from '@tsdi/ioc';
import { Connection, ConnectionOpts, TransportClient, TransportClientOpts } from '@tsdi/transport';
import { Duplex } from 'stream';
import { EventEmitter } from 'events';
import ModbusRTU from 'modbus-serial';
import { Observable } from 'rxjs';

@Injectable()
export class ModbusClient extends TransportClient {

    protected createSocket(opts: TransportClientOpts): EventEmitter {
        const modbus = new ModbusRTU();
        modbus.connectTCP()
        modbus.open()
        // return modbus.connectRTU('');
    }
    protected onConnect(duplex: Duplex, opts?: ConnectionOpts | undefined): Observable<Connection> {
        throw new Error('Method not implemented.');
    }

}
