export class ChronoidError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class InvalidNodeId extends ChronoidError {}
export class InvalidWorkerId extends ChronoidError {}
export class SequenceExhausted extends ChronoidError {}
export class InvalidId extends ChronoidError {}
export class ParseError extends ChronoidError {}
