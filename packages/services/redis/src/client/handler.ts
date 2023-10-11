import { Abstract } from '@tsdi/ioc';
import { ClientHandler } from '@tsdi/common/client';


/**
 * Redis handler.
 */
@Abstract()
export abstract class RedisHandler extends ClientHandler {

}
