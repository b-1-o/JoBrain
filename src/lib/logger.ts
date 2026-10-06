/* eslint-disable no-console */
/**
 * Application logger. This is the ONLY module allowed to call console.*.
 * Everywhere else import { logger } from "@/lib/logger".
 */

import { env } from "@/lib/env";

type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function resolveMinLevel(): LogLevel {
  // Production always suppresses debug/info regardless of LOG_LEVEL
  if (process.env.NODE_ENV === "production") {
    return "warn";
  }
  return env.LOG_LEVEL;
}

function shouldLog(level: LogLevel): boolean {
  return LEVEL_ORDER[level] >= LEVEL_ORDER[resolveMinLevel()];
}

type Meta = Record<string, unknown>;

function formatMessage(
  level: LogLevel,
  message: string,
  meta?: Meta | unknown,
): unknown[] {
  const prefix = `[${level.toUpperCase()}]`;
  if (meta === undefined) {
    return [prefix, message];
  }
  return [prefix, message, meta];
}

export const logger = {
  debug(message: string, meta?: Meta): void {
    if (!shouldLog("debug")) return;
    console.debug(...formatMessage("debug", message, meta));
  },

  info(message: string, meta?: Meta): void {
    if (!shouldLog("info")) return;
    console.info(...formatMessage("info", message, meta));
  },

  warn(message: string, meta?: Meta): void {
    if (!shouldLog("warn")) return;
    console.warn(...formatMessage("warn", message, meta));
  },

  error(message: string, error?: unknown): void {
    if (!shouldLog("error")) return;
    console.error(...formatMessage("error", message, error));
  },
};

export type Logger = typeof logger;
