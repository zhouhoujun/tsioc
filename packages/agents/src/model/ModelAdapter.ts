import { Abstract } from '@tsdi/ioc';
import { ModelRequest } from './ModelRequest';
import { ModelResponse } from './ModelResponse';

@Abstract()
export abstract class ModelAdapter {
    abstract complete(request: ModelRequest): Promise<ModelResponse>;
}
