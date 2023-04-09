import { HttpStatusVaildator } from '../status';
import { StatusVaildator } from '@tsdi/transport';
import { HttpExecptionHandlers } from './exception-filter';

export const HTTP_SERVR_PROVIDERS = [
    HttpExecptionHandlers,
    { provide: StatusVaildator, useClass: HttpStatusVaildator },
]
