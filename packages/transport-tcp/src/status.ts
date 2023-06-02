import { GET, MESSAGE } from '@tsdi/core';
import { Inject, Injectable, tokenId } from '@tsdi/ioc'
import { HttpStatusVaildator } from '@tsdi/transport';


export const TCP_MICRO_SERV = tokenId<boolean>('TCP_MICRO_SERV');

@Injectable({ static: true })
export class TcpStatusVaildator extends HttpStatusVaildator {

    constructor(@Inject(TCP_MICRO_SERV) private micro: boolean) {
        super()
    }

    redirectDefaultMethod(): string {
        return this.micro ? MESSAGE : GET;
    }

}
