import { Abstract } from '@tsdi/ioc';
import { AbstractRequestHandler, RequestContext } from '@tsdi/endpoints';
import { TcpServerOpts } from './options';


@Abstract()
export abstract class TcpRequestHandler extends AbstractRequestHandler<RequestContext, TcpServerOpts> {

}

