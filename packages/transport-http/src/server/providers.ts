import { Protocol } from '@tsdi/core';
import { RespondAdapter } from '@tsdi/transport';
import { HttpProtocol } from '../protocol';
import { HttpRespondAdapter } from './respond';


export const HTTP_SERVR_PROVIDERS = [
    { provide: RespondAdapter, useClass: HttpRespondAdapter },
    { provide: Protocol, useClass: HttpProtocol }
]
