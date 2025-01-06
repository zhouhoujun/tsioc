import { Injectable } from '@tsdi/ioc';
import {
    ClientIncomingFactory, UrlClientIncomingOpts, UrlClientIncoming
} from '@tsdi/common/transport';



export class TcpClientIncoming<T, TStatus = null> extends UrlClientIncoming<T, TStatus> {

    clone(): TcpClientIncoming<T, TStatus>;
    clone<V>(update: UrlClientIncomingOpts<V, TStatus>): TcpClientIncoming<V, TStatus>;
    clone(update: UrlClientIncomingOpts<T, TStatus>): TcpClientIncoming<T, TStatus>;
    clone(update: UrlClientIncomingOpts<any, TStatus> = {}): TcpClientIncoming<any, TStatus> {
        const opts = this.cloneOpts(update);
        return new TcpClientIncoming(opts);
    }
}

@Injectable()
export class TcpClientIncomingFactory implements ClientIncomingFactory {

    create<T = any>(options: UrlClientIncomingOpts<any, any>): TcpClientIncoming<T> {
        return new TcpClientIncoming(options);
    }

}