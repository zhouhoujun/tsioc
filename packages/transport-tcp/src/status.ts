import { GET, MESSAGE } from '@tsdi/core';
import { Injectable } from '@tsdi/ioc';
import { HttpStatusVaildator } from '@tsdi/transport';


@Injectable({ static: true })
export class TcpStatusVaildator extends HttpStatusVaildator {

    constructor() {
        super()
    }

    redirectDefaultMethod(): string {
        return GET;
    }

}


@Injectable({ static: true })
export class TcpMicroStatusVaildator extends HttpStatusVaildator {

    constructor() {
        super()
    }

    redirectDefaultMethod(): string {
        return MESSAGE;
    }

}
