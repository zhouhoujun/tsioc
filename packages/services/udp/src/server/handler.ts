import { Abstract } from '@tsdi/ioc';
import { AbstractRequestHandler, RequestContext } from '@tsdi/endpoints';
import { UdpServConfig } from './options';


@Abstract()
export abstract class UdpRequestHandler extends AbstractRequestHandler<RequestContext, UdpServConfig> {

}
