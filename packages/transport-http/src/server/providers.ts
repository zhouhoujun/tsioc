import { HttpStatusVaildator } from '../status';
import { StatusVaildator } from '@tsdi/transport';

export const HTTP_SERVR_PROVIDERS = [
    { provide: StatusVaildator, useClass: HttpStatusVaildator },
]
