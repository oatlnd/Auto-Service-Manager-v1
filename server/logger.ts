import { storage } from "./storage";
import type { InsertSystemLog, LOG_LEVELS, LOG_SOURCES } from "@shared/schema";

type LogLevel = typeof LOG_LEVELS[number];
type LogSource = typeof LOG_SOURCES[number];

interface LogContext {
  endpoint?: string;
  method?: string;
  userId?: string;
  userName?: string;
  statusCode?: number;
  context?: Record<string, any>;
  stack?: string;
}

class Logger {
  private async log(level: LogLevel, source: LogSource, message: string, ctx?: LogContext) {
    const logData: InsertSystemLog = {
      level,
      source,
      message,
      endpoint: ctx?.endpoint,
      method: ctx?.method,
      userId: ctx?.userId,
      userName: ctx?.userName,
      statusCode: ctx?.statusCode,
      context: ctx?.context,
      stack: ctx?.stack,
    };

    try {
      await storage.createSystemLog(logData);
    } catch (err) {
      console.error("Failed to persist log:", err);
    }

    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] [${source}] ${message}`;
    
    if (level === "error") {
      console.error(logMessage, ctx?.stack || "");
    } else if (level === "warn") {
      console.warn(logMessage);
    } else {
      console.log(logMessage);
    }
  }

  info(source: LogSource, message: string, ctx?: LogContext) {
    return this.log("info", source, message, ctx);
  }

  warn(source: LogSource, message: string, ctx?: LogContext) {
    return this.log("warn", source, message, ctx);
  }

  error(source: LogSource, message: string, ctx?: LogContext) {
    return this.log("error", source, message, ctx);
  }

  apiError(message: string, ctx?: LogContext) {
    return this.log("error", "api", message, ctx);
  }

  apiInfo(message: string, ctx?: LogContext) {
    return this.log("info", "api", message, ctx);
  }

  systemError(message: string, ctx?: LogContext) {
    return this.log("error", "system", message, ctx);
  }

  systemInfo(message: string, ctx?: LogContext) {
    return this.log("info", "system", message, ctx);
  }
}

export const logger = new Logger();
