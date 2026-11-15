// A ring buffer of recent console output for the test panel's Logs tab. Installed once at server
// startup; the original console methods still run, so server.log and the terminal are unchanged.

const MAX_LINES = 1000;
const LEVELS = ["log", "info", "warn", "error"];

const lines = [];
let nextId = 1;
let installed = false;

function format(args) {
  return args.map((value) => {
    if (typeof value === "string") return value;
    if (value instanceof Error) return value.stack || value.message;
    try { return JSON.stringify(value); } catch { return String(value); }
  }).join(" ");
}

function installConsoleCapture() {
  if (installed) return;
  installed = true;
  for (const level of LEVELS) {
    const original = console[level].bind(console);
    console[level] = (...args) => {
      lines.push({ id: nextId++, at: Date.now(), level, text: format(args).slice(0, 4000) });
      if (lines.length > MAX_LINES) lines.splice(0, lines.length - MAX_LINES);
      original(...args);
    };
  }
}

/** Lines with an id above `after` (0 for all kept lines). */
function linesAfter(after = 0) {
  return lines.filter((line) => line.id > after);
}

module.exports = { installConsoleCapture, linesAfter };
