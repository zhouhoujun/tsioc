import { REQUEST_BODY } from '@tsdi/boot';
import { Inject } from 'packages/ioc/src/decor/decorators';
import { HostMapping } from '../../decorators'
import { LView, RootContext, View } from '../interfaces/view';

@HostMapping('/render/view')
export class RenderView {

    @HostMapping('/:selector', 'create')
    render(selector: string) {
        this.enterView();
        this.leaveView();
    }

    @HostMapping('/:selector', 'update')
    refresh(selector: string) {
        this.enterView();
        this.leaveView();
    }

    @HostMapping('/detech_changes', 'check')
    detech(@Inject(REQUEST_BODY) body: { view: View, lview: LView, context: any }) {

    }

    @HostMapping('/check_nochanges', 'check')
    checkNoChange(@Inject(REQUEST_BODY) body: { view: View, lview: LView, context: any  }) {

    }


    enterView() {

    }

    leaveView() {

    }
}


@HostMapping('/render/rootview')
export class RenderRootView {

    @HostMapping('/:selector', 'create')
    render(selector: string) {
        this.enterView();
        this.leaveView();
    }

    @HostMapping('/:selector', 'update')
    refresh(selector: string) {
        this.enterView();
        this.leaveView();
    }

    @HostMapping('/detech_changes', 'check')
    detech(@Inject(REQUEST_BODY) body: { context: RootContext }) {

    }

    @HostMapping('/check_nochanges', 'check')
    checkNoChange(@Inject(REQUEST_BODY) body: { context: RootContext }) {

    }

    enterView() {

    }

    leaveView() {

    }
}

