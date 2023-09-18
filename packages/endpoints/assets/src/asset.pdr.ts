
import { TypedRespond } from '@tsdi/core';
import { ProviderType } from '@tsdi/ioc';
import { MimeAdapter, MimeDb, MimeTypes } from './MimeAdapter';
import { Negotiator } from './Negotiator';
import { BasicMimeDb } from './impl/mimedb';
import { MimeTypesImpl, TrasportMimeAdapter } from './impl/mime';
import { TransportNegotiator } from './impl/negotiator';
import { AssetRedirector } from './impl/redirector';
import { TranspotTypedRespond } from './impl/typed.respond';
import { Redirector } from './Redirector';


export const MIME_PROVIDERS: ProviderType[] = [
    { provide: MimeTypes, useClass: MimeTypesImpl },
    { provide: MimeDb, useClass: BasicMimeDb },
    { provide: MimeAdapter, useClass: TrasportMimeAdapter }
];


export const ASSET_SERVR_PROVIDERS: ProviderType[] = [
    ...MIME_PROVIDERS,
    { provide: Redirector, useClass: AssetRedirector },
    { provide: Negotiator, useClass: TransportNegotiator },
    { provide: TypedRespond, useClass: TranspotTypedRespond }
];
