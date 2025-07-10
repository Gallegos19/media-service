import { Prisma, PrismaClient } from '@prisma/client';
import { Entity } from '../../../shared/domain/Entity';
import { UniqueEntityID } from '../../../shared/domain/UniqueEntityID';
import { logger } from '../../../shared/infrastructure/logger';

export abstract class BasePrismaRepository<
  TEntity extends Entity<any>,
  TPrismaModel,
  TModelName extends keyof PrismaClient
> {
  protected readonly prisma: PrismaClient;
  protected readonly model: TModelName;

  constructor(prisma: PrismaClient, model: TModelName) {
    this.prisma = prisma;
    this.model = model;
  }

  protected abstract toDomain(raw: TPrismaModel): TEntity;
  protected abstract toPersistence(entity: TEntity): any;

  protected getModelClient() {
    return this.prisma[this.model];
  }

  protected async executeQuery<T>(query: () => Promise<T>): Promise<T> {
    try {
      return await query();
    } catch (error) {
      logger.error(`Error in ${this.constructor.name}:`, error);
      throw error;
    }
  }

  protected mapToDomainEntities(records: TPrismaModel[]): TEntity[] {
    return records.map(record => this.toDomain(record));
  }

  protected createPaginationResult<T>(
    items: T[],
    total: number,
    page: number,
    pageSize: number
  ) {
    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      hasNext: page * pageSize < total,
      hasPrevious: page > 1,
    };
  }

  protected parseId(id: string | UniqueEntityID): string {
    return id instanceof UniqueEntityID ? id.toString() : id;
  }

  protected ensureEntityIsValid(entity: TEntity): void {
    if (!(entity instanceof Entity)) {
      throw new Error('Entity must extend the base Entity class');
    }
  }
}
