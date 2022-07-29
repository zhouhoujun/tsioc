import { Protocol, TransportStatus } from '@tsdi/core';
import { ASSET_CLIENT_PROVIDERS } from '../../asset.pdr';
import { HttpProtocol } from '../protocol';
import { HttpStatus } from '../status';


export const HTTP_CLIENT_PROVIDERS = [
    ...ASSET_CLIENT_PROVIDERS,
    { provide: TransportStatus, useClass: HttpStatus },
    { provide: Protocol, useClass: HttpProtocol  }
]
