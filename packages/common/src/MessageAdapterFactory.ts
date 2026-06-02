import { Abstract } from '@tsdi/ioc';
import { RequestContext } from './context';
import { MessageAdapter } from './MessageAdapter';

export interface MessageAdapterFactoryOptions<TReq = any, TRes = any> {
    request: TReq;
    response?: TRes;
    context?: RequestContext<TReq, TRes>;
}

@Abstract()
export abstract class MessageAdapterFactory<
    TReq = any,
    TRes = any,
    TAdapter extends MessageAdapter<TReq, TRes> = MessageAdapter<TReq, TRes>
> {
    abstract create(options: MessageAdapterFactoryOptions<TReq, TRes>): TAdapter;
}
