import { ProviderType } from '@tsdi/ioc';
import { Redirector, MimeAdapter, MimeDb, MimeTypes } from '@tsdi/common/transport';
import { Negotiator } from '@tsdi/endpoints';
import { BasicMimeDb } from './impl/mimedb';
import { MimeTypesImpl, TrasportMimeAdapter } from './impl/mime';
import { TransportNegotiator } from './impl/negotiator';
import { AssetRedirector } from './impl/redirector';


export const MIME_PROVIDERS: ProviderType[] = [
    { provide: MimeTypes, useClass: MimeTypesImpl },
    { provide: MimeDb, useClass: BasicMimeDb },
    { provide: MimeAdapter, useClass: TrasportMimeAdapter }
];

export const ASSET_ENDPOINT_PROVIDERS: ProviderType[] = [
    ...MIME_PROVIDERS,
    AssetRedirector,
    { provide: Redirector, useExisting: AssetRedirector },
    { provide: Negotiator, useClass: TransportNegotiator },
];
