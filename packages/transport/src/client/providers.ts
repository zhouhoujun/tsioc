import { Protocol, Redirector } from '@tsdi/core';
import { TrasportMimeAdapter } from '../impl/mime';
import { MimeAdapter } from '../mime';
import { TransportProtocol } from '../protocol';
import { AssetRedirector } from './redirector';


export const PROTOCOL_CLIENT_PROVIDERS = [
    { provide: Redirector, useClass: AssetRedirector },
    { provide: MimeAdapter, useClass: TrasportMimeAdapter },
    { provide: Protocol, useExisting: TransportProtocol }
]
