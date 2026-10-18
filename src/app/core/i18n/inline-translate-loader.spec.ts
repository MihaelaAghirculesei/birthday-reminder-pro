import { firstValueFrom } from 'rxjs';

import { InlineTranslateLoader } from './inline-translate-loader';

describe('InlineTranslateLoader', () => {
  let loader: InlineTranslateLoader;

  beforeEach(() => {
    loader = new InlineTranslateLoader();
  });

  it('should return English translations for "en"', async () => {
    const translations = await firstValueFrom(loader.getTranslation('en'));
    expect(translations).toBeTruthy();
    expect(typeof translations).toBe('object');
  });

  it('should return Italian translations for "it"', async () => {
    const translations = await firstValueFrom(loader.getTranslation('it'));
    expect(translations).toBeTruthy();
    expect(typeof translations).toBe('object');
  });

  it('should fall back to English for an unknown language', async () => {
    const translations = await firstValueFrom(loader.getTranslation('fr'));
    const en = await firstValueFrom(loader.getTranslation('en'));
    expect(translations).toEqual(en);
  });

  it('should return an observable (synchronous of())', async () => {
    let emitted = false;
    loader.getTranslation('en').subscribe(() => {
      emitted = true;
    });
    expect(emitted).toBe(true);
  });
});
