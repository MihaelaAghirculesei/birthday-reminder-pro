import { Component, Input, ChangeDetectionStrategy, OnChanges, SimpleChanges } from '@angular/core';

import { ZODIAC_SIGNS } from '../utils/date/zodiac.util';

@Component({
    selector: 'app-zodiac-icon',
    imports: [],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <button class="zodiac-button"
            [class]="'zodiac-' + zodiacSign?.toLowerCase()"
            [title]="tooltipText"
            type="button">
      {{ symbol }}
    </button>
  `,
    styles: [`
    .zodiac-button {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      border: 3px solid transparent;
      background: transparent;
      font-size: 38px;
      font-weight: bold;
      cursor: help;
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      line-height: 1;
      text-align: center;
      vertical-align: middle;

      &::before {
        content: '';
        position: absolute;
        top: -3px;
        left: -3px;
        right: -3px;
        bottom: -3px;
        border-radius: 50%;
        background: linear-gradient(45deg, currentColor, transparent, currentColor);
        z-index: -1;
        opacity: 0;
        transition: opacity 0.4s ease;
      }

      &:hover {
        transform: scale(1.1);
        filter: drop-shadow(0 0 8px currentColor);

        &::before {
          opacity: 0.3;
          animation: rotate 2s linear infinite;
        }
      }

      &:focus {
        outline: none;
        filter: drop-shadow(0 0 12px currentColor);

        &::before {
          opacity: 0.5;
        }
      }
    }

    @keyframes rotate {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .zodiac-button[class*="zodiac-"] {
      background-origin: border-box !important;
      background-clip: content-box, border-box !important;
    }

    .zodiac-aries, .zodiac-leo, .zodiac-sagittarius {
      color: #e74c3c;
      background-image: linear-gradient(white, white),
                       linear-gradient(45deg, #e74c3c, #f39c12, #e74c3c) !important;
    }

    .zodiac-taurus, .zodiac-virgo, .zodiac-capricorn {
      color: #27ae60;
      background-image: linear-gradient(white, white),
                       linear-gradient(45deg, #27ae60, #2ecc71, #27ae60) !important;
    }

    .zodiac-gemini, .zodiac-libra, .zodiac-aquarius {
      color: #3498db;
      background-image: linear-gradient(white, white),
                       linear-gradient(45deg, #3498db, #5dade2, #3498db) !important;
    }

    .zodiac-cancer, .zodiac-scorpio, .zodiac-pisces {
      color: #9b59b6;
      background-image: linear-gradient(white, white),
                       linear-gradient(45deg, #9b59b6, #bb8fce, #9b59b6) !important;
    }

    .zodiac-button:not([class*="zodiac-"]) {
      color: #95a5a6;
      background-image: linear-gradient(white, white),
                       linear-gradient(45deg, #95a5a6, #bdc3c7, #95a5a6) !important;
      background-origin: border-box !important;
      background-clip: content-box, border-box !important;
    }

    :host-context(body.dark-theme) .zodiac-aries,
    :host-context(body.dark-theme) .zodiac-leo,
    :host-context(body.dark-theme) .zodiac-sagittarius,
    :host-context(body.dark-theme) .zodiac-taurus,
    :host-context(body.dark-theme) .zodiac-virgo,
    :host-context(body.dark-theme) .zodiac-capricorn,
    :host-context(body.dark-theme) .zodiac-gemini,
    :host-context(body.dark-theme) .zodiac-libra,
    :host-context(body.dark-theme) .zodiac-aquarius,
    :host-context(body.dark-theme) .zodiac-cancer,
    :host-context(body.dark-theme) .zodiac-scorpio,
    :host-context(body.dark-theme) .zodiac-pisces,
    :host-context(body.dark-theme) .zodiac-button:not([class*="zodiac-"]) {
      background-image: linear-gradient(#1a1a1a, #1a1a1a), linear-gradient(45deg, currentColor, transparent, currentColor) !important;
    }
  `]
})
export class ZodiacIconComponent implements OnChanges {
  @Input() zodiacSign?: string;

  symbol = '?';
  tooltipText = 'Unknown zodiac sign';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['zodiacSign']) {
      this.updateZodiacData();
    }
  }

  private updateZodiacData(): void {
    const zodiacData = this.zodiacSign
      ? ZODIAC_SIGNS.find(sign => sign.name.toLowerCase() === this.zodiacSign!.toLowerCase())
      : null;

    if (zodiacData) {
      this.symbol = zodiacData.symbol;
      this.tooltipText = `${zodiacData.name} (${zodiacData.element} sign)`;
    } else {
      this.symbol = '?';
      this.tooltipText = 'Unknown zodiac sign';
    }
  }
}