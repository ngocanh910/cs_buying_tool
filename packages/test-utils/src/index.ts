import type { Clock, EventPublisher, IdGenerator } from "@csgoempire-bot/contracts";

export class FakeClock implements Clock {
  public constructor(private current: Date) {}

  public now(): Date {
    return new Date(this.current);
  }

  public advanceMs(ms: number): void {
    this.current = new Date(this.current.getTime() + ms);
  }
}

export class DeterministicIdGenerator implements IdGenerator {
  private next = 0;

  public nextId(prefix: string): string {
    this.next += 1;
    return `${prefix}-${String(this.next)}`;
  }
}

export class InMemoryEventPublisher implements EventPublisher {
  public readonly events: { readonly type: string; readonly occurredAt: Date }[] = [];

  public publish(event: { readonly type: string; readonly occurredAt: Date }): Promise<void> {
    this.events.push(event);
    return Promise.resolve();
  }
}
