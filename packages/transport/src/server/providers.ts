import { Protocol } from '@tsdi/core';
import { RespondAdapter } from '../interceptors';
import { ProtocolRespondAdapter } from './respond';
import { ASSET_SERVR_PROVIDERS } from '../asset.pdr';



export const PROTOCOL_SERVR_PROVIDERS = [
    ...ASSET_SERVR_PROVIDERS,
    { provide: RespondAdapter, useClass: ProtocolRespondAdapter }
];
