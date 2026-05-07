import { getTypeName, Inject, promisify, Injectable } from '@tsdi/ioc';
import { ApplicationEventMulticaster, EventHandler } from '@tsdi/core';
import { InjectLog, Logger } from '@tsdi/logger';
import { RequestContext, Transport } from '@tsdi/common';
import { ServiceHandler, Service, BindServiceEvent } from '@tsdi/service';
import { Subject } from 'rxjs';
import * as grpc from '@grpc/grpc-js';
import { GrpcServOptions, GRPC_SERV_OPTIONS, GRPC_BIND_INTERCEPTORS, GRPC_BIND_FILTERS, GRPC_BIND_GUARDS } from './options';

@Injectable()
export class GrpcServer<TReq = any, TRes = any> extends Service<TReq, TRes, RequestContext> {

    server?: grpc.Server | null;

    @InjectLog() logger!: Logger;
    private destroy$: Subject<void>;

    constructor(
        readonly handler: ServiceHandler<TReq, TRes, RequestContext>,
        @Inject(GRPC_SERV_OPTIONS, { nullable: true }) protected options: GrpcServOptions,
    ) {
        super();
        this.destroy$ = new Subject();
    }

    @EventHandler(BindServiceEvent, {
        interceptorsToken: GRPC_BIND_INTERCEPTORS,
        filtersToken: GRPC_BIND_FILTERS,
        guardsToken: GRPC_BIND_GUARDS
    })
    async bind(_event: BindServiceEvent<any>) {
        if (this.server) return;
        await this.onStart();
    }

    async onStart(): Promise<void> {
        const inj = this.injector;
        inj.setValue(Logger, this.logger);

        this.server = new grpc.Server();
        const port = this.options.port || 50051;
        const creds = this.options.credentials || grpc.ServerCredentials.createInsecure();

        this.server.bindAsync(`0.0.0.0:${port}`, creds, (err: Error | null, boundPort: number) => {
            if (err) {
                this.logger.error('gRPC server bind error:', err);
                return;
            }
            this.server?.start();
            this.logger.info(getTypeName(this), `gRPC server started on port ${boundPort}`);
        });

        if (!this.options.microservice) {
            await inj.get(ApplicationEventMulticaster).emit(new BindServiceEvent(this.server, Transport.gRPC, this));
        }
    }

    async onShutdown(): Promise<void> {
        this.destroy$.next();
        this.destroy$.complete();
        if (this.server) {
            await promisify(this.server.tryShutdown.bind(this.server))()
                .catch(err => this.logger.error('gRPC server shutdown error:', err));
            this.server = null;
        }
    }
}
