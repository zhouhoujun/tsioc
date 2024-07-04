import { Injectable } from '@tsdi/ioc';
import { ResponseEvent, ResponseFactory, ResponseInitOpts } from '@tsdi/common';
import { HttpErrorResponse, HttpEvent, HttpHeaderResponse, HttpResponse } from '@tsdi/common/http';


@Injectable()
export class HttpResponseEventFactory implements ResponseFactory<number> {
    create<T>(options: ResponseInitOpts): HttpEvent<any> | HttpErrorResponse {
        if (options.ok === false || options.error) {
            return new HttpErrorResponse(options);
        } else {
            return new HttpResponse(options)
        }
    }
}