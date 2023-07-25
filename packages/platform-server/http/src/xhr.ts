/* eslint-disable no-useless-escape */
import { Module, EMPTY_OBJ, Injectable, Injector, ProviderType } from '@tsdi/ioc';
import { HTTP_LISTEN_OPTS } from '@tsdi/core';
import { DOCUMENT,  PLATFORM_ID, PLATFORM_SERVER_ID } from '@tsdi/common';
import { HttpBackend, HttpEvent, HttpHandler, HttpInterceptingHandler, HttpRequest, XhrFactory } from '@tsdi/common/http';
import { XMLHttpRequest2 } from './xhr.request';
import { Observable } from 'rxjs';
import * as domino from 'domino';

@Injectable()
export class ServerXhr implements XhrFactory {
  build() {
    return new XMLHttpRequest2() as any
  }
}

const isAbsoluteUrl = /^[a-zA-Z\-\+.]+:\/\//;

/**
 * http client backend.
 */
export class HttpClientBackend implements HttpBackend {

  constructor(private backend: HttpBackend, private injector: Injector) {

  }

  handle(req: HttpRequest<any>): Observable<HttpEvent<any>> {
    return new Observable(observer => process.nextTick(() => {
      let request: HttpRequest;
      if (!isAbsoluteUrl.test(req.url)) {
        const { host, port, path, withCredentials } = req.context?.get(HTTP_LISTEN_OPTS) ?? this.injector.get(HTTP_LISTEN_OPTS, EMPTY_OBJ);
        const protocol = (req.withCredentials || withCredentials) ? 'https' : 'http';
        const urlPrefix = `${protocol}://${host ?? 'localhost'}:${port ?? 3000}${path ?? ''}`;
        const baseUrl = new URL(urlPrefix);
        const url = new URL(req.url, baseUrl);
        request = req.clone({ url: url.toString() })
      } else {
        request = req
      }
      this.backend.handle(request).subscribe(observer)
    }))
  }

}

function interceptingHandler(backend: HttpBackend, injector: Injector) {
  const realBackend: HttpBackend = new HttpInterceptingHandler(backend, injector);
  return new HttpClientBackend(realBackend, injector)
}


export const HTTP_PROVIDERS: ProviderType[] = [
  { provide: PLATFORM_ID, useValue: PLATFORM_SERVER_ID },
  { provide: DOCUMENT, useValue: domino.createDocument() },
  { provide: XhrFactory, useClass: ServerXhr },
  { provide: HttpHandler, useFactory: interceptingHandler, deps: [HttpBackend, Injector] }
];


@Module({
  providers: [
    ...HTTP_PROVIDERS
  ]
})
export class ServerHttpClientModule {

}