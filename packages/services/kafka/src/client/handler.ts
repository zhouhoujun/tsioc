import { Abstract } from '@tsdi/ioc';
import { ClientHandler } from '@tsdi/common/client';
import { KafkaRequest } from './request';


@Abstract()
export abstract class KafkaHandler extends ClientHandler<KafkaRequest<any>> {

}
