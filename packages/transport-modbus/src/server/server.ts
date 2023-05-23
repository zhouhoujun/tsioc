import { ListenOpts, MicroService, TransportEndpoint } from '@tsdi/core';
import { Injectable, Token } from '@tsdi/ioc';
import * as modbus from 'modbus-serial';
import { Observable, Subscription } from 'rxjs';
import { ModbusContext } from './context';


@Injectable()
export class ModbusServer extends MicroService<ModbusContext> {
    private server?: modbus.ServerTCP;
    get endpoint(): TransportEndpoint<ModbusContext, any> {
        throw new Error('Method not implemented.');
    }
    protected async onStartup(): Promise<any> {
        const server = this.server = new modbus.ServerTCP()
    }
    protected onStart(): Promise<any> {
        throw new Error('Method not implemented.');
    }
    protected onShutdown(): Promise<any> {
        throw new Error('Method not implemented.');
    }

}
