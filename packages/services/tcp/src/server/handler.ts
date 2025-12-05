import { Abstract } from '@tsdi/ioc';
import { ServiceHandler, AbstractRequestContext } from '@tsdi/endpoints';
import { TcpServConfig } from './options';


@Abstract()
export abstract class TcpRequestHandler extends ServiceHandler<AbstractRequestContext, TcpServConfig> {

}

