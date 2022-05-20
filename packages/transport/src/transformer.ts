
import { Abstract } from '@tsdi/ioc';

@Abstract()
export abstract class Transformer<TRequest = any, TResponse = any> {
    abstract encode(res: TResponse): TResponse;
    abstract decode(req: TRequest): TRequest;
}


@Abstract()
export abstract class ClientTransformer<TRequest = any, TResponse = any> {
    abstract encode(req: TRequest): TRequest;
    abstract decode(res: TResponse): TResponse;
}
