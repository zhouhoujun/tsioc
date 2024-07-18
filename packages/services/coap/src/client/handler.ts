import { Abstract } from '@tsdi/ioc';
import { ClientHandler } from '@tsdi/common/client';
import { CoapRequest } from './request';


/**
 * Coap handler.
 */
@Abstract()
export abstract class CoapHandler extends ClientHandler<CoapRequest<any>> {

}
