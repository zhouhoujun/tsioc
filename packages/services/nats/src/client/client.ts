import { Injectable, InvocationContext, isString } from '@tsdi/ioc';
import { ResponseEvent, Pattern, RequestInitOpts, TopicRequestOptions } from '@tsdi/common';
import { AbstractClient, ClientTransport, ClientTransportFactory } from '@tsdi/common/client';
import { InjectLog, Logger } from '@tsdi/logger';
import { connect } from 'nats';
import { NatsHandler } from './handler';
import { NatsClientOpts } from './options';
import { NatsRequest } from './request';
import { NatsSocket } from '../socket';


@Injectable()
export class NatsClient extends AbstractClient<TopicRequestOptions, NatsRequest<any>, ResponseEvent<any>, NatsClientOpts> {

    private socket?: NatsSocket;
    private _transport?: ClientTransport<NatsSocket>;

    @InjectLog()
    private logger!: Logger;

    constructor(readonly handler: NatsHandler) {
        super()
    }


    protected async connect(): Promise<any> {
        if (this.socket) return this.socket;
        const options = this.getOptions();
        const conn = await connect(options.connectOpts);
        this.socket = new NatsSocket(conn);

        this._transport = this.handler.injector.get(ClientTransportFactory).create(this.handler.injector, this.socket, options);
    }

    protected initContext(context: InvocationContext<any>): void {
        context.setValue(AbstractClient, this);
        context.setValue(ClientTransport, this._transport)
    }

    protected createRequest(pattern: Pattern, options: RequestInitOpts<any, TopicRequestOptions>): NatsRequest<any> {
        return new NatsRequest(this.formatter.format(pattern), pattern, options);
    }

    protected async onShutdown(): Promise<void> {
        await this._transport?.destroy();
        this.socket?.close();
    }

}
