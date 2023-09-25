import { Abstract } from '@tsdi/ioc';
import { ClientHandler, MicroClientHandler } from '@tsdi/common/client';


/**
 * WS handler.
 */
@Abstract()
export abstract class WsMicroHandler extends MicroClientHandler {

}

/**
 * WS handler.
 */
@Abstract()
export abstract class WsHandler extends ClientHandler {

}
