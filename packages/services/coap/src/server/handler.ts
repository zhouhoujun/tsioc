import { Abstract } from '@tsdi/ioc';
import { AbstractRequestHandler, RequestContext } from '@tsdi/endpoints';
import { CoapServConfig } from './options';


@Abstract()
export abstract class CoapRequestHandler extends AbstractRequestHandler<RequestContext, CoapServConfig> {

}
