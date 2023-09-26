import { MESSAGE } from '@tsdi/common';
import { Injectable } from '@tsdi/ioc';
import { HttpStatusVaildator } from '@tsdi/endpoints/assets';



@Injectable({ static: true })
export class WsStatusVaildator extends HttpStatusVaildator {

    constructor() {
        super()
    }

    redirectDefaultMethod(): string {
        return MESSAGE;
    }

}
