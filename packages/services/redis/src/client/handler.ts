import { Abstract } from '@tsdi/ioc';
import { ClientHandler } from '@tsdi/common/client';
import { RedisRequest } from './request';


/**
 * Redis handler.
 */
@Abstract()
export abstract class RedisHandler extends ClientHandler<RedisRequest<any>> {

}
