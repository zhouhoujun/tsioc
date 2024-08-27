import { Injectable } from '@tsdi/ioc';
import {
    ClientIncomingFactory, UrlClientIncomingOpts, UrlClientIncoming, UrlClientIncomingCloneOpts
} from '@tsdi/common/transport';



export class TcpClientIncoming<T, TStatus = null> extends UrlClientIncoming<T, TStatus> {

    clone(): TcpClientIncoming<T, TStatus>;
    clone<V>(update: UrlClientIncomingCloneOpts<V, TStatus>): TcpClientIncoming<V, TStatus>;
    clone(update: UrlClientIncomingCloneOpts<T, TStatus>): TcpClientIncoming<T, TStatus>;
    clone(update: UrlClientIncomingCloneOpts<any, TStatus> = {}): TcpClientIncoming<any, TStatus> {
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