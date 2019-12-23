import { Type, ProviderTypes, isArray, ProviderParser, IocDesignAction, DesignActionContext } from '@tsdi/ioc';
import { ModuleLoader, IContainer } from '@tsdi/core';
import { CTX_MODULE_EXPORTS, CTX_MODULE_ANNOATION } from '../context-tokens';


export class RegModuleProvidersAction extends IocDesignAction {
    execute(ctx: DesignActionContext, next: () => void): void {
        let tRef = ctx.reflects;
        let annoation = ctx.get(CTX_MODULE_ANNOATION);

        let injector = ctx.injector;
        let continer = ctx.getContainer<IContainer>()
        let map = injector.getInstance(ProviderParser)
            .parse(...annoation.providers || []);
        // inject module providers
        if (annoation.components) {
            continer.use(map, ...annoation.components);
        }

        if (map.size) {
            ctx.injector.copy(map);
        }

        let exptypes: Type[] = injector.getInstance(ModuleLoader).getTypes(annoation.exports || []);

        exptypes.forEach(ty => {
            let reflect = tRef.get(ty);
            map.set(ty, (...pds: ProviderTypes[]) => injector.get(ty, ...pds));
            if (reflect && isArray(reflect.provides) && reflect.provides.length) {
                reflect.provides.forEach(p => {
                    if (!map.has(p)) {
                        map.set(p, (...pds: ProviderTypes[]) => injector.get(p, ...pds));
                    }
                });
            }
        });
        map.size && ctx.set(CTX_MODULE_EXPORTS, map);
        next();
    }
}
