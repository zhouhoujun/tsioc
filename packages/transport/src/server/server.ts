import { Router, Server } from '@tsdi/core';
import { Injectable, isBoolean, Nullable } from '@tsdi/ioc';
import { LISTEN_OPTS } from '@tsdi/platform-server';
import { CatchInterceptor, LogInterceptor, RespondInterceptor } from '../interceptors';
import { PrototcolContext, PROTOTCOL_EXECPTION_FILTERS, PROTOTCOL_MIDDLEWARES } from './context';
import { BodyparserMiddleware, ContentMiddleware, ContentOptions, EncodeJsonMiddleware, SessionMiddleware } from '../middlewares';
import { MimeDb } from '../mime';
import { db } from '../impl/mimedb';
import { ProtocolExecptionFilter, ProtocolFinalizeFilter } from './finalize-filter';
import { TransportServerOpts, PROTOTCOL_SERV_INTERCEPTORS } from './options';
import { ServerRequest } from './req';
import { ServerResponse } from './res';
import { PROTOCOL_SERVR_PROVIDERS } from './providers';
import { ServerSession, ServerSessionBuilder } from './stream';


const defOpts = {
    encoding: 'utf8',
    delimiter: '\r\n',
    sizeLimit: 10 * 1024 * 1024,
    interceptorsToken: PROTOTCOL_SERV_INTERCEPTORS,
    execptionsToken: PROTOTCOL_EXECPTION_FILTERS,
    middlewaresToken: PROTOTCOL_MIDDLEWARES,
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
        ProtocolExecptionFilter
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
} as TransportServerOpts;


/**
 * Transport Server
 */
@Injectable()
export class TransportServer extends Server<ServerRequest, ServerResponse, PrototcolContext, TransportServerOpts> {

    private _session?: ServerSession | null;
    constructor(@Nullable() options: TransportServerOpts) {
        super(options)
    }

    get proxy(): boolean {
        return this.getOptions().proxy === true;
    }

    get session(): ServerSession {
        return this._session ?? null!;
    }

    async start(): Promise<void> {
        try {
            this._session = await this.context.get(ServerSessionBuilder).build(this.getOptions());
            await this.session.bind(this.endpoint());
        } catch (err) {
            this.logger.error(err);
        }
    }

    async close(): Promise<void> {
        await this.session.close();
    }

    protected getDefaultOptions() {
        return defOpts;
    }

    protected override initOption(options: TransportServerOpts): TransportServerOpts {
        const defOpts = this.getDefaultOptions();
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

    protected override initContext(options: TransportServerOpts<any>): void {
        this.context.setValue(TransportServerOpts, options);
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

}
