import { HttpBackend } from '@tsdi/common';
import { TransportStrategy } from '@tsdi/core';
import { HttpTransportStrategy } from '../transport';
import { HttpBackend2 } from './backend';


export const HTTP_CLIENT_PROVIDERS = [
    { provide: TransportStrategy, useClass: HttpTransportStrategy  },
    { provide: HttpBackend, useClass: HttpBackend2 }
]
