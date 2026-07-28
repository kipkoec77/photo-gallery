import { config as loadDotenv } from "dotenv";

let loaded = false;

export function loadScriptEnv(): void {
  if (loaded) {
    return;
  }

  loadDotenv({ path: ".env" });
  loadDotenv({ path: ".env.local", override: true });

  loaded = true;
}