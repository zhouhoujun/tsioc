import { Abstract } from '@tsdi/ioc';
import { ClientHandler } from '@tsdi/common/client';
import { TcpRequest } from './request';


@Abstract()
export abstract class TcpHandler extends ClientHandler<TcpRequest> {

}
