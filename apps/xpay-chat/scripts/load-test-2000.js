#!/usr/bin/env node

const http = require("node:http");
const https = require("node:https");
const { performance } = require("node:perf_hooks");

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:4199";
const USERS = Number(process.env.USERS || 2000);
const CONCURRENCY = Number(process.env.CONCURRENCY || USERS);
const PASSWORD = process.env.TEST_PASSWORD || "Load@Test123";
const REQUEST_TIMEOUT_MS = Number(process.env.REQUEST_TIMEOUT_MS || 300000);
const RUN_ID = process.env.RUN_ID || Date.now().toString().slice(-8);
const SCENARIO = process.env.SCENARIO || "register-login-sync";
const USER_OFFSET = Number(process.env.USER_OFFSET || 0);

const target = new URL(BASE_URL);
const transport = target.protocol === "https:" ? https : http;
const agent = new transport.Agent({
  keepAlive: true,
  maxSockets: Math.max(CONCURRENCY + 20, 256),
  timeout: REQUEST_TIMEOUT_MS
});

function percentile(sorted, value) {
  if (!sorted.length) return 0;
  const index = Math.min(sorted.length - 1, Math.ceil((value / 100) * sorted.length) - 1);
  return sorted[index];
}

function summarize(samples) {
  const ok = samples.filter((item) => item.ok);
  const failed = samples.filter((item) => !item.ok);
  const latencies = ok.map((item) => item.ms).sort((a, b) => a - b);
  return {
    total: samples.length,
    ok: ok.length,
    failed: failed.length,
    minMs: Math.round(latencies[0] || 0),
    p50Ms: Math.round(percentile(latencies, 50)),
    p95Ms: Math.round(percentile(latencies, 95)),
    p99Ms: Math.round(percentile(latencies, 99)),
    maxMs: Math.round(latencies[latencies.length - 1] || 0),
    errors: failed.slice(0, 8).map((item) => item.error)
  };
}

function testUser(index) {
  const absoluteIndex = USER_OFFSET + index;
  const suffix = String(absoluteIndex).padStart(5, "0");
  const phone = `09${RUN_ID}${suffix}`.replace(/\D/g, "");
  return {
    index,
    phone,
    name: `Load Test ${suffix}`,
    password: PASSWORD,
    ip: `10.${Math.floor(index / 65000) % 255}.${Math.floor(index / 255) % 255}.${(index % 254) + 1}`
  };
}

function post(pathname, payload, token, ip) {
  return new Promise((resolve) => {
    const body = JSON.stringify(payload || {});
    const startedAt = performance.now();
    const request = transport.request({
      protocol: target.protocol,
      hostname: target.hostname,
      port: target.port || (target.protocol === "https:" ? 443 : 80),
      path: pathname,
      method: "POST",
      agent,
      timeout: REQUEST_TIMEOUT_MS,
      headers: {
        "content-type": "application/json",
        "content-length": Buffer.byteLength(body),
        "x-forwarded-for": ip,
        ...(token ? { authorization: `Bearer ${token}` } : {})
      }
    }, (response) => {
      let text = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => {
        text += chunk;
      });
      response.on("end", () => {
        const ms = performance.now() - startedAt;
        let data = null;
        try {
          data = text ? JSON.parse(text) : null;
        } catch {}
        if (response.statusCode >= 400) {
          resolve({
            ok: false,
            status: response.statusCode,
            ms,
            error: `${pathname} ${response.statusCode}: ${text.slice(0, 160)}`
          });
          return;
        }
        resolve({ ok: true, status: response.statusCode, ms, data });
      });
    });

    request.on("timeout", () => {
      request.destroy(new Error(`timeout after ${REQUEST_TIMEOUT_MS}ms`));
    });
    request.on("error", (error) => {
      resolve({
        ok: false,
        status: 0,
        ms: performance.now() - startedAt,
        error: `${pathname}: ${error.message}`
      });
    });
    request.write(body);
    request.end();
  });
}

async function runPool(items, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(CONCURRENCY, items.length) }, async () => {
    while (cursor < items.length) {
      const current = cursor++;
      results[current] = await worker(items[current], current);
    }
  });
  await Promise.all(workers);
  return results;
}

async function runPhase(name, users, worker) {
  const startedAt = performance.now();
  const results = await runPool(users, worker);
  const elapsedMs = performance.now() - startedAt;
  const summary = summarize(results);
  summary.elapsedMs = Math.round(elapsedMs);
  summary.rps = Math.round((summary.total / Math.max(elapsedMs, 1)) * 100000) / 100;
  console.log(JSON.stringify({ phase: name, ...summary }));
  return { results, summary };
}

async function run() {
  const users = Array.from({ length: USERS }, (_, index) => testUser(index + 1));
  const overallStartedAt = performance.now();
  const tokens = new Map();
  const phases = [];

  console.log(JSON.stringify({
    target: BASE_URL,
    scenario: SCENARIO,
    users: USERS,
    concurrency: CONCURRENCY,
    runId: RUN_ID,
    requestTimeoutMs: REQUEST_TIMEOUT_MS
  }));

  if (SCENARIO.includes("register")) {
    phases.push((await runPhase("register", users, async (user) => {
      return post("/api/auth/register", {
        phone: user.phone,
        name: user.name,
        password: user.password
      }, "", user.ip);
    })).summary);
  }

  if (SCENARIO.includes("login")) {
    const { results, summary } = await runPhase("login", users, async (user) => {
      const result = await post("/api/auth/login", {
        phone: user.phone,
        password: user.password
      }, "", user.ip);
      if (result.ok && result.data?.token) tokens.set(user.phone, result.data.token);
      return result;
    });
    phases.push(summary);
    const failedTokenUsers = results.filter((result) => !result.ok || !result.data?.token).length;
    if (failedTokenUsers) console.log(JSON.stringify({ warning: "missing_tokens", count: failedTokenUsers }));
  }

  if (SCENARIO.includes("sync")) {
    phases.push((await runPhase("sync", users, async (user) => {
      const token = tokens.get(user.phone);
      if (!token) {
        return { ok: false, status: 0, ms: 0, error: "missing token before sync" };
      }
      return post("/api/sync", {}, token, user.ip);
    })).summary);
  }

  const elapsedMs = performance.now() - overallStartedAt;
  const failed = phases.reduce((total, phase) => total + phase.failed, 0);
  console.log(JSON.stringify({
    done: true,
    users: USERS,
    scenario: SCENARIO,
    elapsedMs: Math.round(elapsedMs),
    elapsedSec: Math.round(elapsedMs / 100) / 10,
    failed
  }));

  if (failed > 0) process.exitCode = 1;
}

run().catch((error) => {
  console.error(JSON.stringify({ fatal: error.message }));
  process.exit(1);
});
