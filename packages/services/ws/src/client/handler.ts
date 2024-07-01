import { Abstract } from '@tsdi/ioc';
import { ClientHandler } from '@tsdi/common/client';
import { WsRequest } from './request';


/**
 * WS handler.
 */
@Abstract()
export abstract class WsHandler extends ClientHandler<WsRequest<any>> {

}
