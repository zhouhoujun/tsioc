import { BaseRequest, RequestCloneOpts } from '@tsdi/common';

export class WsRequest<T> extends BaseRequest<T> {

    clone(): WsRequest<T>;
    clone<V>(update: RequestCloneOpts<V>): WsRequest<V>;
    clone(update: RequestCloneOpts<T>): WsRequest<T>;
    clone(update: RequestCloneOpts<any> = {}): WsRequest<any> {
        const opts = this.cloneOpts(update);
        return new WsRequest(opts);
    }
}