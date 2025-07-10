import { UploadSession } from '../entities/UploadSession';

export interface IUploadSessionRepository {
  findById(id: string): Promise<UploadSession | null>;
  findByToken(token: string): Promise<UploadSession | null>;
  save(uploadSession: UploadSession): Promise<void>;
  update(uploadSession: UploadSession): Promise<void>;
  delete(id: string): Promise<boolean>;
  deleteExpiredSessions(expirationDate: Date): Promise<number>;
  findByUserId(userId: string): Promise<UploadSession[]>;
}
