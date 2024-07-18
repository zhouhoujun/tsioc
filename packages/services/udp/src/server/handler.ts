import { Abstract } from '@tsdi/ioc';
import { AbstractRequestHandler, RequestContext } from '@tsdi/endpoints';
import { UdpServerOpts } from './options';


@Abstract()
export abstract class UdpRequestHandler extends AbstractRequestHandler<RequestContext, UdpServerOpts> {

}
