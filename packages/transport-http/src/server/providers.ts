import { RespondInterceptor } from '@tsdi/transport';
import { HttpRespondInterceptor } from './respond';


export const HTTP_SERVR_PROVIDERS = [
    { provide: RespondInterceptor, useClass: HttpRespondInterceptor }
]
