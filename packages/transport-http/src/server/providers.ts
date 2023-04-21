import { ProviderType } from '@tsdi/ioc';
import { RespondAdapter, StatusVaildator } from '@tsdi/transport';
import { HttpStatusVaildator } from '../status';
import { HttpRespondAdapter } from './respond';

export const HTTP_SERVR_PROVIDERS: ProviderType[] = [
    { provide: StatusVaildator, useClass: HttpStatusVaildator },
    { provide: RespondAdapter, useClass: HttpRespondAdapter }
]
