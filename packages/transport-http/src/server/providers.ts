import { StatusFactory } from '@tsdi/core';
import { HttpStatusFactory } from '../status';
import { HttpExecptionHandlers } from './exception-filter';


export const HTTP_SERVR_PROVIDERS = [
    HttpExecptionHandlers,
    { provide: StatusFactory, useExisting: HttpStatusFactory },
]
