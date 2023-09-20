
import { Context, Encoder } from '@tsdi/common';
import { ArgumentExecption, Injectable } from '@tsdi/ioc';
import { Observable, of } from 'rxjs';
import { Buffer } from 'buffer';


@Injectable()
export class JsonEncoder implements Encoder {

    handle(ctx: Context): Observable<Buffer> {
        if (ctx.raw) return of(ctx.raw);
        if (!ctx || !ctx.packet) throw new ArgumentExecption('json decoding input empty');
        const pkg = ctx.packet;
        ctx.raw = Buffer.from(JSON.stringify(pkg));
        return of(ctx.raw);

    }

}

