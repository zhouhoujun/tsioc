import { StatusFactory } from '@tsdi/core';
import { HttpStatusFactory } from '../status';

export const HTTP_CLIENT_PROVIDERS = [
    { provide: StatusFactory, useExisting: HttpStatusFactory }
]
