import { Injectable, isString, Context, Inject } from '@tsdi/ioc';
import { Pattern, RequestInitOpts, TopicRequestOptions, ResponseEvent, Events, PatternFormatter, defaultFormatter } from '@tsdi/common';
import { AbstractClient, ClientHandler } from '@tsdi/client';
import { SOCKET } from '@tsdi/transport';
import { InjectLog, Logger } from '@tsdi/logger';
import { defer, Observable, switchMap } from 'rxjs';
import * as mqtt from 'mqtt';
import { MQTT_CLIENT_OPTIONS, MqttClientOptions } from './options';
import { MqttRequest } from './request';

@Injectable()
export class MqttClient extends AbstractClient<MqttRequest<any>, ResponseEvent<any>, TopicRequestOptions> {

    @InjectLog()
    private logger!: Logger;

    private connection?: mqtt.MqttClient;

    constructor(
        readonly handler: ClientHandler<MqttRequest<any>, ResponseEvent<any>>,
        @Inject(MQTT_CLIENT_OPTIONS, { nullable: true }) private options: MqttClientOptions
    ) {
        super();
        if (!options.url) {
            options.url = 'mqtt://localhost:1883';
        }
    }

    protected connect(): Observable<mqtt.MqttClient> {
        return defer(async () => {
            const valid = this.connection && this.isValid(this.connection);
            if (valid) return this.connection!;

            if (this.connection) {
                this.connection.removeAllListeners();
                this.connection.end(true);
            }

            return await new Promise<mqtt.MqttClient>((resolve, reject) => {
                const client = this.createConnection(this.options);

                const cleanup = () => {
                    client.off(Events.CONNECT, onConnect)
                        .off(Events.ERROR, onError)
                        .off(Events.CLOSE, onClose);
                };

                const onError = (err: Error) => {
                    cleanup();
                    this.logger?.error('MQTT connection error:', err);
                    reject(err);
                };

                const onConnect = () => {
                    cleanup();
                    this.connection = client;
                    resolve(client);
                };

                const onClose = () => {
                    cleanup();
                    if (!this.connection) {
                        reject(new Error('Connection closed before connect'));
                    }
                };

                client.on(Events.ERROR, onError)
                    .on(Events.CONNECT, onConnect)
                    .once(Events.CLOSE, onClose);
            });
        });
    }

    protected initContext(context: Context, req: MqttRequest<any>): void {
        context.set(MqttClient, this);
        context.set(MqttRequest, req);
        context.set(SOCKET, this.connection as any);
    }

    protected buildRequest(first: MqttRequest<any> | Pattern, options: RequestInitOpts<any, TopicRequestOptions>): MqttRequest<any> {
        if (first instanceof MqttRequest) {
            return first;
        }
        if (isString(first)) {
            return new MqttRequest(first, null, options);
        } else {
            const formatter = this.handler.injector.get(PatternFormatter, defaultFormatter);
            return new MqttRequest(formatter.format(first), first, options);
        }
    }

    protected override request(first: Pattern | MqttRequest<any>, options: TopicRequestOptions = {} as any): Observable<any> {
        return this.connect().pipe(
            switchMap(() => super.request(first, options))
        );
    }

    protected async onShutdown(): Promise<void> {
        if (!this.connection) return;        

        return new Promise<void>((resolve) => {
            let settled = false;
            const cleanup = () => {
                if (settled) {
                    return;
                }
                settled = true;
                clearTimeout(timeout);
                this.connection?.removeAllListeners();
                this.connection = undefined!;
                resolve();
            };

            this.connection!.once(Events.CLOSE, cleanup);

            const timeout = setTimeout(() => {
                this.logger?.warn('MQTT client shutdown timeout, forcing end');
                try {
                    this.connection?.end(true);
                } finally {
                    cleanup();
                }
            }, 5000);
            if (typeof (timeout as any).unref === 'function') {
                (timeout as any).unref();
            }

            this.connection!.once(Events.CLOSE, () => {
                clearTimeout(timeout);
            });

            this.connection!.end(false);
        }).catch(err => {
            this.logger?.error('MQTT client shutdown error:', err);
            if (this.connection) {
                this.connection.removeAllListeners();
                this.connection.end(true);
                this.connection = undefined!;
            }
        });
    }

    protected isValid(connection: mqtt.MqttClient): boolean {
        return connection.connected;
    }

    protected createConnection(opts: MqttClientOptions): mqtt.MqttClient {
        return mqtt.connect(opts.url || 'mqtt://localhost:1883', opts.connectOpts);
    }
}
