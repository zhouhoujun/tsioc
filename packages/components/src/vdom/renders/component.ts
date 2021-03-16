import { HostMapping } from '../../decorators';

@HostMapping('/render/component')
export class RenderComponent {

    @HostMapping('/:selector', 'create')
    render(selector: string) {

    }

    @HostMapping('/:selector', 'update')
    refresh(selector: string) {

    }
    
}
