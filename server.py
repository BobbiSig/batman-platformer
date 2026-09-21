"""
DARK KNIGHT RUN — combined static file server + 2-player WebSocket relay.

Serves the game files (index.html, game.js, style.css, net.js) AND the
relay endpoint (/ws) from a single port, so the whole game is reachable
through one URL — which matters for tunneling (e.g. a Cloudflare quick
tunnel) since a tunnel only exposes one local port at a time.

Relay behavior (the /ws endpoint) is unchanged from the original two-server
setup: it doesn't understand the game at all, it just hands out roles and
forwards JSON messages between exactly two connected browsers.

  - The first browser to connect becomes "host" and runs the actual game
    (physics, enemies, bosses) as Batman.
  - The second becomes "guest" and plays Robin: it sends its key presses
    to the host and renders whatever game state the host sends back.
  - A third connection is told the room is full.
"""

import json
import os
from pathlib import Path

from aiohttp import web, WSMsgType

ROOT = Path(__file__).parent

HOST_SLOT = {"ws": None}
GUEST_SLOT = {"ws": None}


async def send(ws, payload):
    try:
        await ws.send_json(payload)
    except Exception:
        pass


async def ws_handler(request):
    ws = web.WebSocketResponse(heartbeat=4)
    await ws.prepare(request)

    role = None

    if HOST_SLOT["ws"] is None:
        role = "host"
        HOST_SLOT["ws"] = ws
        await send(ws, {"type": "role", "role": "host"})
        print("host connected")
    elif GUEST_SLOT["ws"] is None:
        role = "guest"
        GUEST_SLOT["ws"] = ws
        await send(ws, {"type": "role", "role": "guest"})
        if HOST_SLOT["ws"] is not None:
            await send(HOST_SLOT["ws"], {"type": "peer_joined"})
        print("guest connected")
    else:
        await send(ws, {"type": "full"})
        await ws.close()
        print("rejected extra connection (room full)")
        return ws

    try:
        async for msg in ws:
            if msg.type != WSMsgType.TEXT:
                continue
            try:
                data = json.loads(msg.data)
            except ValueError:
                continue

            if role == "host" and data.get("type") == "state":
                if GUEST_SLOT["ws"] is not None:
                    await send(GUEST_SLOT["ws"], data)
            elif role == "guest" and data.get("type") == "input":
                if HOST_SLOT["ws"] is not None:
                    await send(HOST_SLOT["ws"], data)
    finally:
        if role == "host" and HOST_SLOT["ws"] is ws:
            HOST_SLOT["ws"] = None
            print("host disconnected")
            if GUEST_SLOT["ws"] is not None:
                await send(GUEST_SLOT["ws"], {"type": "host_left"})
        elif role == "guest" and GUEST_SLOT["ws"] is ws:
            GUEST_SLOT["ws"] = None
            print("guest disconnected")
            if HOST_SLOT["ws"] is not None:
                await send(HOST_SLOT["ws"], {"type": "peer_left"})

    return ws


def main():
    port = int(os.environ.get("PORT", 8000))  # Render (and other PaaS hosts) assign this
    app = web.Application()
    app.router.add_get("/ws", ws_handler)
    app.router.add_static("/", ROOT, show_index=False)
    print(f"serving http://0.0.0.0:{port}  (relay at /ws)")
    web.run_app(app, host="0.0.0.0", port=port)


if __name__ == "__main__":
    main()
