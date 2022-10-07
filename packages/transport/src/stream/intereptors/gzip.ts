import { Client, Endpoint, EndpointContext, Interceptor, Server, TransportStrategyOpts } from '@tsdi/core';
import { from, mergeMap, Observable, zip } from 'rxjs';
import { Readable, Writable, pipeline, PassThrough } from 'stream';
import * as zlib from 'zlib';
import { pmPipeline } from '../../utils';


export class GunzipInterceptor implements Interceptor<Readable, Readable> {

    intercept(req: Readable, next: Endpoint<Readable, Readable>, context: EndpointContext): Observable<Readable> {
        const options = context.get(TransportStrategyOpts).zlibOptions;
        if (context.target instanceof Server) {
            return from(this.unzip(req, options)).pipe(mergeMap(r => next.handle(r, context)));
        } else {
            return next.handle(req, context)
                .pipe(
                    mergeMap(r => this.unzip(r, options))
                )
        }
    }

    async unzip(readable: Readable, options?: zlib.ZlibOptions) {
        const body = pipeline(readable, new PassThrough({ objectMode: true }), (err) => {
            throw err;
        });

        const unzip = zlib.createGunzip(options);
        await pmPipeline(body, unzip);
        return unzip;
    }

}