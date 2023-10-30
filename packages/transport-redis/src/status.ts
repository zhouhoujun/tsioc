import { MESSAGE } from '@tsdi/common';
import { Injectable } from '@tsdi/ioc';
import { HttpStatusVaildator } from '@tsdi/transport';


@Injectable({ static: true })
export class RedisStatusVaildator extends HttpStatusVaildator {

    redirectDefaultMethod(): string {
        return MESSAGE;
    }
}
