import { REQUEST_BODY } from '@tsdi/boot';
import { Inject } from 'packages/ioc/src/decor/decorators';
import { HostMapping } from '../../decorators'
import { LView, RootContext, View } from '../interfaces/view';

/**
 * default render.
 */
@HostMapping('/render/view')
export class RenderView {

    @HostMapping('/:type', 'render')
    render(type: string,  @Inject(REQUEST_BODY) body: { view: View, lview: LView, context: any }) {
        this.enterView();
        this.leaveView();
    }

    @HostMapping('/:type', 'refresh')
    refresh(type: string,  @Inject(REQUEST_BODY) body: { view: View, lview: LView, context: any }) {
        this.enterView();
        this.leaveView();
    }

    @HostMapping('/:type/:viewtype/detech_changes', 'change')
    detech(type: string, viewtype: number, @Inject(REQUEST_BODY) body: { view: View, lview: LView, context: any }) {

    }

    @HostMapping('/:type/:viewtype/check_nochanges', 'nochange')
    checkNoChange(type: string, viewtype: number, @Inject(REQUEST_BODY) body: { view: View, lview: LView, context: any }) {

    }


    enterView() {

    }

    leaveView() {

    }
}

