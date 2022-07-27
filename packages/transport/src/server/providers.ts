import { ExecptionTypedRespond, Protocol } from '@tsdi/core';
import { TrasportMimeAdapter } from '../impl/mime';
import { TransportNegotiator } from '../impl/negotiator';
import { TransportSendAdapter } from '../impl/send';
import {  RespondAdapter, ResponseStatusFormater } from '../interceptors';
import { ContentSendAdapter } from '../middlewares/send';
import { MimeAdapter } from '../mime';
import { Negotiator } from '../negotiator';
import { ProtocolExecptionTypedRespond, ProtocolRespondAdapter } from './respond';
import { DefaultStatusFormater } from '../interceptors/formater';
import { TransportProtocol } from '../protocol';

export const PROTOCOL_SERVR_PROVIDERS = [
    { provide: ResponseStatusFormater, useClass: DefaultStatusFormater },
    { provide: RespondAdapter, useClass: ProtocolRespondAdapter },
    { provide: ExecptionTypedRespond, useClass: ProtocolExecptionTypedRespond },
    { provide: ContentSendAdapter, useClass: TransportSendAdapter },
    { provide: MimeAdapter, useClass: TrasportMimeAdapter },
    { provide: Negotiator, useClass: TransportNegotiator },
    { provide: Protocol, useExisting: TransportProtocol }
];
