import { HandlerBinding, Protocol, TransportStatus } from '@tsdi/core';
import { RespondAdapter } from '../../interceptors';
import { HttpProtocol } from '../protocol';
import { HttpHandlerBinding } from './binding';
import { HttpRespondAdapter } from './respond';
import { HttpStatus } from '../status';


export const HTTP_SERVR_PROVIDERS = [
    { provide: TransportStatus, useClass: HttpStatus },
    { provide: RespondAdapter, useClass: HttpRespondAdapter },
    { provide: Protocol, useClass: HttpProtocol },
    { provide: HandlerBinding, useClass: HttpHandlerBinding }
]
