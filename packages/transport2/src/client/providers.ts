import { Protocol } from '@tsdi/core';
import { MIME_PROVIDERS } from '../asset.pdr';
import { TransportProtocol } from '../protocol';


export const PROTOCOL_CLIENT_PROVIDERS = [
    ...MIME_PROVIDERS,
    { provide: Protocol, useExisting: TransportProtocol }
]
