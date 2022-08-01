import { HttpBackend } from '@tsdi/common';
import { Protocol } from '@tsdi/core';
import { HttpProtocol } from '../protocol';
import { HttpBackend2 } from './backend';


export const HTTP_CLIENT_PROVIDERS = [
    { provide: Protocol, useClass: HttpProtocol  },
    { provide: HttpBackend, useClass: HttpBackend2 },
]
