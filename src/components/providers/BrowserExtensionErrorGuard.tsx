"use client";

import { useEffect } from "react";

function isExtensionError(payload: {
  filename?: string;
  message?: string;
  stack?: string;
}) {
  return (
    payload.filename?.startsWith("chrome-extension://") === true ||
    payload.stack?.includes("chrome-extension://") === true ||
    payload.message?.includes("MetaMask") === true
  );
}

export function BrowserExtensionErrorGuard() {
  useEffect(() => {
    const previousOnError = window.onerror;
    const previousOnUnhandledRejection = window.onunhandledrejection;

    const handleError = (event: ErrorEvent) => {
      if (
        isExtensionError({
          filename: event.filename,
          message: event.message,
          stack: event.error?.stack,
        })
      ) {
        event.preventDefault();
      }
    };

    window.onerror = (message, source, _lineno, _colno, error) => {
      if (
        isExtensionError({
          filename: typeof source === "string" ? source : undefined,
          message: typeof message === "string" ? message : undefined,
          stack: error?.stack,
        })
      ) {
        return true;
      }

      if (typeof previousOnError === "function") {
        return previousOnError(message, source, _lineno, _colno, error);
      }

      return false;
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason =
        typeof event.reason === "object" && event.reason !== null
          ? {
              message:
                "message" in event.reason &&
                typeof event.reason.message === "string"
                  ? event.reason.message
                  : undefined,
              stack:
                "stack" in event.reason && typeof event.reason.stack === "string"
                  ? event.reason.stack
                  : undefined,
            }
          : {
              message:
                typeof event.reason === "string" ? event.reason : undefined,
              stack: undefined,
            };

      if (isExtensionError(reason)) {
        event.preventDefault();
      }
    };

    window.onunhandledrejection = (event) => {
      const reason =
        typeof event.reason === "object" && event.reason !== null
          ? {
              message:
                "message" in event.reason &&
                typeof event.reason.message === "string"
                  ? event.reason.message
                  : undefined,
              stack:
                "stack" in event.reason && typeof event.reason.stack === "string"
                  ? event.reason.stack
                  : undefined,
            }
          : {
              message:
                typeof event.reason === "string" ? event.reason : undefined,
              stack: undefined,
            };

      if (isExtensionError(reason)) {
        event.preventDefault();
        return true;
      }

      if (typeof previousOnUnhandledRejection === "function") {
        return previousOnUnhandledRejection.call(window, event);
      }

      return false;
    };

    window.addEventListener("error", handleError, true);
    window.addEventListener("unhandledrejection", handleUnhandledRejection, true);

    return () => {
      window.onerror = previousOnError;
      window.onunhandledrejection = previousOnUnhandledRejection;
      window.removeEventListener("error", handleError, true);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection, true);
    };
  }, []);

  return null;
}
