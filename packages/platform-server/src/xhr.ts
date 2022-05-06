/// <reference path="./type.d.ts" />
import { EMPTY_OBJ, Injectable, Injector, InvocationContext, ProviderType, tokenId } from '@tsdi/ioc';
import { HttpBackend, HttpEvent, HttpHandler, HttpInterceptingHandler, HttpRequest, Module, XhrFactory } from '@tsdi/core';
// import * as xhr2 from 'xhr2';
import * as xhr2 from 'xmlhttprequest-ssl';
import { ListenOptions } from 'net';
import { Observable } from 'rxjs';
import { ServerModule } from './ServerModule';


@Injectable()
export class ServerXhr implements XhrFactory {
  build(): XMLHttpRequest {
    return new xhr2.XMLHttpRequest();
  }
}


const isAbsoluteUrl = /^[a-zA-Z\-\+.]+:\/\//;

/**
 * http listen options.
 */
export interface HttpListenOptions extends ListenOptions {
  majorVersion?: number;
  withCredentials?: boolean;
}

/**
 *  http server ListenOptions.
 */
export const HTTP_LISTENOPTIONS = tokenId<HttpListenOptions>('HTTP_LISTENOPTIONS');

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


@Module({
  imports: [
    ServerModule
  ],
  providers: [
    ...HTTP_PROVIDERS
  ]
})
export class ServerHttpClientModule {

}