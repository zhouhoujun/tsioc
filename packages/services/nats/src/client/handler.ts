import { Abstract } from '@tsdi/ioc';
import { ClientHandler } from '@tsdi/common/client';
import { NatsRequest } from './request';


@Abstract()
export abstract class NatsHandler extends ClientHandler<NatsRequest<any>> {

}
