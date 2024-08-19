import { Injectable } from '@tsdi/ioc';
import { ResponseFactory, ResponseInitOpts } from '@tsdi/common';
import { HttpErrorResponse, HttpEvent, HttpResponse } from '@tsdi/common/http';


@Injectable()
export class HttpResponseEventFactory implements ResponseFactory<number> {
    create<T>(options: ResponseInitOpts): HttpEvent<any> | HttpErrorResponse {
        if (options.ok === false || options.error) {
            if(!options.error){
                options.error = options.payload;
            }
            return new HttpErrorResponse(options);
        } else {
            return new HttpResponse(options)
        }
    }
}