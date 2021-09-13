import { Inject } from '@tsdi/ioc';
import { REQUEST_BODY, RouteMapping } from '@tsdi/core';
import { LView, RootContext, View } from '../interfaces/view';

/**
 * default render.
 */
@RouteMapping('/render/view')
export class RenderView {

    @RouteMapping('/:type', 'render')
    render(type: string,  @Inject(REQUEST_BODY) body: { view: View, lview: LView, context: any }) {
        this.enterView();
        this.leaveView();
    }

    @RouteMapping('/:type', 'refresh')
    refresh(type: string,  @Inject(REQUEST_BODY) body: { view: View, lview: LView, context: any }) {
        this.enterView();
        this.leaveView();
    }

    @RouteMapping('/:type/:viewtype/detech_changes', 'change')
    detech(type: string, viewtype: number, @Inject(REQUEST_BODY) body: { view: View, lview: LView, context: any }) {

    }

    @RouteMapping('/:type/:viewtype/check_nochanges', 'nochange')
    checkNoChange(type: string, viewtype: number, @Inject(REQUEST_BODY) body: { view: View, lview: LView, context: any }) {

    }


    enterView() {

    }

    leaveView() {

    }
}

