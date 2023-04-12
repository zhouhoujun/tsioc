
import { ProviderType } from '@tsdi/ioc';
import { ExecptionFinalizeFilter } from './execption-filter';
import { ServerFinalizeFilter } from './filter';



export const TRANSPORT_SERVR_PROVIDERS: ProviderType[] = [
    ExecptionFinalizeFilter,
    ServerFinalizeFilter
];
