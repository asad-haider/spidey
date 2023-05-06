export class DiscardItemError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = 'DiscardItem';
  }
}
