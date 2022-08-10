import { Endpoint } from '@tsdi/core';
import { Injectable, lang } from '@tsdi/ioc';
import { ev } from '@tsdi/transport';
import { HttpContext } from './context';
import { HttpServerOpts } from './options';

@Injectable()
export class HttpHandlerBinding {
    binding(ctx: HttpContext, handler: Endpoint): void {
        const req = ctx.request;
        const cancel = handler.handle(req, ctx)
            .subscribe({
                complete: () => {
                    ctx.destroy()
                }
            });
        const opts = ctx.target.getOptions() as HttpServerOpts;
        opts.timeout && req.setTimeout(opts.timeout, () => {
            req.emit(ev.TIMEOUT);
            cancel?.unsubscribe()
        });
        req.once(ev.CLOSE, async () => {
            await lang.delay(opts.closeDelay ?? 500);
            cancel?.unsubscribe();
            if (!ctx.sent) {
                ctx.response.end()
            }
        })
    }

}
