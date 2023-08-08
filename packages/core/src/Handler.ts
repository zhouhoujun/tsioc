import { Observable } from 'rxjs';

/**
 * `Handler` is the fundamental building block of servers and clients.
 * 
 * 处理器，是服务端和客户端的基本构建块。
 */

export interface Handler<TInput = any, TOutput = any> {
    /**
     * handle.
     * 
     * 处理句柄
     * @param input request input.
     */
    handle(input: TInput): Observable<TOutput>;

    /**
     * is this equals to target or not
     * 
     * 该实例等于目标与否？
     * @param target 
     */
    equals?(target: any): boolean;
}


/**
 * Backend is backend handler of servers and clients.
 * 
 * 后段处理器，是服务端和客户端的最终处理器。
 */
export interface Backend<TInput = any, TOutput = any> extends Handler<TInput, TOutput> {
    /**
     * transport endpoint handle.
     * @param input request input.
     */
    handle(input: TInput): Observable<TOutput>;
}
