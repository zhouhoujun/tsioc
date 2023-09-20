import { Context, Encoder } from '@tsdi/common';
import { Observable } from 'rxjs';


export class AssetEncoder implements Encoder {
    handle(ctx: Context): Observable<Buffer> {
        throw new Error('Method not implemented.');
    }

}