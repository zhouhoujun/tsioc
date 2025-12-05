import { Abstract } from '@tsdi/ioc';
import { ServiceHandler, HttpServConfig } from '@tsdi/endpoints';
import { HttpContext } from './context';

@Abstract()
export abstract class HttpRequestHandler extends ServiceHandler<HttpContext, HttpServConfig> {
    
}
