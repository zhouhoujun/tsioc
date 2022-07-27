import { ExecptionTypedRespond, Protocol } from '@tsdi/core';
import { RespondAdapter } from '../interceptors';
import { ProtocolExecptionTypedRespond, ProtocolRespondAdapter } from './respond';
import { ASSET_SERVR_PROVIDERS } from '../asset.pdr';
import { TransportProtocol } from '../protocol';



export const PROTOCOL_SERVR_PROVIDERS = [
    ...ASSET_SERVR_PROVIDERS,
    { provide: RespondAdapter, useClass: ProtocolRespondAdapter },
    { provide: ExecptionTypedRespond, useClass: ProtocolExecptionTypedRespond },
    { provide: Protocol, useExisting: TransportProtocol }
];
