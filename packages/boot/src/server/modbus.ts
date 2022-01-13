import { TransportServer } from '@tsdi/core';

export class ModbusServer extends TransportServer {
    
    startup(): Promise<void> {
        throw new Error('Method not implemented.');
    }

    onDispose(): Promise<void> {
        throw new Error('Method not implemented.');
    }

}
