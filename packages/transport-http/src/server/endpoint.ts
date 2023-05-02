import { Abstract } from '@tsdi/ioc';
import { AssetEndpoint } from '@tsdi/core';
import { HttpContext, HttpServResponse } from './context';

@Abstract()
export abstract class HttpEndpoint extends AssetEndpoint<HttpContext, HttpServResponse> {
    
}