export interface GapiCalendarListResponse {
  result: {
    items: { id: string; summary: string }[];
  };
}

export interface GapiEventResponse {
  result: {
    id?: string;
    [key: string]: unknown;
  };
}

export interface GapiCalendarList {
  list(): Promise<GapiCalendarListResponse>;
}

export interface GapiEvents {
  insert(params: unknown): Promise<GapiEventResponse>;
  update(params: unknown): Promise<GapiEventResponse>;
  delete(params: unknown): Promise<GapiEventResponse>;
}

export interface GapiCalendar {
  calendarList: GapiCalendarList;
  events: GapiEvents;
}

export interface GapiTokenObject {
  access_token: string;
}

export interface GapiClient {
  calendar: GapiCalendar;
  init(config: {
    discoveryDocs: string[];
  }): Promise<void>;
  load(api: string, version: string): Promise<void>;
  setToken(tokenObject: GapiTokenObject | null): void;
  getToken(): GapiTokenObject | null;
}

export interface Gapi {
  client: GapiClient;
  load(libraries: string, callback: () => void): void;
}

declare global {
  interface Window {
    gapi?: Gapi;
  }
}
