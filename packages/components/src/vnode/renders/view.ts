import { HostMapping } from '../../decorators';
import { RendererMapping } from '../../router/render';

@HostMapping('/view', RendererMapping)
export class RenderView {

    @HostMapping('/:selector', 'create')
    render(selector: string) {
        this.enterView();
        this.leaveView();
    }

    @HostMapping('/:selector', 'update')
    refresh(selector: string) {

    }

    enterView(){

    }

    leaveView() {

    }
}
