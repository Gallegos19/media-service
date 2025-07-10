import { validate as uuidValidate } from 'uuid';

export class UniqueEntityID {
  private readonly value: string;

  constructor(id?: string) {
    this.value = id ? id : this.generateUuid();
    if (!this.isValid()) {
      throw new Error('Invalid UUID format');
    }
  }

  private generateUuid(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  private isValid(): boolean {
    return uuidValidate(this.value);
  }

  public toString(): string {
    return this.value;
  }

  public toValue(): string {
    return this.value;
  }

  public equals(id?: UniqueEntityID): boolean {
    if (id === null || id === undefined) {
      return false;
    }
    if (!(id instanceof UniqueEntityID)) {
      return false;
    }
    return id.toValue() === this.value;
  }
}
