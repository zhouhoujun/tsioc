import { Endpoint } from '@tsdi/core';
import { Injectable } from '@tsdi/ioc';
import { ev } from '@tsdi/transport';
import { TcpContext } from './context';
import { TcpServerOpts } from './options';

@Injectable()
export class TcpHandlerBinding {
    binding(ctx: TcpContext, handler: Endpoint): void {
        const req = ctx.request;
        const cancel = handler.handle(req, ctx)
            .subscribe({
                complete: () => {
                    ctx.destroy()
                }
            });
        const opts = ctx.target.getOptions() as TcpServerOpts;
        opts.timeout && req.stream.setTimeout(opts.timeout, () => {
            req.stream.emit(ev.TIMEOUT);
            cancel?.unsubscribe()
        });
        ctx.request.stream.on(ev.TIMEOUT, () => {
            cancel?.unsubscribe();
        });
        ctx.request.stream.on(ev.CLOSE, () => {
            cancel?.unsubscribe();
        });
    }

}
