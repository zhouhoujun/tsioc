import { ExecptionTypedRespond, Protocol, Router, TransportServer } from '@tsdi/core';
import { Injectable, isBoolean, Nullable, Providers } from '@tsdi/ioc';
import { Subscription } from 'rxjs';
import { JsonDecoder, JsonEncoder } from '../coder';
import { TrasportMimeAdapter } from '../impl/mime';
import { TransportNegotiator } from '../impl/negotiator';
import { TransportSendAdapter } from '../impl/send';
import { CatchInterceptor, LogInterceptor, RespondAdapter, RespondInterceptor, ResponseStatusFormater } from '../interceptors';
import { BodyparserMiddleware, ContentMiddleware, ContentOptions, EncodeJsonMiddleware, SessionMiddleware } from '../middlewares';
import { ContentSendAdapter } from '../middlewares/send';
import { MimeAdapter, MimeDb } from '../mime';
import { Negotiator } from '../negotiator';
import { PrototcolContext, PROTOTCOL_EXECPTION_FILTERS, PROTOTCOL_MIDDLEWARES } from './context';
import { ProtocolExecptionTypedRespond, ProtocolRespondAdapter } from './respond';
import { db } from '../impl/mimedb';
import { DefaultStatusFormater } from '../interceptors/formater';
import { TcpArgumentErrorFilter, ProtocolFinalizeFilter } from './finalize-filter';
import { ProtocolServerOpts, PROTOTCOL_SERV_INTERCEPTORS } from './options';
import { ServerRequest } from './req';
import { ServerResponse } from './res';
import { TransportProtocol } from '../protocol';
import { LISTEN_OPTS } from '@tsdi/platform-server';



const defOpts = {
    encoding: 'utf8',
    delimiter: '\r\n',
    sizeLimit: 10 * 1024 * 1024,
    interceptorsToken: PROTOTCOL_SERV_INTERCEPTORS,
    execptionsToken: PROTOTCOL_EXECPTION_FILTERS,
    middlewaresToken: PROTOTCOL_MIDDLEWARES,
    encoder: JsonEncoder,
    decoder: JsonDecoder,
    content: {
        root: 'public'
    },
    mimeDb: db,
    interceptors: [
        LogInterceptor,
        CatchInterceptor,
        RespondInterceptor
    ],
    execptions: [
        ProtocolFinalizeFilter,
        TcpArgumentErrorFilter
    ],
    middlewares: [
        ContentMiddleware,
        SessionMiddleware,
        EncodeJsonMiddleware,
        BodyparserMiddleware,
        Router
    ],
    listenOpts: {
    }
} as ProtocolServerOpts;


/**
 * Transport Protocol Server
 */
@Injectable()
@Providers([
    { provide: ResponseStatusFormater, useClass: DefaultStatusFormater, asDefault: true },
    { provide: RespondAdapter, useClass: ProtocolRespondAdapter, asDefault: true },
    { provide: ExecptionTypedRespond, useClass: ProtocolExecptionTypedRespond, asDefault: true },
    { provide: ContentSendAdapter, useClass: TransportSendAdapter, asDefault: true },
    { provide: MimeAdapter, useClass: TrasportMimeAdapter, asDefault: true },
    { provide: Negotiator, useClass: TransportNegotiator, asDefault: true },
    { provide: Protocol, useExisting: TransportProtocol }
])
export class ProtocolServer extends TransportServer<ServerRequest, ServerResponse, PrototcolContext, ProtocolServerOpts> {



    private options!: ProtocolServerOpts;
    constructor(@Nullable() options: ProtocolServerOpts) {
        super(options)
    }


    get proxy(): boolean {
        return this.options.proxy === true;
    }

    start(): Promise<void> {
        throw new Error('Method not implemented.');
    }

    close(): Promise<void> {
        throw new Error('Method not implemented.');
    }

    protected override initOption(options: ProtocolServerOpts): ProtocolServerOpts {
        const listenOptions = { ...defOpts.listenOpts, ...options?.listenOpts };
        const opts = this.options = { ...defOpts, ...options, listenOpts: listenOptions };
        this.context.setValue(ProtocolServerOpts, this.options);
        this.context.setValue(LISTEN_OPTS, opts.listenOpts);
        if (opts.middlewares) {
            opts.middlewares = opts.middlewares.filter(m => {
                if (!opts.session && m === SessionMiddleware) return false;
                if (!opts.content && m === ContentMiddleware) return false;
                return true
            });
        }
        return opts;
    }

    protected override initContext(options: ProtocolServerOpts<any>): void {
        if (options.content && !isBoolean(options.content)) {
            this.context.setValue(ContentOptions, options.content)
        }

        if (options.mimeDb) {
            const mimedb = this.context.injector.get(MimeDb);
            mimedb.from(options.mimeDb)
        }
    }

    protected createContext(request: ServerRequest, response: ServerResponse): PrototcolContext {
        return new PrototcolContext(this.context.injector, request, response, this as TransportServer, { parent: this.context });
    }

    protected bindEvent(ctx: PrototcolContext, cancel: Subscription): void {
        throw new Error('Method not implemented.');
    }


}
