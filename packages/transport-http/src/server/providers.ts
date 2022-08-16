import { RespondAdapter } from '@tsdi/transport';
import { HttpRespondAdapter } from './respond';


export const HTTP_SERVR_PROVIDERS = [
    { provide: RespondAdapter, useClass: HttpRespondAdapter }
]
