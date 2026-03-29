/**
 * Event buffer for physics -> sound/recording communication.
 * Ported from recorder.cpp event buffer.
 */

export enum WavEvent {
  None = 0,
  Bump = 1,
  Dead = 2,
  Win = 3,
  Food = 4,
  Turn = 5,
  RightVolt = 6,
  LeftVolt = 7,
}

interface BufferedEvent {
  eventId: WavEvent;
  volume: number;
  objectId: number;
}

export class EventBuffer {
  private events: BufferedEvent[] = [];

  add(eventId: WavEvent, volume: number, objectId: number): void {
    this.events.push({ eventId, volume, objectId });
  }

  reset(): void {
    this.events.length = 0;
  }

  get(): BufferedEvent | null {
    if (this.events.length === 0) return null;
    return this.events.shift()!;
  }

  get length(): number {
    return this.events.length;
  }
}
