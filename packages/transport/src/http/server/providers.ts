import { HandlerBinding, Protocol, TransportStatus } from '@tsdi/core';
import { RespondAdapter } from '../../interceptors';
import { ASSET_SERVR_PROVIDERS } from '../../asset.pdr';
import { HttpProtocol } from '../protocol';
import { HttpHandlerBinding } from './binding';
import { HttpRespondAdapter } from './respond';
import { HttpStatus } from '../status';


export const HTTP_SERVR_PROVIDERS = [
    ...ASSET_SERVR_PROVIDERS,
    { provide: TransportStatus, useClass: HttpStatus },
    { provide: RespondAdapter, useClass: HttpRespondAdapter },
    { provide: Protocol, useClass: HttpProtocol },
    { provide: HandlerBinding, useClass: HttpHandlerBinding }
]
