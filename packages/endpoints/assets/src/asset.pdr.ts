import { ProviderType } from '@tsdi/ioc';
import { MimeAdapter, MimeDb, MimeTypes } from './MimeAdapter';
import { Negotiator } from './Negotiator';
import { BasicMimeDb } from './impl/mimedb';
import { MimeTypesImpl, TrasportMimeAdapter } from './impl/mime';
import { TransportNegotiator } from './impl/negotiator';
import { AssetRedirector } from './impl/redirector';
import { Redirector } from './Redirector';


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
