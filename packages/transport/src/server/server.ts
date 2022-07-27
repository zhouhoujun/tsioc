import { Router, TransportServer } from '@tsdi/core';
import { Injectable, isBoolean, Nullable } from '@tsdi/ioc';
import { LISTEN_OPTS } from '@tsdi/platform-server';
import { Subscription } from 'rxjs';
import { JsonDecoder, JsonEncoder } from '../coder';
import { CatchInterceptor, LogInterceptor, RespondInterceptor } from '../interceptors';
import { PrototcolContext, PROTOTCOL_EXECPTION_FILTERS, PROTOTCOL_MIDDLEWARES } from './context';
import { BodyparserMiddleware, ContentMiddleware, ContentOptions, EncodeJsonMiddleware, SessionMiddleware } from '../middlewares';
import { MimeDb } from '../mime';
import { db } from '../impl/mimedb';
import { TcpArgumentErrorFilter, ProtocolFinalizeFilter } from './finalize-filter';
import { ProtocolServerOpts, PROTOTCOL_SERV_INTERCEPTORS } from './options';
import { ServerRequest } from './req';
import { ServerResponse } from './res';
import { PROTOCOL_SERVR_PROVIDERS } from './providers';



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
export class ProtocolServer extends TransportServer<ServerRequest, ServerResponse, PrototcolContext, ProtocolServerOpts> {

    constructor(@Nullable() options: ProtocolServerOpts) {
        super(options)
    }


    get proxy(): boolean {
        return this.getOptions().proxy === true;
    }

    start(): Promise<void> {
        throw new Error('Method not implemented.');
    }

    close(): Promise<void> {
        throw new Error('Method not implemented.');
    }

    protected override initOption(options: ProtocolServerOpts): ProtocolServerOpts {
        const listenOpts = { ...defOpts.listenOpts, ...options?.listenOpts };
        const providers = options && options.providers ? [...PROTOCOL_SERVR_PROVIDERS, ...options.providers] : PROTOCOL_SERVR_PROVIDERS;
        const opts = { ...defOpts, ...options, listenOpts, providers };
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
        this.context.setValue(ProtocolServerOpts, options);
        this.context.setValue(LISTEN_OPTS, options.listenOpts);

        if (options.content && !isBoolean(options.content)) {
            this.context.setValue(ContentOptions, options.content)
        }

        if (options.mimeDb) {
            const mimedb = this.context.injector.get(MimeDb);
            mimedb.from(options.mimeDb)
        }
        super.initContext(options)
    }

    protected createContext(request: ServerRequest, response: ServerResponse): PrototcolContext {
        return new PrototcolContext(this.context.injector, request, response, this as TransportServer, { parent: this.context });
    }

    protected bindEvent(ctx: PrototcolContext, cancel: Subscription): void {
        throw new Error('Method not implemented.');
    }


}
