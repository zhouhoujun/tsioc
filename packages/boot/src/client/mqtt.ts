import { Injectable, lang } from '@tsdi/ioc';
import { AbstractClient, Deserializer, ReadPacket, Serializer, TransportHandler, WritePacket } from '@tsdi/core';
import { MqttClient, connect, IClientOptions } from 'mqtt';
import { EmptyError, first, fromEvent, lastValueFrom, map, merge, share, take, tap } from 'rxjs';
import { MqttRecordSerializer } from '../transforms/mqtt';
import { IncomingResponseDeserializer } from '../transforms/response';


@Injectable({
    providers: [
        { provide: Serializer, useClass: MqttRecordSerializer },
        { provide: Deserializer, useClass: IncomingResponseDeserializer}
    ]
})
export class MQTTClient extends AbstractClient {
    protected mqttClient: MqttClient | undefined;
    protected connection: Promise<any> | undefined;
    constructor(
        handler: TransportHandler,
        private url: string,
        private options: IClientOptions) {
        super(handler)
    }

    async connect(): Promise<void> {
        if (!this.mqttClient) {
            return await this.connection;
        }

        const mqttClient = this.mqttClient = connect(this.url, this.options);
        mqttClient.on('error', err => {
            this.logger.error(err);
        });

        const source = merge(
            fromEvent(mqttClient, 'error')
                .pipe(
                    map(err => {
                        throw err;
                    })
                ),
            fromEvent(mqttClient, 'connect')
        ).pipe(take(1));

        this.connection = lastValueFrom(
            merge(source, fromEvent(mqttClient, 'close').pipe(
                map((err: any) => {
                    throw err;
                }),
            )).pipe(
                first(),
                tap(() => this.mqttClient?.on('message', this.createResponseCallback())),
                share()
            )
        ).catch(err => {
            if (err instanceof EmptyError) return;
            throw err;
        });
        return this.connection;

    }

    async onDispose(): Promise<void> {
        const defer = lang.defer();
        this.mqttClient?.end(undefined, undefined, err => err ? defer.reject(err) : defer.resolve);
        await defer.promise;
        this.mqttClient = null!;
        this.connection = null!;
    }


    protected publish(packet: ReadPacket<any>, callback: (packet: WritePacket<any>) => void): () => void {
        throw new Error('Method not implemented.');
    }
    protected dispatchEvent<T = any>(packet: ReadPacket<any>): Promise<T> {
        throw new Error('Method not implemented.');
    }


    public createResponseCallback(): (channel: string, buffer: Buffer) => any {
        return async (channel: string, buffer: Buffer) => {
            const packet = JSON.parse(buffer.toString());
            const { err, response, disposed, id } = await this.deserializer.deserialize(packet);

            const callback = this.routing.get(id);
            if (!callback) {
                return undefined;
            }
            if (disposed || err) {
                return callback({
                    err,
                    response,
                    disposed: true,
                });
            }
            callback({
                err,
                response,
            });
        };
    }

}
