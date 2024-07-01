import { Abstract } from '@tsdi/ioc';
import { ClientHandler } from '@tsdi/common/client';
import { UdpRequest } from './request';


/**
 * UDP handler.
 */
@Abstract()
export abstract class UdpHandler extends ClientHandler<UdpRequest<any>> {

}
