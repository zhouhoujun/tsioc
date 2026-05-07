import { getTypeName, Inject, isNumber, promisify, Injectable } from '@tsdi/ioc';
import { ApplicationEventMulticaster, EventHandler } from '@tsdi/core';
import { InjectLog, Logger } from '@tsdi/logger';
import {
    createRequestContext, RequestContext,
    InternalServerException, Transport
} from '@tsdi/common';
import { ServiceHandler, Service, BindServiceEvent } from '@tsdi/service';
import { Subject, race, take, takeUntil } from 'rxjs';
import * as coap from 'coap';
import { CoapServOptions, COAP_SERV_OPTIONS, COAP_BIND_INTERCEPTORS, COAP_BIND_FILTERS, COAP_BIND_GUARDS } from './options';
import { SOCKET } from '../context';

/**
 * CoAP server for microservices.
 * Creates a CoAP server that handles incoming requests.
 */
@Injectable()
export class CoapServer<TReq = any, TRes = any> extends Service<TReq, TRes, RequestContext> {

    server?: coap.Server | null;

    @InjectLog() logger!: Logger;

    private destroy$: Subject<void>;

    constructor(
        readonly handler: ServiceHandler<TReq, TRes, RequestContext>,
        @Inject(COAP_SERV_OPTIONS, { nullable: true }) protected options: CoapServOptions,
    ) {
        super();
        this.destroy$ = new Subject();
    }

    listen(port?: number, listeningListener?: () => void): this;
    listen(arg1?: number | (() => void), listeningListener?: () => void): this {
        if (!this.server) throw new InternalServerException();
        if (isNumber(arg1)) {
            this.logger.info(getTypeName(this), 'access with url:', `coap://localhost:${arg1}`, '!');
            this.server.listen(arg1, '0.0.0.0', listeningListener);
        } else {
            listeningListener = arg1;
            this.server.listen(this.options.listenOpts?.port || 5683, '0.0.0.0', listeningListener);
        }
        return this;
    }

    @EventHandler(BindServiceEvent, {
        interceptorsToken: COAP_BIND_INTERCEPTORS,
        filtersToken: COAP_BIND_FILTERS,
        guardsToken: COAP_BIND_GUARDS
    })
    async bind(_event: BindServiceEvent<any>) {
        if (this.server) return;
        await this.onStart();
    }

    async onStart(): Promise<void> {
        const inj = this.injector;
        inj.setValue(Logger, this.logger);

        this.server = coap.createServer((req, res) => {
            this.handleRequest(req, res);
        });

        this.server.on('error', (err: Error) => {
            this.logger.error('CoAP server error:', err);
        });

        if (!this.options.microservice) {
            await inj.get(ApplicationEventMulticaster).emit(new BindServiceEvent(this.server, Transport.CoAP, this));
        }

        const port = this.options.listenOpts?.port || 5683;
        this.listen(port);
    }

    async onShutdown(): Promise<void> {
        if (!this.server) return;

        this.destroy$.next();
        this.destroy$.complete();

        await promisify(this.server.close.bind(this.server))()
            .catch(err => this.logger.error('CoAP server close error:', err));
        this.server.removeAllListeners();
        this.server = null;
    }

    private handleRequest(req: coap.IncomingMessage, res: coap.OutgoingMessage) {
        const context = createRequestContext(this.injector, [
            [SOCKET, req],
            ['request', req],
            ['url', req.url],
        ]);

        let payload: any = req.payload?.toString() || '';
        try {
            payload = JSON.parse(payload);
        } catch { /* keep as string */ }

        this.handler.handle({ payload, url: req.url, method: req.code } as TReq, context)
            .pipe(
                takeUntil(race(this.destroy$).pipe(take(1)))
            ).subscribe((response: any) => {
                if (response) {
                    const buf = Buffer.from(
                        typeof response === 'string' ? response : JSON.stringify(response)
                    );
                    res.end(buf);
                } else {
                    res.end();
                }
            });
    }
}
