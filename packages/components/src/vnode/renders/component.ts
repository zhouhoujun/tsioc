import { HostMapping } from '../../decorators';
import { RendererMapping } from '../../router/render';

@HostMapping('/compoent', RendererMapping)
export class RenderComponent {

    @HostMapping('/:selector', 'create')
    render(selector: string) {

    }

    @HostMapping('/:selector', 'update')
    refresh(selector: string) {

    }
    
}
