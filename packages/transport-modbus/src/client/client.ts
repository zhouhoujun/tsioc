import { Injectable, Token } from '@tsdi/ioc';
import { Client, ConfigableHandler, TransportEvent, TransportRequest } from '@tsdi/core';
import { EventEmitter } from 'events';
import ModbusRTU from 'modbus-serial';
import { Observable, of } from 'rxjs';

@Injectable()
export class ModbusClient extends Client<TransportRequest, TransportEvent> {

    get handler(): ConfigableHandler<TransportRequest<any>, TransportEvent> {
        throw new Error('Method not implemented.');
    }
    protected connect(): Observable<any> {
        const modbus = new ModbusRTU();
        // modbus.connectTCP()
        // modbus.open();

        return of(modbus);
        // return modbus.connectRTU('');
    }

    protected onShutdown(): Promise<void> {
        throw new Error('Method not implemented.');
    }

    // protected createSocket(opts: TransportClientOpts): EventEmitter {
    //     const modbus = new ModbusRTU();
    //     modbus.connectTCP()
    //     modbus.open()
    //     // return modbus.connectRTU('');
    // }
    // protected onConnect(duplex: Duplex, opts?: ConnectionOpts | undefined): Observable<Connection> {
    //     throw new Error('Method not implemented.');
    // }

}
