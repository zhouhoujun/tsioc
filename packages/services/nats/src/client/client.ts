import { Injectable, InvocationContext, isString } from '@tsdi/ioc';
import { ResponseEvent, Pattern, RequestInitOpts } from '@tsdi/common';
import { AbstractClient, ClientTransportSession, ClientTransportSessionFactory } from '@tsdi/common/client';
import { InjectLog, Logger } from '@tsdi/logger';
import { NatsConnection, connect } from 'nats';
import { NatsHandler } from './handler';
import { NatsClientOpts } from './options';
import { NatsRequest } from './request';


@Injectable()
export class NatsClient extends AbstractClient<NatsRequest<any>, ResponseEvent<any>, NatsClientOpts> {
    
    private conn?: NatsConnection;
    private _session?: ClientTransportSession<NatsConnection>;

    @InjectLog()
    private logger!: Logger;

    constructor(readonly handler: NatsHandler) {
        super()
    }


    protected async connect(): Promise<any> {
        if (this.conn) return this.conn;
        const options = this.getOptions();
        const conn = this.conn = await connect(options.connectOpts);
        
        this._session = this.handler.injector.get(ClientTransportSessionFactory).create(this.handler.injector, conn, options);
    }

    protected initContext(context: InvocationContext<any>): void {
        context.setValue(AbstractClient, this);
        context.setValue(ClientTransportSession, this._session)
    }

    protected createRequest(pattern: Pattern, options: RequestInitOpts): NatsRequest<any> {
        if (isString(pattern)) {
            return new NatsRequest(pattern, null, options);
        } else {
            return new NatsRequest(this.formatter.format(pattern), pattern, options);
        }
    }

    protected async onShutdown(): Promise<void> {
        await this._session?.destroy();
        this.conn?.close();
    }

}
