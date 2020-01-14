import { Injectable, Type, Refs, InjectToken, createRaiseContext, isToken, IInjector } from '@tsdi/ioc';
import { BuildContext } from '@tsdi/boot';
import { ActivityOption } from './ActivityOption';
import { Activity } from './Activity';
import { ActivityMetadata } from './ActivityMetadata';

/**
 * workflow context token.
 */
export const WorkflowContextToken = new InjectToken<ActivityContext>('WorkflowContext');


/**
 * activity execute context.
 *
 * @export
 * @class ActivityContext
 */
@Injectable
@Refs(Activity, BuildContext)
@Refs('@Task', BuildContext)
export class ActivityContext extends BuildContext<ActivityOption, ActivityMetadata> {

    static parse(injector: IInjector, target: Type | ActivityOption): ActivityContext {
        return createRaiseContext(injector, ActivityContext, isToken(target) ? { module: target } : target);
    }

}
