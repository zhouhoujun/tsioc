import { Transformer } from '@tsdi/core';
import { ProviderType } from '@tsdi/ioc';
import { MIME_PROVIDERS } from '../asset.pdr';
import { ClientTransformer } from './client';


export const TRANSPORT_CLIENT_PROVIDERS: ProviderType[] = [
    ...MIME_PROVIDERS,
    { provide: Transformer, useExisting: ClientTransformer }
]
