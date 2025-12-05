import { Abstract } from '@tsdi/ioc';
import { AbstractRequestHandler, AbstractRequestContext } from '@tsdi/endpoints';
import { TcpServConfig } from './options';


@Abstract()
export abstract class TcpRequestHandler extends AbstractRequestHandler<AbstractRequestContext, TcpServConfig> {

}

