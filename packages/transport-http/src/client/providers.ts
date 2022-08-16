import { HttpBackend } from '@tsdi/common';
import { TransportProtocol } from '@tsdi/core';
import { HttpProtocol } from '../protocol';
import { HttpBackend2 } from './backend';


export const HTTP_CLIENT_PROVIDERS = [
    { provide: TransportProtocol, useClass: HttpProtocol  },
    { provide: HttpBackend, useClass: HttpBackend2 },
]
