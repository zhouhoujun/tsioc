import { HostMapping } from '../../decorators';

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

    enterView(){

    }

    leaveView() {

    }
}
