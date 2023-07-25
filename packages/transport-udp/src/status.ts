import { MESSAGE } from '@tsdi/common';
import { Injectable } from '@tsdi/ioc';
import { HttpStatusVaildator } from '@tsdi/transport';



@Injectable({ static: true })
export class UdpStatusVaildator extends HttpStatusVaildator {

    constructor() {
        super()
    }

    redirectDefaultMethod(): string {
        return MESSAGE;
    }

}
