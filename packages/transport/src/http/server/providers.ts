import { HandlerBinding, Protocol } from '@tsdi/core';
import { RespondAdapter } from '../../interceptors';
import { HttpProtocol } from '../protocol';
import { HttpHandlerBinding } from './binding';
import { HttpRespondAdapter } from './respond';


export const HTTP_SERVR_PROVIDERS = [
    { provide: RespondAdapter, useClass: HttpRespondAdapter },
    { provide: Protocol, useClass: HttpProtocol },
    { provide: HandlerBinding, useClass: HttpHandlerBinding }
]
