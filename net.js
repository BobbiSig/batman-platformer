// ---------------------------------------------------------------------------
// NET — minimal WebSocket client for the 2-player relay (server.py).
//
// The first browser to load the page becomes "host" and runs the real game;
// the second becomes "guest" and plays Robin. If no relay server is
// reachable (e.g. the file was opened directly, or the server isn't
// running), NET.role stays null and the game just plays solo, exactly as
// it always has — this module never blocks single-player.
// ---------------------------------------------------------------------------
const NET = (() => {
  let ws = null;
  let role = null; // 'host' | 'guest' | null (offline / solo)
  let guestConnected = false;
  let resolved = false;
  const listeners = {};

  function on(evt, fn) {
    (listeners[evt] || (listeners[evt] = [])).push(fn);
  }

  function emit(evt, data) {
    (listeners[evt] || []).forEach((fn) => {
      try { fn(data); } catch (e) { console.error(e); }
    });
  }

  function settleOffline() {
    if (resolved) return;
    resolved = true;
    role = null;
    emit("role", null);
  }

  function connect() {
    if (!location.hostname) { settleOffline(); return; }

    let url;
    try {
      const proto = location.protocol === "https:" ? "wss:" : "ws:";
      url = `${proto}//${location.host}/ws`;
      ws = new WebSocket(url);
    } catch (e) {
      settleOffline();
      return;
    }

    const failTimer = setTimeout(settleOffline, 2500);

    ws.addEventListener("error", () => clearTimeout(failTimer) || settleOffline());
    ws.addEventListener("close", () => clearTimeout(failTimer) || settleOffline());

    ws.addEventListener("message", (ev) => {
      let msg;
      try { msg = JSON.parse(ev.data); } catch (e) { return; }

      if (msg.type === "role") {
        clearTimeout(failTimer);
        resolved = true;
        role = msg.role === "full" ? null : msg.role;
        emit("role", role);
      } else if (msg.type === "full") {
        clearTimeout(failTimer);
        settleOffline();
      } else if (msg.type === "peer_joined") {
        guestConnected = true;
        emit("peerJoin");
      } else if (msg.type === "peer_left") {
        guestConnected = false;
        emit("peerLeave");
      } else if (msg.type === "host_left") {
        emit("hostLeft");
      } else if (msg.type === "state") {
        emit("state", msg.state);
      } else if (msg.type === "input") {
        emit("input", msg.input);
      }
    });
  }

  function sendState(state) {
    if (role === "host" && ws && ws.readyState === WebSocket.OPEN) {
      try { ws.send(JSON.stringify({ type: "state", state })); } catch (e) {}
    }
  }

  function sendInput(input) {
    if (role === "guest" && ws && ws.readyState === WebSocket.OPEN) {
      try { ws.send(JSON.stringify({ type: "input", input })); } catch (e) {}
    }
  }

  connect();

  return {
    on,
    sendState,
    sendInput,
    get role() { return role; },
    get guestConnected() { return guestConnected; },
  };
})();
