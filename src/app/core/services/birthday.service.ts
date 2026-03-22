import { inject, Injectable } from '@angular/core';
import { Birthday, createSyncMetadata, updateSyncMetadata } from '../../shared/models/birthday.model';
import { DEFAULT_CATEGORY } from '../../shared';
import { IdGeneratorService } from './id-generator.service';
import { BirthdayNormalizationService } from './birthday-normalization.service';

@Injectable({ providedIn: 'root' })
export class BirthdayService {
  private readonly idGenerator = inject(IdGeneratorService);
  private readonly normalization = inject(BirthdayNormalizationService);

  prepareBirthdayForCreate(birthday: Omit<Birthday, 'id'>, userId: string | null): Birthday {
    const draft = {
      ...birthday,
      ...createSyncMetadata(userId),
      id: this.idGenerator.generateId(),
      category: birthday.category || DEFAULT_CATEGORY
    } as Birthday;
    return this.normalization.normalize(draft);
  }

  prepareBirthdayForUpdate(birthday: Birthday, userId: string | null): Birthday {
    return this.normalization.normalize({ ...birthday, ...updateSyncMetadata(birthday, userId) });
  }

  processTestBirthdays(birthdays: Birthday[]): Birthday[] {
    return birthdays.map(b => this.normalization.normalize({
      ...b,
      ...createSyncMetadata(null),
      id: this.idGenerator.generateId(),
      category: b.category || DEFAULT_CATEGORY
    }));
  }

  generateId(): string {
    return this.idGenerator.generateId();
  }
}
