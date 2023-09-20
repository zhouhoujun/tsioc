import { InvalidJsonException, Packet, Context, Decoder } from '@tsdi/common';
import { ArgumentExecption, Injectable, isString } from '@tsdi/ioc';
import { Observable, of } from 'rxjs';

@Injectable()
export class JsonDecoder implements Decoder {

    handle(ctx: Context): Observable<Packet<any>> {
        if (ctx.packet) return of(ctx.packet);
        if (!ctx.raw) throw new ArgumentExecption('json decoding input empty');
        const jsonStr = isString(ctx.raw) ? ctx.raw : new TextDecoder().decode(ctx.raw);
        try {
            ctx.packet = JSON.parse(jsonStr);
            return of(ctx.packet ?? {});
        } catch (err) {
            throw new InvalidJsonException(err, jsonStr);
        }
    }

}