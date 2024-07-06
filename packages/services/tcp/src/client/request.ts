import { BaseRequest, RequestCloneOpts } from '@tsdi/common';

export class TcpRequest<T> extends BaseRequest<T> {
    clone(): TcpRequest<T>;
    clone<V>(update: RequestCloneOpts<V>): TcpRequest<V>;
    clone(update: RequestCloneOpts<T>): TcpRequest<T>;
    clone(update: RequestCloneOpts<any> = {}): TcpRequest<any> {
        const opts = this.cloneOpts(update);
        return new TcpRequest(opts);
    }

}