
import { Abstract } from '@tsdi/ioc';

@Abstract()
export abstract class Transformer<TRequest = any, TResponse = any> {
    abstract decode(req: TRequest): TRequest;
    abstract encode(res: TResponse): TResponse;
}
