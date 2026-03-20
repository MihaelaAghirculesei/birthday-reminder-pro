import { InlineTranslateLoader } from './inline-translate-loader';

describe('InlineTranslateLoader', () => {
  let loader: InlineTranslateLoader;

  beforeEach(() => {
    loader = new InlineTranslateLoader();
  });

  it('should return English translations for "en"', (done) => {
    loader.getTranslation('en').subscribe(translations => {
      expect(translations).toBeTruthy();
      expect(typeof translations).toBe('object');
      done();
    });
  });

  it('should return Italian translations for "it"', (done) => {
    loader.getTranslation('it').subscribe(translations => {
      expect(translations).toBeTruthy();
      expect(typeof translations).toBe('object');
      done();
    });
  });

  it('should fall back to English for an unknown language', (done) => {
    loader.getTranslation('fr').subscribe(translations => {
      loader.getTranslation('en').subscribe(en => {
        expect(translations).toEqual(en);
        done();
      });
    });
  });

  it('should return an observable (synchronous of())', (done) => {
    let emitted = false;
    loader.getTranslation('en').subscribe(() => {
      emitted = true;
    });
    expect(emitted).toBeTrue();
    done();
  });
});
