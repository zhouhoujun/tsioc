import { Injectable } from '@tsdi/ioc';
import { TransportExecptionHandlers } from '@tsdi/transport';
import { HttpContext } from './context';
import { HTTP_SERV_OPTS } from './options';



@Injectable({ static: true })
export class HttpExecptionHandlers extends TransportExecptionHandlers {

    protected detailError(ctx: HttpContext): boolean {
        return ctx.get(HTTP_SERV_OPTS).detailError == true
    }

}
