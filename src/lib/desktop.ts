import { invoke } from "@tauri-apps/api/core";
import { openPath } from "@tauri-apps/plugin-opener";
import { mockBootstrapState } from "../data/mock";
import type { AppConfig, BootstrapState } from "../types/app";

async function invokeOrMock<T>(command: string, payload?: Record<string, unknown>) {
  try {
    return await invoke<T>(command, payload);
  } catch {
    if (command === "get_bootstrap_state") {
      return structuredClone(mockBootstrapState) as T;
    }

    if (command === "load_config") {
      return structuredClone(mockBootstrapState.config) as T;
    }

    if (command === "save_config") {
      return structuredClone((payload?.config as AppConfig) ?? mockBootstrapState.config) as T;
    }

    throw new Error(`Command "${command}" failed and no mock fallback is available.`);
  }
}

export async function getBootstrapState() {
  return invokeOrMock<BootstrapState>("get_bootstrap_state");
}

export async function loadConfig() {
  return invokeOrMock<AppConfig>("load_config");
}

export async function saveConfig(config: AppConfig) {
  return invokeOrMock<AppConfig>("save_config", { config });
}

export async function revealPath(path: string) {
  await openPath(path);
}
