
import { Redirector } from '@tsdi/core';
import { ProviderType } from '@tsdi/ioc';
import { AssetRedirector } from './impl/redirector';
import { TrasportMimeAdapter } from './impl/mime';
import { TransportNegotiator } from './impl/negotiator';
import { TransportSendAdapter } from './impl/send';
import { DefaultStatusFormater } from './interceptors/formater';
import { ResponseStatusFormater } from './interceptors/log';
import { ContentSendAdapter } from './middlewares/send';
import { MimeAdapter } from './mime';
import { Negotiator } from './negotiator';


export const MIME_PROVIDERS: ProviderType[] = [
    { provide: Redirector, useClass: AssetRedirector },
    { provide: MimeAdapter, useClass: TrasportMimeAdapter }
]

export const ASSET_SERVR_PROVIDERS: ProviderType[] = [
    ...MIME_PROVIDERS,
    { provide: Negotiator, useClass: TransportNegotiator },
    { provide: ResponseStatusFormater, useClass: DefaultStatusFormater },
    { provide: ContentSendAdapter, useClass: TransportSendAdapter },
]
