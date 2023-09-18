import { Abstract } from '@tsdi/ioc';
import { AssetContext as BaseAssetContext } from '@tsdi/endpoints';
import { StatusVaildator } from './StatusVaildator';
import { FileAdapter } from './FileAdapter';
import { StreamAdapter } from './StreamAdapter';

/**
 * abstract mime asset transport context.
 * 
 * 类型资源传输节点上下文
 */
@Abstract()
export abstract class AssetContext<TRequest = any, TResponse = any, TStatus = any, TServOpts = any> extends BaseAssetContext<TRequest, TResponse, TStatus, TServOpts> {

    abstract get serverOptions(): TServOpts;

    /**
     * status vaildator
     */
    abstract get vaildator(): StatusVaildator<TStatus>;
    /**
     * file adapter
     */
    abstract get fileAdapter(): FileAdapter;

    /**
     * stream adapter
     */
    abstract get streamAdapter(): StreamAdapter;

}
