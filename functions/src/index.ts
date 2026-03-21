import { setGlobalOptions } from "firebase-functions";
import { onRequest } from "firebase-functions/v2/https";
import * as path from "path";

setGlobalOptions({ maxInstances: 10 });

// Type for the Express-compatible handler exported by the Angular SSR bundle.
type ExpressHandler = (req: unknown, res: unknown) => void;

// Cache the initialised Express app across warm-start invocations.
// On cold start, the bundle is imported and app() is called once.
let cachedApp: ExpressHandler | undefined;

async function getAngularApp(): Promise<ExpressHandler> {
  if (!cachedApp) {
    // The Angular SSR bundle is copied here by the predeploy script.
    // Dynamic import is used so the module is loaded lazily on first request,
    // keeping cold-start overhead minimal.
    const bundlePath = path.join(__dirname, "../angular-server/server.mjs");
    const bundle = (await import(bundlePath)) as { app: () => ExpressHandler };
    cachedApp = bundle.app();
  }
  return cachedApp;
}

export const ssr = onRequest(async (req, res) => {
  const angularApp = await getAngularApp();
  // req/res are Express-compatible at runtime (Firebase Functions v2 uses Express internally)
  angularApp(req, res);
});
