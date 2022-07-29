import { Protocol, TransportStatus } from '@tsdi/core';
import { HttpProtocol } from '../protocol';
import { HttpStatus } from '../status';


export const HTTP_CLIENT_PROVIDERS = [
    { provide: TransportStatus, useClass: HttpStatus },
    { provide: Protocol, useClass: HttpProtocol  }
]
