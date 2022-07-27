import { Endpoint, HandlerBinding } from '@tsdi/core';
import { Injectable } from '@tsdi/ioc';
import { ev } from '../../consts';
import { TcpContext } from './context';
import { TcpServerOpts } from './options';

@Injectable()
export class TcpHandlerBinding implements HandlerBinding<TcpContext> {
    binding(ctx: TcpContext, handler: Endpoint): void {
        const req = ctx.request;
        const cancel = handler.handle(req, ctx)
            .subscribe({
                complete: () => {
                    ctx.destroy()
                }
            });
        const opts = ctx.target.getOptions() as TcpServerOpts;
        opts.timeout && req.socket.setTimeout(opts.timeout, () => {
            req.socket.emit(ev.TIMEOUT);
            cancel?.unsubscribe()
        });
        ctx.request.socket.on(ev.TIMEOUT, () => {
            cancel?.unsubscribe();
        })
        ctx.request.socket.on(ev.CLOSE, () => {
            cancel?.unsubscribe();
        });
    }

}
