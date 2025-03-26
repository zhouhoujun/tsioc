import { Injectable, Injector } from '@tsdi/ioc';
import { Around, JoinPoint } from '@tsdi/aop';

@Injectable()
export class ChangeDetector {
  private dirtyComponents = new Set<any>();
  private scheduled = false;

  constructor(private injector: Injector) {}

  markDirty(component: any) {
    this.dirtyComponents.add(component);
    this.scheduleCheck();
  }

  private scheduleCheck() {
    if (!this.scheduled) {
      requestAnimationFrame(() => {
        this.dirtyComponents.forEach(comp => comp.detectChanges());
        this.dirtyComponents.clear();
        this.scheduled = false;
      });
      this.scheduled = true;
    }
  }
}
