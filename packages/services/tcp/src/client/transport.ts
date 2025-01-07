import { Injectable } from '@tsdi/ioc';
import {
    ClientIncomingFactory, UrlClientIncomingOpts, UrlClientIncoming
} from '@tsdi/common/transport';



export class TcpClientIncoming<T, TStatus = null> extends UrlClientIncoming<T, TStatus> {

}

@Injectable()
export class TcpClientIncomingFactory implements ClientIncomingFactory {

    create<T = any>(options: UrlClientIncomingOpts<any, any>): TcpClientIncoming<T> {
        return new TcpClientIncoming(options);
    }

}