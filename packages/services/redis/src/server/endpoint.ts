import { Abstract } from '@tsdi/ioc';
import { TransportEndpoint } from '@tsdi/endpoints';

@Abstract()
export abstract class RedisEndpoint extends TransportEndpoint {

}
