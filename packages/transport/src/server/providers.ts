import { RespondAdapter } from '../interceptors';
import { TransportRespondAdapter } from './respond';
import { ASSET_SERVR_PROVIDERS } from '../asset.pdr';



export const TRANSPORT_SERVR_PROVIDERS = [
    ...ASSET_SERVR_PROVIDERS,
    { provide: RespondAdapter, useClass: TransportRespondAdapter }
];
