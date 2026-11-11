import { Injectable, Autowired } from '@tsdi/ioc';

@Injectable()
export class PrecompiledService {
    @Autowired()
    name = '';

    run(): string {
        return this.name;
    }
}
