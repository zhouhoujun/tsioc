import { Abstract } from '@tsdi/ioc';
import { ClientHandler } from '@tsdi/common/client';


/**
 * Coap handler.
 */
@Abstract()
export abstract class CoapHandler extends ClientHandler {

}
