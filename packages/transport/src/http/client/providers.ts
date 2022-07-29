import { HttpBackend } from '@tsdi/common';
import { Protocol, TransportStatus } from '@tsdi/core';
import { HttpProtocol } from '../protocol';
import { HttpStatus } from '../status';
import { HttpBackend2 } from './backend';


export const HTTP_CLIENT_PROVIDERS = [
    { provide: TransportStatus, useClass: HttpStatus },
    { provide: Protocol, useClass: HttpProtocol  },
    { provide: HttpBackend, useClass: HttpBackend2 },
]
