import { Injectable } from '@tsdi/ioc';
import { RespondAdapter } from '@tsdi/endpoints';
import { HttpContext } from './context';

@Injectable()
export class HttpRespondAdapter extends RespondAdapter {

    protected override statusMessage(ctx: HttpContext, status: number): string {
        if (ctx.request.httpVersionMajor >= 2) {
            return String(status)
        } else {
            return ctx.statusMessage || String(status)
        }
    }
}