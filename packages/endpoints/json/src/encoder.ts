
import { Encoder, EncodingContext } from '@tsdi/common/client';
import { ArgumentExecption, Injectable } from '@tsdi/ioc';
import { Observable, of } from 'rxjs';
import { Buffer  } from 'buffer';


@Injectable()
export class JsonEncoder implements Encoder {

    encode(input: EncodingContext): Observable<Buffer> {
        return this.handle(input)
    }
    handle(input: EncodingContext): Observable<Buffer> {
        if (!input || !input.packet) throw new ArgumentExecption('json decoding input empty');
        const pkg = input.packet;

        return of(Buffer.from(JSON.stringify(pkg)));

    }

}

