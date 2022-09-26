import { Injectable, Token } from '@tsdi/ioc';
import { TransportServer } from '@tsdi/transport';
import { ServerTCP } from 'modbus-serial'
import { Subscription } from 'rxjs';


@Injectable()
export class ModbusServer extends TransportServer {
    
}
