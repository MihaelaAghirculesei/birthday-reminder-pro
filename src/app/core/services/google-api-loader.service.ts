import { Injectable } from '@angular/core';
import type { Gapi } from './google-api.types';

declare const gapi: Gapi;

/**
 * Responsible for loading the external Google GAPI and GIS scripts and
 * initialising the GAPI client. Stateless beyond the two loaded flags.
 */
@Injectable({ providedIn: 'root' })
export class GoogleApiLoaderService {
  isGapiLoaded = false;
  isGisLoaded = false;

  loadGapiScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isGapiLoaded || typeof gapi !== 'undefined') {
        this.isGapiLoaded = true;
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.async = true;
      script.defer = true;

      script.onload = () => {
        const check = () => {
          if (typeof gapi !== 'undefined') {
            this.isGapiLoaded = true;
            resolve();
          } else {
            setTimeout(check, 100);
          }
        };
        check();
      };

      script.onerror = () => reject(new Error('Failed to load Google API script'));
      document.head.appendChild(script);
    });
  }

  loadGisScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isGisLoaded || (window.google && window.google.accounts)) {
        this.isGisLoaded = true;
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;

      script.onload = () => {
        const check = () => {
          if (window.google && window.google.accounts) {
            this.isGisLoaded = true;
            resolve();
          } else {
            setTimeout(check, 100);
          }
        };
        check();
      };

      script.onerror = () => reject(new Error('Failed to load Google Identity Services script'));
      document.head.appendChild(script);
    });
  }

  initGapiClient(discoveryDoc: string): Promise<void> {
    return new Promise((resolve, reject) => {
      gapi.load('client', async () => {
        try {
          await gapi.client.init({ discoveryDocs: [discoveryDoc] });
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    });
  }
}
