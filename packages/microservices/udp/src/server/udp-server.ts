import { getTypeName, Inject, isNumber, promisify, Injectable } from '@tsdi/ioc';
import { ApplicationEventMulticaster, EventHandler } from '@tsdi/core';
import { InjectLog, Logger } from '@tsdi/logger';
import {
    LOCALHOST, Events, createRequestContext, RequestContext,
    InternalServerException, ListenOpts, Transport, REQUEST, RESPONSE, OutgoingFactory
} from '@tsdi/common';
import { ServiceHandler, Service, BindServiceEvent } from '@tsdi/service';
import { Subject, race, take, takeUntil } from 'rxjs';
import * as dgram from 'node:dgram';
import { UdpServOptions, UDP_SERV_OPTIONS, UDP_BIND_INTERCEPTORS, UDP_BIND_FILTERS, UDP_BIND_GUARDS } from './options';
import { SOCKET } from '../context';

/**
 * UDP server for microservices.
 * Creates a UDP socket that listens for datagrams.
 */
@Injectable()
export class UdpServer<TReq = any, TRes = any> extends Service<TReq, TRes, RequestContext> {

    socket?: dgram.Socket | null;

    @InjectLog() logger!: Logger;

    private destroy$: Subject<void>;

    constructor(
        readonly handler: ServiceHandler<TReq, TRes, RequestContext>,
        @Inject(UDP_SERV_OPTIONS, { nullable: true }) protected options: UdpServOptions,
    ) {
        super();
        this.destroy$ = new Subject();
    }

    listen(options: ListenOpts, listeningListener?: () => void): this;
    listen(port: number, host?: string, listeningListener?: () => void): this;
    listen(arg1: ListenOpts | number, arg2?: any, listeningListener?: () => void): this {
        if (!this.socket) throw new InternalServerException();
        if (isNumber(arg1)) {
            const port = arg1;
            if (typeof arg2 === 'string') {
                this.logger.info(getTypeName(this), 'access with url:', `udp://${arg2}:${port}`, '!');
                this.socket.bind(port, arg2, listeningListener);
            } else {
                listeningListener = arg2;
                this.logger.info(getTypeName(this), 'access with url:', `udp://localhost:${port}`, '!');
                this.socket.bind(port, listeningListener);
            }
        } else {
            const opts = arg1;
            if (!this.options.listenOpts) {
                this.options.listenOpts = opts;
            }
            if (opts.port) {
                this.logger.info(getTypeName(this), 'access with url:', `udp://${opts.host ?? 'localhost'}:${opts.port}`, '!');
            }
            this.socket.bind(opts, listeningListener);
        }
        return this;
    }

    @EventHandler(BindServiceEvent, {
        interceptorsToken: UDP_BIND_INTERCEPTORS,
        filtersToken: UDP_BIND_FILTERS,
        guardsToken: UDP_BIND_GUARDS
    })
    async bind(_event: BindServiceEvent<any>) {
        if (this.socket) return;
        await this.onStart();
    }

    async onStart(bindSocket?: dgram.Socket): Promise<void> {
        const inj = this.injector;
        inj.setValue(Logger, this.logger);

        if (!this.socket) {
            this.socket = bindSocket || dgram.createSocket('udp4');
        }

        this.socket.on(Events.MESSAGE, (msg: Buffer, rinfo: dgram.RemoteInfo) => {
            this.handleMessage(msg, rinfo);
        });

        this.socket.on(Events.ERROR, (err: Error) => {
            this.logger.error('UDP socket error:', err);
        });

        this.socket.on(Events.CLOSE, () => {
            this.logger.info('UDP socket closed');
        });

        if (!this.options.microservice && !bindSocket) {
            await inj.get(ApplicationEventMulticaster).emit(new BindServiceEvent(this.socket, Transport.UDP, this));
        }

        if (!bindSocket) {
            if (!this.options.listenOpts) {
                this.options.listenOpts = { port: 41234, host: LOCALHOST };
            }
            this.listen(this.options.listenOpts);
        }
    }

    async onShutdown(): Promise<void> {
        if (!this.socket) return;

        this.destroy$.next();
        this.destroy$.complete();

        await promisify(this.socket.close.bind(this.socket))()
            .catch(err => this.logger.error('UDP socket close error:', err));
        this.socket.removeAllListeners();
        this.socket = null;
    }

    private handleMessage(msg: Buffer, rinfo: dgram.RemoteInfo) {
        const data = msg.toString();

        let parsed: any;
        try {
            parsed = JSON.parse(data);
        } catch {
            parsed = data;
        }

        const url = parsed.url || '/';
        const method = parsed.method || 'GET';
        const requestData = { ...parsed, url, method };

        const outgoing = this.injector.get(OutgoingFactory).create({});

        const context = createRequestContext(this.injector, [
            [SOCKET, this.socket],
            [REQUEST, requestData],
            [RESPONSE, outgoing],
            ['rinfo', rinfo],
        ]);

        this.handler.handle(requestData as TReq, context)
            .pipe(
                takeUntil(race(this.destroy$).pipe(take(1)))
            ).subscribe((response: any) => {
                if (response && this.socket) {
                    const ctxResponse = context.get(RESPONSE);
                    const body = ctxResponse?.body ?? response;
                    const buf = Buffer.from(
                        typeof body === 'string' ? body : JSON.stringify(body)
                    );
                    this.socket.send(buf, rinfo.port, rinfo.address);
                }
            });
    }
}
