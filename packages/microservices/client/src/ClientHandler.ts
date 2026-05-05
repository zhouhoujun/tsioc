import { Abstract } from '@tsdi/ioc';
import { RequestHandler, AbstractRequest, ResponseEvent, RequestContext, ConfigableRequestHandler } from '@tsdi/common';
import { Observable } from 'rxjs';


/**
 * Microservice client handler.
 * 微服务客户端处理器
 */
@Abstract()
export abstract class ClientHandler<TReq, TRes> extends ConfigableRequestHandler<TReq, TRes, RequestContext> {

}


/**
 * Microservice client backend.
 * 微服务客户端后端
 */
@Abstract()
export abstract class ClientBackend<TReq, TRes> implements RequestHandler<TReq, TRes> {

    /**
     * handle micro client request.
     * 处理微服务客户端请求
     * @param req
     */
    abstract handle(req: TReq, context: RequestContext): Observable<TRes>;

}
