import { ExecptionTypedRespond, HandlerBinding, Protocol, Redirector, TransportStatus } from '@tsdi/core';
import { TrasportMimeAdapter } from '../../impl/mime';
import { TransportNegotiator } from '../../impl/negotiator';
import { TransportSendAdapter } from '../../impl/send';
import { DefaultStatusFormater, RespondAdapter, ResponseStatusFormater } from '../../interceptors';
import { ContentSendAdapter } from '../../middlewares';
import { MimeAdapter } from '../../mime';
import { Negotiator } from '../../negotiator';
import { HttpProtocol } from '../protocol';
import { HttpHandlerBinding } from './binding';
import { HttpExecptionTypedRespond, HttpRespondAdapter } from './respond';
import { HttpStatus } from '../status';
import { AssetRedirector } from '../../client/redirector';


export const HTTP_SERVR_PROVIDERS = [
    { provide: ResponseStatusFormater, useClass: DefaultStatusFormater },
    { provide: RespondAdapter, useClass: HttpRespondAdapter },
    { provide: ExecptionTypedRespond, useClass: HttpExecptionTypedRespond },
    { provide: ContentSendAdapter, useClass: TransportSendAdapter },
    { provide: MimeAdapter, useClass: TrasportMimeAdapter },
    { provide: Negotiator, useClass: TransportNegotiator },
    { provide: TransportStatus, useClass: HttpStatus },
    { provide: Redirector, useClass: AssetRedirector },
    { provide: Protocol, useClass: HttpProtocol },
    { provide: HandlerBinding, useClass: HttpHandlerBinding }
]
