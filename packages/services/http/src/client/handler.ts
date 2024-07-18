import { Abstract } from '@tsdi/ioc';
import { ClientHandler } from '@tsdi/common/client';
import { HttpEvent, HttpRequest } from '@tsdi/common/http';
import { HttpClientOpts } from './options';


@Abstract()
export abstract class HttpHandler extends ClientHandler<HttpRequest<any>, HttpEvent<any>, HttpClientOpts> {

}
