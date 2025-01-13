import { Injectable } from '@tsdi/ioc';
import { Handler } from '@tsdi/core';
import { AbstractTransferFactory, Incoming, TransferOpts, TransportContext, UrlIncoming } from '@tsdi/common/transport';
import { RequestContext } from '../RequestContext';
import { ServerTransfer, ServerTransferFactory } from '../transfer';
import { defer } from 'rxjs';
import { ServerTransport } from '../transport';
import { PatternRequestContext, UrlRequestContext } from './request.context';




const backenFn = (input: Incoming<any>, context: TransportContext) => {
    return defer(async () => {
        const transport = context.transport as ServerTransport;
        const { injector, outgoingFactory, headerAdapter, streamAdapter, serverOptions } = transport;
        if ((input as UrlIncoming).url) {
            return new UrlRequestContext(injector,
                transport,
                input as UrlIncoming,
                input.res ?? outgoingFactory.create(input),
                serverOptions);
        } else {
            return new PatternRequestContext(injector,
                transport,
                input,
                input.res ?? outgoingFactory.create(input),
                serverOptions);
        }

    })
}



@Injectable()
export class DefaultServerTransferFactory extends AbstractTransferFactory<Incoming, RequestContext, ServerTransfer> implements ServerTransferFactory {

    protected override vaildOptions(options?: TransferOpts): TransferOpts<Incoming> {
        return {
            enableTypeChain: true,
            backend: backenFn,
            ...options
        }
    }

    protected override createInstace(handler: Handler): ServerTransfer {
        return new ServerTransfer(handler);
    }
}