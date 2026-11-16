const path = require("path");
const http = require("http");
const { resolveAccess, hasToken, tokenMatches, hostAllowed, originAllowed, sessionCookie } = require("./worldadmin/Access.WorldAdmin");
const { HttpError, readJson, send } = require("./worldadmin/Http.WorldAdmin");
const { installConsoleCapture, linesAfter } = require("./testpanel/Logs.TestPanel");
const Actions = require("./testpanel/Actions.TestPanel");

// A personal test/dev control panel, beside the world config page (WorldAdmin). Where that page
// edits world settings, plugins and accounts, this one drives the running game: teleport, give
// items, set stats, spawn NPCs, run any ::command as an online player, broadcast, watch the logs.
//   TEST_PANEL_PORT (default 49500, or 49500 + WT_SLOT in a scripts/wt worktree)
//   TEST_PANEL_TOKEN (fixed token); otherwise one is kept in data/definitions/test-panel.token
// It always listens on 127.0.0.1 only. The startup log prints the link and where the token is.

const DEFAULT_PORT = 49500;
const TOKEN_FILE_NAME = "test-panel.token";
const PAGE_FILE = path.join(__dirname, "testpanel", "page.html");
// The world config page's fonts and icons, so both pages look alike.
const SHARED_ASSET_DIRECTORY = path.join(__dirname, "worldadmin", "panel");
const SHARED_ASSETS = new Map([
  ["favicon.svg", "image/svg+xml"],
  ["favicon-96x96.png", "image/png"],
  ...[400, 500, 600].map((weight) => [`fonts/plex-sans-${weight}.woff2`, "font/woff2"]),
]);

let pluginApi = null;
let httpServer = null;

function panelPort(env = process.env) {
  const raw = String(env.TEST_PANEL_PORT ?? "").trim();
  if (raw) {
    const port = Number(raw);
    if (Number.isInteger(port) && port >= 0 && port <= 65535) return port;
  }
  const slot = Number(env.WT_SLOT);
  return Number.isInteger(slot) && slot >= 1 && slot <= 99 ? DEFAULT_PORT + slot : DEFAULT_PORT;
}

function sendFile(response, file, contentType, cacheControl = "no-store") {
  require("fs").readFile(file, (error, body) => {
    if (error) return send(response, 404, "Not found.");
    response.writeHead(200, {
      "Content-Type": contentType,
      "Cache-Control": cacheControl,
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Referrer-Policy": "no-referrer",
    });
    response.end(body);
  });
}

const GET_ROUTES = {
  "/api/state": (url) => Actions.stateAction(pluginApi.core),
  "/api/player": (url) => Actions.playerAction(pluginApi.core, url.searchParams.get("name")),
  "/api/commands": () => Actions.commandsAction(pluginApi),
  "/api/loadouts": () => Actions.loadoutsAction(pluginApi.core),
  "/api/items": (url) => Actions.itemsAction(pluginApi.core, url.searchParams.get("q")),
  "/api/npcs": (url) => Actions.npcsAction(pluginApi.core, url.searchParams.get("q")),
  "/api/logs": (url) => ({ lines: linesAfter(Number(url.searchParams.get("after")) || 0) }),
};

const POST_ROUTES = {
  "/api/command": (body) => Actions.commandAction(pluginApi.core, body),
  "/api/loadout": (body) => Actions.loadoutAction(pluginApi.core, body),
  "/api/broadcast": (body) => Actions.broadcastAction(pluginApi.core, body),
  "/api/save-all": () => Actions.saveAllAction(pluginApi.core),
};

function createHandler(access, port) {
  async function route(request, response) {
    if (!hostAllowed(request, port, true)) return send(response, 403, { error: "Host not allowed" });
    const url = new URL(request.url ?? "/", "http://localhost");
    const method = request.method ?? "GET";
    if (method === "GET" && url.pathname === "/" && url.searchParams.has("token")) {
      if (!tokenMatches(url.searchParams.get("token"), access.token)) return send(response, 401, { error: "Unauthorized" });
      return send(response, 302, "", { Location: "/", "Set-Cookie": sessionCookie(access.token, port, false) });
    }
    if (!hasToken(request, access.token, port)) return send(response, 401, { error: "Unauthorized" });
    if (url.pathname === "/" && method === "GET") return sendFile(response, PAGE_FILE, "text/html; charset=utf-8");
    if (method === "GET" && url.pathname.startsWith("/panel/")) {
      const asset = url.pathname.slice("/panel/".length);
      const contentType = SHARED_ASSETS.get(asset);
      if (!contentType) throw new HttpError(404, "Not found");
      return sendFile(response, path.join(SHARED_ASSET_DIRECTORY, asset), contentType, "private, max-age=86400");
    }

    const get = GET_ROUTES[url.pathname];
    if (get) {
      if (method !== "GET") throw new HttpError(405, "Method not allowed");
      return send(response, 200, await get(url));
    }
    const post = POST_ROUTES[url.pathname];
    if (!post) throw new HttpError(404, "Not found");
    if (method !== "POST") throw new HttpError(405, "Method not allowed");
    if (!originAllowed(request)) throw new HttpError(403, "Cross-origin request refused");
    return send(response, 200, await post(await readJson(request)));
  }

  return function handleRequest(request, response) {
    route(request, response).catch((error) => {
      if (response.headersSent) return response.end();
      if (error instanceof HttpError) return send(response, error.status, { error: error.message });
      console.error(`[test-panel] request failed: ${error?.stack ?? error}`);
      send(response, 500, { error: error?.message ?? "Internal error; see the server log" });
    });
  };
}

async function startTestPanel() {
  installConsoleCapture();
  if (process.env.BROWSER_HOST === "1" || httpServer) return;
  const port = panelPort();
  const tokenFile = path.join(path.resolve("data/definitions"), TOKEN_FILE_NAME);
  // Access.WorldAdmin reads the WORLD_ADMIN_* names; hand it this panel's own values instead.
  const access = resolveAccess({ WORLD_ADMIN_TOKEN: process.env.TEST_PANEL_TOKEN, WORLD_ADMIN_PORT: String(port) }, { tokenFile });
  for (const note of access.notes) console.warn(`[test-panel] ${note}`);
  const server = http.createServer(createHandler(access, port));
  const listening = await new Promise((resolve) => {
    server.on("error", (error) => {
      console.error(`[test-panel] server error: ${error.message}`);
      resolve(false);
    });
    server.listen(port, "127.0.0.1", () => resolve(true));
  });
  if (!listening) return;
  server.unref();
  httpServer = server;
  const where = access.tokenSource === "env" ? "TEST_PANEL_TOKEN" : `token from ${path.relative(process.cwd(), tokenFile).split(path.sep).join("/")}`;
  console.info(`[test-panel] test control panel: http://localhost:${port}/?token=<${where}>`);
}

module.exports = {
  name: "TestPanel",
  description: "Local test/dev control panel: drive the running game (teleport, items, stats, NPCs, commands, logs).",
  register(api) {
    pluginApi = api;
    api.onServerStartup(startTestPanel);
  },
  _test: { panelPort },
};
