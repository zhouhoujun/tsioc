import { MESSAGE } from '@tsdi/core';
import { Injectable } from '@tsdi/ioc';
import { HttpStatusVaildator } from '@tsdi/transport';



@Injectable({ static: true })
export class WsStatusVaildator extends HttpStatusVaildator {

    constructor() {
        super()
    }

    redirectDefaultMethod(): string {
        return MESSAGE;
    }

}
