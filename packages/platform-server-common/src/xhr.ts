/* eslint-disable no-useless-escape */
/* eslint-disable @typescript-eslint/triple-slash-reference */
/// <reference path="./type.d.ts" />
import { EMPTY_OBJ, Injectable, Injector, InvocationContext, ProviderType, tokenId } from '@tsdi/ioc';
import { Module } from '@tsdi/core';
import { DOCUMENT, HttpBackend, HttpEvent, HttpHandler, HttpInterceptingHandler, HttpRequest, PLATFORM_ID, PLATFORM_SERVER_ID, XhrFactory } from '@tsdi/common';
import * as xhr2 from 'xmlhttprequest-ssl';
import { Observable } from 'rxjs';
import * as domino from 'domino';
import { HTTP_LISTENOPTIONS } from '@tsdi/platform-server';

@Injectable()
export class ServerXhr implements XhrFactory {
  build(): XMLHttpRequest {
    return new xhr2.XMLHttpRequest()
  }
}


const isAbsoluteUrl = /^[a-zA-Z\-\+.]+:\/\//;

/**
 * http client backend.
 */
export class HttpClientBackend implements HttpBackend {

  constructor(private backend: HttpBackend, private injector: Injector) {

  }

  handle(req: HttpRequest<any>, context: InvocationContext): Observable<HttpEvent<any>> {
    return new Observable(observer => process.nextTick(() => {
      let request: HttpRequest;
      if (!isAbsoluteUrl.test(req.url)) {
        const { host, port, path, withCredentials } = context?.get(HTTP_LISTENOPTIONS) ?? this.injector.get(HTTP_LISTENOPTIONS, EMPTY_OBJ);
        const protocol = (req.withCredentials || withCredentials) ? 'https' : 'http';
        const urlPrefix = `${protocol}://${host ?? 'localhost'}:${port ?? 3000}${path ?? ''}`;
        const baseUrl = new URL(urlPrefix);
        const url = new URL(req.url, baseUrl);
        request = req.clone({ url: url.toString() })
      } else {
        request = req
      }
      this.backend.handle(request, context).subscribe(observer)
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