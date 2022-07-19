import { Abstract, Inject, Injectable, InvocationContext, lang, Token } from '@tsdi/ioc';
import { TransportClient, Protocol, ClientOpts, EndpointBackend, RequstOption, RequestContext } from '@tsdi/core';
import { MqttClient as Client, connect, IClientOptions } from 'mqtt';
import { ev } from '@tsdi/transport';


@Abstract()
export abstract class MqttClientOptions extends ClientOpts<any, any> {
    abstract url: string;
    abstract options: IClientOptions
}

@Injectable()
export class MqttClient extends TransportClient {


    protected mqttClient: Client | undefined;
    protected connection: Promise<any> | undefined;
    constructor(
        @Inject() context: InvocationContext,
        private options: MqttClientOptions) {
        super(context, options)
    }

    async connect(): Promise<void> {
        if (!this.mqttClient) {
            return;
        }

        const mqttClient = this.mqttClient = connect(this.options.url, this.options.options);
        const defer = lang.defer<void>();
        mqttClient.once('error', err => {
            this.logger.error(err);
            defer.reject(err);
        });
        
        mqttClient.once(ev.CONNECT, (p)=> {
            defer.resolve();
        });

        return await defer.promise;

    }

    async close(): Promise<void> {
        const defer = lang.defer();
        this.mqttClient?.end(true, undefined, err => err ? defer.reject(err) : defer.resolve);
        await defer.promise;
        this.mqttClient = null!;
        this.connection = null!;
    }

    protected override buildRequest(context: RequestContext, url: any, options?: RequstOption | undefined) {
        throw new Error('Method not implemented.');
    }

    protected getBackend(): EndpointBackend<any, any> {
        throw new Error('Method not implemented.');
    }

}
