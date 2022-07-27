import { Protocol, Redirector, TransportStatus } from '@tsdi/core';
import { AssetRedirector } from '../../client/redirector';
import { TrasportMimeAdapter } from '../../impl/mime';
import { MimeAdapter } from '../../mime';
import { HttpProtocol } from '../protocol';
import { HttpStatus } from '../status';


export const HTTP_CLIENT_PROVIDERS = [
    { provide: TransportStatus, useClass: HttpStatus },
    { provide: Redirector, useClass: AssetRedirector },
    { provide: MimeAdapter, useClass: TrasportMimeAdapter  },
    { provide: Protocol, useClass: HttpProtocol  }
]
