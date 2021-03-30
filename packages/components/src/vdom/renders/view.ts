import { REQUEST_BODY } from '@tsdi/boot';
import { Inject } from 'packages/ioc/src/decor/decorators';
import { HostMapping } from '../../decorators'
import { LView, RootContext, View } from '../interfaces/view';

/**
 * default render.
 */
@HostMapping('/render')
export class RenderView {

    @HostMapping('/:type/:selector', 'create')
    render(selector: string) {
        this.enterView();
        this.leaveView();
    }

    @HostMapping('/:type/:selector', 'update')
    refresh(selector: string) {
        this.enterView();
        this.leaveView();
    }

    @HostMapping('/:type/:view/detech_changes', 'change')
    detech(type: string, view: string, @Inject(REQUEST_BODY) body: { view: View, lview: LView, context: any }) {
        
    }

    @HostMapping('/:type/:view/check_nochanges', 'nochange')
    checkNoChange(type: string, view: string, @Inject(REQUEST_BODY) body: { view: View, lview: LView, context: any }) {

    }


    enterView() {

    }

    leaveView() {

    }
}

