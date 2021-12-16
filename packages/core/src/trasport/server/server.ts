import { Abstract, Inject } from '@tsdi/ioc';
import { ILogger, Logger } from '@tsdi/logs';
import { OnDispose } from '../../lifecycle';
import { Server } from '../../server';
import { IncomingEvent, IncomingRequest, OutgoingResponse } from '../packet';
import { Deserializer } from '../deserializer';
import { Serializer } from '../serializer';


@Abstract()
export abstract class AbstractServer implements Server, OnDispose {

    @Logger() protected readonly logger!: ILogger;

    @Inject({ provider: Serializer, nullable: true })
    protected serializer: Serializer<OutgoingResponse> | undefined;
    @Inject({ provider: Deserializer, nullable: true })
    protected deserializer: Deserializer<IncomingRequest | IncomingEvent> | undefined;

    abstract startup(): Promise<void>

    abstract onDispose(): Promise<void>

}
