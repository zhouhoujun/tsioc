import { Injectable } from '@tsdi/ioc';
import { Endpoint, EndpointContext, Interceptor, TransportArgumentError } from '@tsdi/core';
import { Observable } from 'rxjs';
import { TcpNetConnectOpts, IpcNetConnectOpts } from 'net';
import { TcpClientOpts } from './options';
import { Request } from '../../request';
import { ResponseEvent } from '../../response';

const abstUrlExp = /^tcp:/;

@Injectable()
export class TcpPathInterceptor implements Interceptor<Request, ResponseEvent> {

    constructor(private option: TcpClientOpts) { }

    intercept(req: Request, next: Endpoint<Request, ResponseEvent>, context: EndpointContext): Observable<ResponseEvent> {
        let url = req.url.trim();
        if (!abstUrlExp.test(url)) {
            if (!this.option.connectOpts) throw new TransportArgumentError('no connect options.');
            if ((this.option.connectOpts as IpcNetConnectOpts).path && !(this.option.connectOpts as TcpNetConnectOpts).port) {
                // const { path } = this.option.connectOpts as IpcNetConnectOpts;
                const baseUrl = new URL('tcp://localhost/');
                url = new URL(url, baseUrl).toString();
            } else {
                const { host, port } = this.option.connectOpts as TcpNetConnectOpts;
                const urlPrefix = `tcp://${host ?? 'localhost'}:${port ?? 3000}`;
                const baseUrl = new URL(urlPrefix);
                url = new URL(url, baseUrl).toString();
            }
            req.url = url;
        }
        return next.handle(req, context);
    }
}
