
import { ProviderType } from '@tsdi/ioc';
import { Transformer } from '@tsdi/core';
import { ServerTransformer } from './server';
import { RespondAdapter } from '../interceptors';
import { TransportRespondAdapter } from './respond';
import { ASSET_SERVR_PROVIDERS } from '../asset.pdr';



export const TRANSPORT_SERVR_PROVIDERS: ProviderType[] = [
    ...ASSET_SERVR_PROVIDERS,
    { provide: Transformer, useExisting: ServerTransformer },
    { provide: RespondAdapter, useClass: TransportRespondAdapter }
];
