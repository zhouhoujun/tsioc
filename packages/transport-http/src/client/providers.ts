import { StatusVaildator } from '@tsdi/transport';
import { HttpStatusVaildator } from '../status';

export const HTTP_CLIENT_PROVIDERS = [
    HttpStatusVaildator,
    { provide: StatusVaildator, useExisting: HttpStatusVaildator }
]
