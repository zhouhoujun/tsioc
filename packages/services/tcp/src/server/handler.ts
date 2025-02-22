import { Abstract } from '@tsdi/ioc';
import { AbstractRequestHandler, RequestContext } from '@tsdi/endpoints';
import { TcpServConfig } from './options';


@Abstract()
export abstract class TcpRequestHandler extends AbstractRequestHandler<RequestContext, TcpServConfig> {

}

