/// <reference path="./type.d.ts" />
import { EMPTY_OBJ, Injectable, Injector, InvocationContext, ProviderType } from '@tsdi/ioc';
import { HttpBackend, HttpEvent, HttpHandler, HttpInterceptingHandler, HttpRequest, SERVEROPTION, XhrFactory } from '@tsdi/core';
import * as xhr2 from 'xhr2';
import { Observable } from 'rxjs';


@Injectable()
export class ServerXhr implements XhrFactory {
  build(): XMLHttpRequest {
    return new xhr2.XMLHttpRequest();
  }
}


const isAbsoluteUrl = /^[a-zA-Z\-\+.]+:\/\//;

export class HttpClientBackend implements HttpBackend {

  constructor(private backend: HttpBackend, private injector: Injector) {

  }

  handle(req: HttpRequest<any>, context?: InvocationContext): Observable<HttpEvent<any>> {
    return new Observable(observer => process.nextTick(() => {
      const { hostname, port } = this.injector.get(SERVEROPTION) ?? EMPTY_OBJ;

      let request: HttpRequest;
      const protocol = req.withCredentials? 'https' : 'http';
      if (!isAbsoluteUrl.test(req.url)) {
        const urlPrefix = `${protocol}://${hostname ?? 'localhost'}:${port?? 3000}`;
        const baseUrl = new URL(urlPrefix);
        const url = new URL(req.url, baseUrl);
        request = req.clone({ url: url.toString() });
      } else {
        request = req;
      }
      this.backend.handle(request, context).subscribe(observer);
    }));
  }

}

function interceptingHandler(backend: HttpBackend, injector: Injector) {
  const realBackend: HttpBackend = new HttpInterceptingHandler(backend, injector);
  return new HttpClientBackend(realBackend, injector);
}


export const HTTP_PROVIDERS: ProviderType[] = [
  { provide: XhrFactory, useClass: ServerXhr },
  { provide: HttpHandler, useFactory: interceptingHandler, deps: [HttpBackend, Injector] }
];
