(function () {
  "use strict";

  const ErrorCatcher = {
    errors: [],

    log(type, message, source = "", line = 0, column = 0) {
      const error = {
        type,
        message: String(message),
        source,
        line,
        column,
        time: new Date().toISOString(),
      };

      this.errors.push(error);

      console.error("[Game Error]", error);

      try {
        const saved = JSON.parse(localStorage.getItem("game_errors") || "[]");

        saved.push(error);

        // Keep only the latest 100 errors
        localStorage.setItem("game_errors", JSON.stringify(saved.slice(-100)));
      } catch (_) {}
    },

    getErrors() {
      return [...this.errors];
    },

    clear() {
      this.errors = [];
      localStorage.removeItem("game_errors");
    },
  };

  window.addEventListener("error", function (event) {
    ErrorCatcher.log(
      "JavaScript",
      event.message || "Unknown error",
      event.filename,
      event.lineno,
      event.colno,
    );
  });

  window.addEventListener("unhandledrejection", function (event) {
    ErrorCatcher.log(
      "Promise",
      event.reason?.stack || event.reason?.message || String(event.reason),
    );
  });

  window.ErrorCatcher = ErrorCatcher;

  console.log("[ErrorCatcher] Global error monitoring enabled.");
})();
async function errorcatchsayhi() {
  return "HELLO";
}
