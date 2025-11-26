import { Injectable } from '@tsdi/ioc';
import { Handler } from '@tsdi/core';
import { AbstractTransferFactory, Incoming, TopicIncoming, TransferOpts, TransportContext, UrlIncoming } from '@tsdi/common/transport';
import { RespondContext } from '../context';
import { ServerTransfer, ServerTransferFactory } from '../transfer';
import { defer } from 'rxjs';
import { ServerTransport } from '../transport';
import { PatternRequestContext, TopicRequestContext, UrlRequestContext } from './request.context';




const backenFn = (input: Incoming<any>, context: TransportContext) => {
    return defer(async () => {
        const transport = context.transport as ServerTransport;
        const { injector, outgoingFactory, serverOptions } = transport;
        if ((input as UrlIncoming).url) {
            return new UrlRequestContext(injector,
                transport,
                input as UrlIncoming,
                input.res ?? outgoingFactory.create({ incoming: input, pattern: input.pattern, id: input.id }),
                serverOptions);
        } else if ((input as TopicIncoming).topic) {
            return new TopicRequestContext(injector,
                transport,
                input as TopicIncoming,
                input.res ?? outgoingFactory.create({ incoming: input, pattern: input.pattern, id: input.id }),
                serverOptions);
        } else {
            return new PatternRequestContext(injector,
                transport,
                input,
                input.res ?? outgoingFactory.create({ incoming: input, pattern: input.pattern, id: input.id }),
                serverOptions);
        }

    })
}



@Injectable()
export class DefaultServerTransferFactory extends AbstractTransferFactory<Incoming, RespondContext, ServerTransfer> implements ServerTransferFactory {

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