import { ProviderType } from '@tsdi/ioc';
import { MimeAdapter, MimeDb, MimeTypes } from '@tsdi/common';
import { Negotiator } from './Negotiator';
import { BasicMimeDb } from './impl/mimedb';
import { MimeTypesImpl, TrasportMimeAdapter } from './impl/mime';
import { TransportNegotiator } from './impl/negotiator';


export const MIME_PROVIDERS: ProviderType[] = [
    { provide: MimeTypes, useClass: MimeTypesImpl },
    { provide: MimeDb, useClass: BasicMimeDb },
    { provide: MimeAdapter, useClass: TrasportMimeAdapter }
];

export const ASSET_ENDPOINT_PROVIDERS: ProviderType[] = [
    ...MIME_PROVIDERS,
    { provide: Negotiator, useClass: TransportNegotiator },
];
