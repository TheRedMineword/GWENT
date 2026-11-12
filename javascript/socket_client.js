"use strict";
(function (global) {
  const PING = "1";
  const PONG = "2";
  const TE = new TextEncoder();
  const TD = new TextDecoder();

  async function deflate(str) {
    const cs = new CompressionStream("deflate-raw");
    const w = cs.writable.getWriter();
    w.write(TE.encode(str));
    w.close();
    return new Uint8Array(await new Response(cs.readable).arrayBuffer());
  }

  async function inflate(buf) {
    const ds = new DecompressionStream("deflate-raw");
    const w = ds.writable.getWriter();
    w.write(buf);
    w.close();
    return TD.decode(await new Response(ds.readable).arrayBuffer());
  }

  class ResilientSocket {
    constructor(url, opts = {}) {
      this.url = url;
      this.opts = Object.assign(
        { maxOutbox: 1000, retryBaseMs: 400, retryMaxMs: 3000, debug: false },
        opts,
      );

      // public handlers (same names as WebSocket)
      this.onopen = null;
      this.onmessage = null;
      this.onclose = null;
      this.onerror = null;
      this.onstatus = null; // ("connecting"|"open"|"lost"|"resumed"|"failed", info)

      this._connected = false; // true after first successful handshake (gwent.js reads this)
      this.playerId = null;
      this.token = null;
      this.pingMs = 10000;
      this.graceMs = 15000;
      this.rtt = null;

      this.outSeq = 0; // last seq we assigned
      this.outbox = []; // {seq, bytes:Promise, sentOn}
      this.inSeq = 0; // last server seq we processed

      this.ws = null;
      this.ready = false; // handshake finished on current ws
      this.isResume = false;
      this.closedByUser = false;
      this.failed = false;
      this.lostAt = 0;
      this.attempt = 0;
      this.lastSeen = Date.now();
      this.lastPing = 0;
      this.pingSentAt = 0;
      this._rx = Promise.resolve(); // keeps inbound data frames in order
      this._tx = Promise.resolve(); // keeps outbound writes in order
      this._ackTimer = null;
      this._retryTimer = null;

      this._watch = setInterval(() => this._tick(), 1000);
      this._onPageHide = (e) => {
        if (!e.persisted) this.close();
      };
      global.addEventListener("pagehide", this._onPageHide);

      this._open();
    }

    get readyState() {
      if (this.closedByUser || this.failed) return 3;
      return this.ready && this.ws && this.ws.readyState === 1 ? 1 : 0;
    }

    /* ------------------------------------------------------------ public */

    /** Reliable send. Accepts JSON string or object. Never throws when offline - it queues. */
    sendJson(payload) {
      let obj;
      try {
        obj = typeof payload === "string" ? JSON.parse(payload) : payload;
      } catch (e) {
        console.error("[socket] payload is not JSON", e);
        return false;
      }
      if (!obj || typeof obj !== "object" || Array.isArray(obj)) return false;
      if (this.closedByUser || this.failed) return false;

      const msg = Object.assign({}, obj, { _s: ++this.outSeq });
      this.outbox.push({
        seq: msg._s,
        bytes: deflate(JSON.stringify(msg)),
        sentOn: null,
      });
      if (this.outbox.length > this.opts.maxOutbox) this.outbox.shift();
      this._flush();
      return true;
    }

    close() {
      if (this.closedByUser) return;
      this.closedByUser = true;
      clearInterval(this._watch);
      clearTimeout(this._retryTimer);
      global.removeEventListener("pagehide", this._onPageHide);
      try {
        if (this.ws && this.ws.readyState <= 1) this.ws.close(4000, "bye");
      } catch (e) {}
    }

    /** TEST HELPER: drop the underlying socket without telling the server (simulates network loss). */
    simulateDrop() {
      try {
        this.ws && this.ws.close(4001, "test drop");
      } catch (e) {}
    }

    /* --------------------------------------------------------- internals */

    _log(...a) {
      if (this.opts.debug) console.log("[socket]", ...a);
    }

    _status(s, info) {
      this._log("status", s, info || "");
      if (typeof this.onstatus === "function") {
        try {
          this.onstatus(s, info);
        } catch (e) {
          console.error(e);
        }
      }
    }

    _open() {
      let url = this.url;
      if (this.isResume && this.playerId) {
        url +=
          (url.includes("?") ? "&" : "?") +
          "resume=" +
          encodeURIComponent(this.playerId) +
          "&t=" +
          encodeURIComponent(this.token) +
          "&ack=" +
          this.inSeq;
      }
      if (url.includes("?")) {
        url = `${url}&`;
      } else {
        url = `${url}?`;
      }
      this._status("connecting", {
        attempt: this.attempt,
        resume: this.isResume,
      });

      let ws;
      try {
        ws = new WebSocket(
          `${url}auth=${window?.authtokensocket ?? "N/A" ?? "N/A"}`,
        );
      } catch (e) {
        return this._lost(e);
      }
      ws.binaryType = "arraybuffer";
      this.ws = ws;
      this.ready = false;
      this.lastSeen = Date.now();
      this.lastPing = Date.now();

      ws.onopen = () => {
        if (this.ws !== ws) return;
        this.lastSeen = Date.now();
        if (!this.isResume) {
          // fresh connection: server needs no handshake from us, we can send right away
          this.ready = true;
          this._flush();
          if (typeof this.onopen === "function") this.onopen({ type: "open" });
        }
      };

      ws.onmessage = (ev) => {
        if (this.ws !== ws) return;
        this.lastSeen = Date.now();
        if (typeof ev.data === "string") return this._control(ev.data);
        const bytes = new Uint8Array(ev.data);
        // inflate is async: chain so messages are handled strictly in arrival order
        this._rx = this._rx
          .then(() => inflate(bytes))
          .then((json) => this._data(JSON.parse(json)))
          .catch((err) => console.error("[socket] decode failed", err));
      };

      ws.onerror = () => {
        /* onclose always follows; handled there */
      };

      ws.onclose = (ev) => {
        if (this.ws !== ws) return;
        this.ready = false;
        if (this.closedByUser) {
          if (typeof this.onclose === "function") this.onclose(ev);
          return;
        }
        this._lost(ev);
      };
    }

    _lost(why) {
      if (this.closedByUser || this.failed) return;
      if (!this._connected) {
        // never got a session -> nothing to resume; report like a normal WebSocket failure
        return this._fail(why, "initial connection failed");
      }
      if (!this.lostAt) {
        this.lostAt = Date.now();
        this._status("lost", { graceMs: this.graceMs });
      }
      const elapsed = Date.now() - this.lostAt;
      if (elapsed > this.graceMs) return this._fail(why, "grace period over");

      this.isResume = true;
      const wait = Math.min(
        this.opts.retryBaseMs * 2 ** this.attempt,
        this.opts.retryMaxMs,
      );
      this.attempt++;
      clearTimeout(this._retryTimer);
      this._retryTimer = setTimeout(
        () => this._open(),
        this.attempt === 1 ? 0 : wait,
      );
    }

    _fail(why, reason) {
      if (this.failed) return;
      this.failed = true;
      clearInterval(this._watch);
      clearTimeout(this._retryTimer);
      global.removeEventListener("pagehide", this._onPageHide);
      this._status("failed", { reason });
      const ev = { type: "close", code: 4002, reason, fatal: true, cause: why };
      if (typeof this.onerror === "function" && !this._connected)
        this.onerror(ev);
      if (typeof this.onclose === "function") this.onclose(ev);
    }

    /* ------------------------------------------------------------ inbound */

    _control(s) {
      if (s === PING) return this._raw(PONG);
      if (s === PONG) {
        if (this.pingSentAt) this.rtt = Date.now() - this.pingSentAt;
        this.pingSentAt = 0;
        return;
      }
      if (s.charCodeAt(0) === 97) this._ackUpTo(parseInt(s.slice(1), 10));
    }

    _data(data) {
      if (!data || typeof data !== "object") return;

      // ---- handshake messages (never forwarded to the game) ----
      if (data.type === "resume_token") {
        this.playerId = data.playerId;
        this.token = data.token;
        if (data.pingMs) this.pingMs = data.pingMs;
        if (data.graceMs) this.graceMs = data.graceMs;
        if (data.resumeFailed) {
          // we asked to resume but server created a new player: old game is gone
          return this._fail(null, "session expired on server");
        }
        this._connected = true;
        return;
      }
      if (data.type === "resumed") {
        this.token = data.token || this.token;
        this._ackUpTo(data.inAck); // server already processed these
        this.lostAt = 0;
        this.attempt = 0;
        this.isResume = false;
        this.ready = true;
        this._status("resumed", { pending: data.pending });
        this._flush(); // everything above inAck is re-sent (sentOn != new ws)
        return;
      }

      // ---- reliable data from server ----
      if (typeof data._s === "number") {
        if (data._s <= this.inSeq) {
          this._scheduleAck(); // duplicate (replay overlap) - just re-ack
          return;
        }
        this.inSeq = data._s;
        delete data._s;
        this._scheduleAck();
      }
      if (typeof this.onmessage === "function") {
        try {
          // may return a promise (gwent.js handler is async); not awaited on purpose
          const r = this.onmessage({ data, parsed: data, type: "message" });
          if (r && typeof r.catch === "function")
            r.catch((e) => console.error("[socket] handler", e));
        } catch (e) {
          console.error("[socket] handler", e);
        }
      }
      // let listeners added through addEventListener see it too
      for (const fn of this._listeners || []) {
        try {
          fn({ data, parsed: data, type: "message" });
        } catch (e) {
          console.error("[socket] listener", e);
        }
      }
    }

    /** Compatibility with existing code that does socket.addEventListener("message", fn) */
    addEventListener(type, fn) {
      if (type !== "message") return;
      (this._listeners = this._listeners || new Set()).add(fn);
    }
    removeEventListener(type, fn) {
      if (type !== "message" || !this._listeners) return;
      this._listeners.delete(fn);
    }

    /* ----------------------------------------------------------- outbound */

    _raw(data) {
      const ws = this.ws;
      if (ws && ws.readyState === 1) {
        try {
          ws.send(data);
          return true;
        } catch (e) {}
      }
      return false;
    }

    _scheduleAck() {
      if (this._ackTimer) return;
      this._ackTimer = setTimeout(() => {
        this._ackTimer = null;
        if (this.ready) this._raw("a" + this.inSeq);
      }, 0);
    }

    _ackUpTo(n) {
      if (!(n > 0)) return;
      this.outbox = this.outbox.filter((e) => e.seq > n);
    }

    _flush() {
      this._tx = this._tx
        .then(async () => {
          const ws = this.ws;
          if (!this.ready || !ws || ws.readyState !== 1) return;
          for (const e of this.outbox.slice()) {
            if (e.sentOn === ws) continue;
            const bytes = await e.bytes;
            if (ws !== this.ws || ws.readyState !== 1 || !this.ready) return;
            ws.send(bytes);
            e.sentOn = ws;
          }
        })
        .catch((err) => console.error("[socket] flush", err));
    }

    /* ------------------------------------------------------------ keepalive */

    _tick() {
      if (this.closedByUser || this.failed) return;
      const ws = this.ws;
      if (!ws || ws.readyState !== 1) return;
      const now = Date.now();
      // server pings every pingMs; silence for 2.5x means the path is dead (server limit is 25s)
      if (now - this.lastSeen > this.pingMs * 2.5) {
        this._log("silent too long, dropping socket");
        try {
          ws.close(4003, "timeout");
        } catch (e) {}
        // some browsers delay onclose on dead sockets - force our own path
        setTimeout(() => {
          if (this.ws === ws) {
            this.ready = false;
            this._lost("timeout");
          }
        }, 500);
        return;
      }
      if (now - this.lastPing >= this.pingMs) {
        this.lastPing = now;
        this.pingSentAt = now;
        this._raw(PING);
      }
    }
  }

  global.ResilientSocket = ResilientSocket;
})(typeof window !== "undefined" ? window : globalThis);
