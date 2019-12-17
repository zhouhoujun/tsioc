import { Type, ProviderTypes, isArray, ProviderParser } from '@tsdi/ioc';
import { AnnoationAction } from './AnnoationAction';
import { AnnoationContext } from '../AnnoationContext';
import { CTX_MODULE_EXPORTS } from '../../context-tokens';


export class RegModuleProvidersAction extends AnnoationAction {
    execute(ctx: AnnoationContext, next: () => void): void {
        let container = ctx.getContainer();
        let tRef = ctx.reflects;
        let annoation = ctx.annoation;

        let injector = ctx.injector;
        let map = container.getInstance(ProviderParser)
            .parse(...annoation.providers);
        // inject module providers
        if (annoation.providers && annoation.providers.length) {
            ctx.injector.copy(map);
        }

        let exptypes: Type[] = container.getLoader().getTypes(annoation.exports || []);

        exptypes.forEach(ty => {
            let reflect = tRef.get(ty);
            map.set(ty, (...pds: ProviderTypes[]) => injector.resolve(ty, ...pds));
            if (reflect && isArray(reflect.provides) && reflect.provides.length) {
                reflect.provides.forEach(p => {
                    if (!map.has(p)) {
                        map.set(p, (...pds: ProviderTypes[]) => injector.resolve(p, ...pds));
                    }
                });
            }
        });
        map.size && ctx.set(CTX_MODULE_EXPORTS, map);
        next();
    }
}
