export class ProxyFactory {
  static create(target: any, advisor: Advisor) {
    return new Proxy(target, {
      get: (obj, prop) => {
        // 应用前置通知
        advisor.applyBeforeAdvice(obj, prop);
        
        const result = Reflect.get(obj, prop);
        
        // 应用后置通知
        advisor.applyAfterAdvice(obj, prop, result);
        
        return result;
      }
    });
  }
}
