import { RequestAdapter, StatusVaildator } from '@tsdi/transport';
import { ProviderType } from '@tsdi/ioc';
import { HttpStatusVaildator } from '../status';
import { HttpRequestAdapter } from './request';

export const HTTP_CLIENT_PROVIDERS: ProviderType[] = [
    { provide: RequestAdapter, useExisting: HttpRequestAdapter },
    { provide: StatusVaildator, useExisting: HttpStatusVaildator }
]
