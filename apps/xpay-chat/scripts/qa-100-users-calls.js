#!/usr/bin/env node
"use strict";

const DEFAULT_BASE = "http://127.0.0.1:4199";
const PASSWORD = "Abc12345!";

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const arg = process.argv[index];
  if (!arg.startsWith("--")) continue;
  const key = arg.slice(2);
  const value = process.argv[index + 1] && !process.argv[index + 1].startsWith("--")
    ? process.argv[++index]
    : "true";
  args.set(key, value);
}

const baseUrl = String(args.get("base") || DEFAULT_BASE).replace(/\/+$/, "");
const userCount = Number(args.get("users") || 100);
const voiceCalls = Number(args.get("voice") || 5);
const videoCalls = Number(args.get("video") || 5);
const runId = String(args.get("run-id") || Date.now()).replace(/[^a-zA-Z0-9_-]/g, "").slice(-12);

function phoneFor(index) {
  return `09888${String(index).padStart(5, "0")}`;
}

async function api(path, { token = "", body = {}, expect = [200] } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(body)
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!expect.includes(response.status)) {
    throw new Error(`${path} expected ${expect.join("/")} got ${response.status}: ${data.message || text}`);
  }
  return { status: response.status, data };
}

async function registerAndLogin(phone, name, email) {
  await api("/api/auth/register", {
    body: { phone, name, email, password: PASSWORD },
    expect: [201, 409]
  });
  const login = await api("/api/auth/login", {
    body: { phone, password: PASSWORD },
    expect: [200]
  });
  if (!login.data.token) throw new Error(`Login did not return token for ${phone}`);
  return { phone, token: login.data.token };
}

async function makeFriends(main, friend) {
  const request = await api("/api/friends/add", {
    token: friend.token,
    body: { phone: main.phone },
    expect: [200, 202]
  });
  if (request.status === 202) {
    await api("/api/friends/respond", {
      token: main.token,
      body: { requesterPhone: friend.phone, action: "accept" },
      expect: [200]
    });
  }
}

async function messageRoundTrip(main, friend, index) {
  const incoming = await api("/api/messages/send", {
    token: friend.token,
    body: {
      friendPhone: main.phone,
      message: { text: `Tin nhan test ${index} tu nguoi dung ${friend.phone}`, time: "" }
    },
    expect: [201]
  });
  const reply = await api("/api/messages/send", {
    token: main.token,
    body: {
      friendPhone: friend.phone,
      message: { text: `Tra loi test ${index} tu tai khoan chinh`, time: "" }
    },
    expect: [201]
  });
  return { incoming: incoming.data.message?.id || "", reply: reply.data.message?.id || "" };
}

async function postSignal(token, callId, type, marker) {
  await api("/api/calls/signal", {
    token,
    body: {
      id: callId,
      type,
      payload: {
        type,
        sdp: type === "candidate" ? undefined : `v=0\r\no=xpaychat-${marker} 0 0 IN IP4 127.0.0.1\r\ns=XPAY Chat QA\r\n`,
        candidate: type === "candidate" ? `candidate:${marker} 1 udp 2122260223 127.0.0.1 54321 typ host` : undefined,
        sdpMid: "0",
        sdpMLineIndex: 0
      }
    },
    expect: [201]
  });
}

async function callRoundTrip(main, friend, mode, index) {
  const started = await api("/api/calls/start", {
    token: main.token,
    body: { friendPhone: friend.phone, mode },
    expect: [201]
  });
  const call = started.data.call || {};
  if (call.status !== "ringing" || call.direction !== "outgoing") {
    throw new Error(`Unexpected caller start state for ${mode} #${index}: ${JSON.stringify(call)}`);
  }
  const friendSyncBefore = await api("/api/sync", { token: friend.token, expect: [200] });
  const incoming = (friendSyncBefore.data.calls || []).find((item) => item.id === call.id);
  if (!incoming || incoming.direction !== "incoming" || incoming.status !== "ringing") {
    throw new Error(`Callee did not see ringing ${mode} #${index}`);
  }

  await postSignal(main.token, call.id, "offer", `${mode}-${index}-offer`);
  const accepted = await api("/api/calls/respond", {
    token: friend.token,
    body: { id: call.id, action: "accept" },
    expect: [200]
  });
  if (accepted.data.call?.status !== "active") {
    throw new Error(`Callee accept did not activate ${mode} #${index}`);
  }
  await postSignal(friend.token, call.id, "answer", `${mode}-${index}-answer`);
  await postSignal(main.token, call.id, "candidate", `${mode}-${index}-caller-candidate`);
  await postSignal(friend.token, call.id, "candidate", `${mode}-${index}-callee-candidate`);

  const callerSyncActive = await api("/api/sync", { token: main.token, expect: [200] });
  const callerView = (callerSyncActive.data.calls || []).find((item) => item.id === call.id);
  if (!callerView || callerView.status !== "active" || !callerView.signals?.length) {
    throw new Error(`Caller did not receive active state/signals for ${mode} #${index}`);
  }

  const ended = await api("/api/calls/respond", {
    token: main.token,
    body: { id: call.id, action: "end" },
    expect: [200]
  });
  if (ended.data.call?.status !== "ended") {
    throw new Error(`Caller end did not end ${mode} #${index}`);
  }
  const calleeSyncEnded = await api("/api/sync", { token: friend.token, expect: [200] });
  const calleeEnded = (calleeSyncEnded.data.calls || []).find((item) => item.id === call.id);
  if (!calleeEnded || calleeEnded.status !== "ended") {
    throw new Error(`Callee did not receive ended state for ${mode} #${index}`);
  }

  return { id: call.id, mode, signalsSeenByCaller: callerView.signals.length };
}

async function main() {
  const startedAt = Date.now();
  const mainUser = await registerAndLogin(
    phoneFor(0),
    `Nexa QA Main ${runId}`,
    `nexa-qa-main-${runId}@example.com`
  );
  const friends = [];
  const messageResults = [];

  for (let index = 1; index <= userCount; index += 1) {
    const friend = await registerAndLogin(
      phoneFor(index),
      `Nexa QA User ${index}`,
      `nexa-qa-user-${index}-${runId}@example.com`
    );
    await makeFriends(mainUser, friend);
    messageResults.push(await messageRoundTrip(mainUser, friend, index));
    friends.push(friend);
    if (index % 10 === 0) console.log(`messages:${index}/${userCount}`);
  }

  const mainSync = await api("/api/sync", { token: mainUser.token, expect: [200] });
  const conversations = mainSync.data.conversations || [];
  const completeConversations = conversations.filter((item) => (item.messages || []).length >= 2).length;
  if (conversations.length < userCount || completeConversations < userCount) {
    throw new Error(`Expected ${userCount} complete conversations, got ${completeConversations}/${conversations.length}`);
  }

  const callResults = [];
  const callFriend = friends[0];
  for (let index = 1; index <= voiceCalls; index += 1) {
    callResults.push(await callRoundTrip(mainUser, callFriend, "voice", index));
    console.log(`voice:${index}/${voiceCalls}`);
  }
  for (let index = 1; index <= videoCalls; index += 1) {
    callResults.push(await callRoundTrip(mainUser, callFriend, "video", index));
    console.log(`video:${index}/${videoCalls}`);
  }

  const summary = {
    ok: true,
    baseUrl,
    runId,
    usersCreated: userCount + 1,
    friendsLinked: friends.length,
    messagePairs: messageResults.length,
    completeConversations,
    voiceCalls,
    videoCalls,
    callSignalsChecked: callResults.length,
    durationMs: Date.now() - startedAt
  };
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exit(1);
});
