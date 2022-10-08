
import { ExecptionTypedRespond, MiddlewareFilter, Redirector } from '@tsdi/core';
import { ProviderType } from '@tsdi/ioc';
import { DefaultStatusFormater } from './interceptors/formater';
import { ResponseStatusFormater } from './interceptors/log';
import { ContentSendAdapter } from './middlewares/send';
import { MimeAdapter, MimeDb, MimeTypes } from './mime';
import { Negotiator } from './negotiator';
import { BasicMimeDb } from './impl/mimedb';
import { MimeTypesImpl, TrasportMimeAdapter } from './impl/mime';
import { TransportNegotiator } from './impl/negotiator';
import { TransportSendAdapter } from './impl/send';
import { AssetRedirector } from './impl/redirector';
import { TranspotExecptionTypedRespond } from './impl/typed.respond';
import { DefaultMiddlewareFilter } from './middlewares/filter';


export const MIME_PROVIDERS: ProviderType[] = [
    { provide: MimeTypes, useClass: MimeTypesImpl },
    { provide: MimeDb, useClass: BasicMimeDb },
    { provide: MimeAdapter, useClass: TrasportMimeAdapter }
];


export const ASSET_SERVR_PROVIDERS: ProviderType[] = [
    ...MIME_PROVIDERS,
    { provide: Redirector, useClass: AssetRedirector },
    { provide: Negotiator, useClass: TransportNegotiator },
    { provide: ResponseStatusFormater, useClass: DefaultStatusFormater },
    { provide: ContentSendAdapter, useClass: TransportSendAdapter },
    { provide: ExecptionTypedRespond, useClass: TranspotExecptionTypedRespond },
    { provide: MiddlewareFilter, useClass: DefaultMiddlewareFilter }
];
