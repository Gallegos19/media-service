export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export class PaginatedResultImpl<T> implements PaginatedResult<T> {
  constructor(
    public readonly items: T[],
    public readonly total: number,
    public readonly page: number,
    public readonly pageSize: number
  ) {}

  get totalPages(): number {
    return Math.ceil(this.total / this.pageSize);
  }

  get hasNext(): boolean {
    return this.page < this.totalPages;
  }

  get hasPrevious(): boolean {
    return this.page > 1;
  }

  static create<T>(items: T[], total: number, page: number, pageSize: number): PaginatedResult<T> {
    return new PaginatedResultImpl(items, total, page, pageSize);
  }
}
