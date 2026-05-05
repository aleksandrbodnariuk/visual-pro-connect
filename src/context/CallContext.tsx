import { createContext, useContext, useEffect, useRef, useState, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

/**
 * Безкоштовні аудіо-дзвінки 1-на-1 через WebRTC + публічні STUN.
 * Сигналізація — Supabase Realtime broadcast (без БД).
 *
 * Канали:
 *   inbox:<userId>            — слухає кожен авторизований користувач, прийом запрошень
 *   call:<callId>             — приватний канал на конкретний дзвінок (offer/answer/ice/end)
 */

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun.cloudflare.com:3478" },
];

export type CallStatus = "idle" | "outgoing" | "incoming" | "active" | "ended";

export interface PeerInfo {
  id: string;
  name: string;
  avatarUrl?: string;
}

interface ActiveCall {
  callId: string;
  peer: PeerInfo;
  isCaller: boolean;
  conversationId?: string;
  status: CallStatus;
  startedAt?: number;
  muted: boolean;
  speakerOn: boolean;
}

interface CallContextValue {
  call: ActiveCall | null;
  startCall: (peer: PeerInfo, conversationId?: string) => Promise<void>;
  acceptCall: () => Promise<void>;
  declineCall: () => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleSpeaker: () => void;
  remoteAudioRef: React.RefObject<HTMLAudioElement>;
}

const CallContext = createContext<CallContextValue | undefined>(undefined);

export function useCall() {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error("useCall must be used inside CallProvider");
  return ctx;
}

function uuid() {
  return (typeof crypto !== "undefined" && "randomUUID" in crypto)
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function CallProvider({ children }: { children: ReactNode }) {
  const { user, appUser } = useAuth();
  const [call, setCall] = useState<ActiveCall | null>(null);
  const callRef = useRef<ActiveCall | null>(null);
  useEffect(() => { callRef.current = call; }, [call]);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const callChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const pendingOfferRef = useRef<RTCSessionDescriptionInit | null>(null);
  const queuedRemoteIceRef = useRef<RTCIceCandidateInit[]>([]);

  // ===== Ring tones via WebAudio =====
  const toneCtxRef = useRef<AudioContext | null>(null);
  const toneStopsRef = useRef<Set<() => void>>(new Set());

  const stopTone = useCallback(() => {
    const stops = Array.from(toneStopsRef.current);
    toneStopsRef.current.clear();
    stops.forEach((stop) => {
      try { stop(); } catch {}
    });
    const ctx = toneCtxRef.current;
    toneCtxRef.current = null;
    try { ctx?.close().catch(() => {}); } catch {}
  }, []);

  const ensureToneCtx = useCallback(() => {
    if (!toneCtxRef.current) {
      const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!Ctx) return null;
      toneCtxRef.current = new Ctx();
    }
    if (toneCtxRef.current!.state === "suspended") {
      toneCtxRef.current!.resume().catch(() => {});
    }
    return toneCtxRef.current!;
  }, []);

  const playRingback = useCallback(() => {
    stopTone();
    const ctx = ensureToneCtx();
    if (!ctx) return;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.connect(ctx.destination);
    const osc1 = ctx.createOscillator();
    osc1.type = "sine"; osc1.frequency.value = 440;
    const osc2 = ctx.createOscillator();
    osc2.type = "sine"; osc2.frequency.value = 480;
    osc1.connect(gain); osc2.connect(gain);
    osc1.start(); osc2.start();
    let active = true;
    const cycle = () => {
      if (!active) return;
      const t = ctx.currentTime;
      gain.gain.cancelScheduledValues(t);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.15, t + 0.05);
      gain.gain.setValueAtTime(0.15, t + 1.0);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.05);
    };
    cycle();
    const interval = setInterval(cycle, 4000);
    const stop = () => {
      active = false;
      clearInterval(interval);
      try { gain.gain.cancelScheduledValues(ctx.currentTime); gain.gain.value = 0; } catch {}
      try { osc1.stop(); } catch {}
      try { osc2.stop(); } catch {}
      try { osc1.disconnect(); osc2.disconnect(); gain.disconnect(); } catch {}
      toneStopsRef.current.delete(stop);
    };
    toneStopsRef.current.add(stop);
  }, [ensureToneCtx, stopTone]);

  const playRingtone = useCallback(() => {
    stopTone();
    const ctx = ensureToneCtx();
    if (!ctx) return;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.connect(ctx.destination);
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.connect(gain);
    osc.start();
    let active = true;
    const ring = () => {
      if (!active) return;
      const t = ctx.currentTime;
      osc.frequency.cancelScheduledValues(t);
      osc.frequency.setValueAtTime(880, t);
      osc.frequency.setValueAtTime(660, t + 0.25);
      osc.frequency.setValueAtTime(880, t + 0.5);
      osc.frequency.setValueAtTime(660, t + 0.75);
      gain.gain.cancelScheduledValues(t);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.2, t + 0.05);
      gain.gain.setValueAtTime(0.2, t + 1.0);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.05);
    };
    ring();
    const interval = setInterval(ring, 2000);
    const stop = () => {
      active = false;
      clearInterval(interval);
      try { gain.gain.cancelScheduledValues(ctx.currentTime); gain.gain.value = 0; } catch {}
      try { osc.stop(); } catch {}
      try { osc.disconnect(); gain.disconnect(); } catch {}
      toneStopsRef.current.delete(stop);
    };
    toneStopsRef.current.add(stop);
  }, [ensureToneCtx, stopTone]);

  useEffect(() => {
    if (call?.status === "active") stopTone();
  }, [call?.status, stopTone]);

  const cleanup = useCallback(() => {
    stopTone();
    try { pcRef.current?.close(); } catch {}
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    if (callChannelRef.current) {
      try { supabase.removeChannel(callChannelRef.current); } catch {}
      callChannelRef.current = null;
    }
    pendingOfferRef.current = null;
    queuedRemoteIceRef.current = [];
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }
  }, [stopTone]);

  const logSystemMessage = useCallback(async (durationMs: number, status: "completed" | "missed" | "declined") => {
    const c = callRef.current;
    if (!c?.conversationId) return;
    if (!user) return;
    const seconds = Math.max(0, Math.round(durationMs / 1000));
    const event = {
      type: "call",
      direction: c.isCaller ? "outgoing" : "incoming",
      status,
      duration: seconds,
    };
    const text = status === "completed"
      ? `Аудіодзвінок: ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`
      : status === "missed"
        ? "Пропущений аудіодзвінок"
        : "Аудіодзвінок відхилено";
    try {
      await supabase.from("messages").insert({
        sender_id: user.id,
        conversation_id: c.conversationId,
        content: text,
        read: false,
        system_event: event as any,
      });
    } catch (e) {
      console.warn("Could not log call message:", e);
    }
  }, [user]);

  const endCall = useCallback(() => {
    const c = callRef.current;
    const ch = callChannelRef.current;
    if (ch && c) {
      try {
        ch.send({ type: "broadcast", event: "end", payload: { from: user?.id } });
      } catch {}
    }
    if (c) {
      const wasActive = c.status === "active" && c.startedAt;
      const dur = wasActive ? Date.now() - (c.startedAt as number) : 0;
      if (c.isCaller) {
        if (wasActive) logSystemMessage(dur, "completed");
        else if (c.status === "outgoing") logSystemMessage(0, "missed");
      }
    }
    cleanup();
    setCall(null);
  }, [cleanup, logSystemMessage, user?.id]);

  const setupPeerConnection = useCallback((callId: string) => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pcRef.current = pc;

    pc.onicecandidate = (e) => {
      if (e.candidate && callChannelRef.current) {
        callChannelRef.current.send({
          type: "broadcast",
          event: "ice",
          payload: { from: user?.id, candidate: e.candidate.toJSON() },
        });
      }
    };

    pc.ontrack = (e) => {
      stopTone();
      const [stream] = e.streams;
      if (remoteAudioRef.current && stream) {
        remoteAudioRef.current.srcObject = stream;
        remoteAudioRef.current.play().catch(() => {});
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
        stopTone();
        setCall(prev => prev ? { ...prev, status: "active", startedAt: prev.startedAt || Date.now() } : prev);
      }
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      if (state === "connected") {
        stopTone();
        setCall(prev => prev ? { ...prev, status: "active", startedAt: prev.startedAt || Date.now() } : prev);
      } else if (state === "connecting") {
        const c = callRef.current;
        if (c?.status === "active") stopTone();
      } else if (state === "failed" || state === "disconnected" || state === "closed") {
        if (state === "failed") {
          toast.error("З'єднання втрачено");
          endCall();
        }
      }
    };

    return pc;
  }, [user?.id, endCall, stopTone]);

  const getMic = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    localStreamRef.current = stream;
    return stream;
  }, []);

  const subscribeToCallChannel = useCallback((callId: string, isCaller: boolean) => {
    const channel = supabase.channel(`call:${callId}`, {
      config: { broadcast: { self: false, ack: false } },
    });
    callChannelRef.current = channel;

    channel.on("broadcast", { event: "offer" }, async ({ payload }) => {
      if (payload.from === user?.id) return;
      pendingOfferRef.current = payload.sdp;
    });

    channel.on("broadcast", { event: "answer" }, async ({ payload }) => {
      if (payload.from === user?.id) return;
      const pc = pcRef.current;
      if (!pc) return;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        stopTone();
        setCall(prev => prev ? { ...prev, status: "active", startedAt: prev.startedAt || Date.now() } : prev);
        for (const c of queuedRemoteIceRef.current) {
          try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch {}
        }
        queuedRemoteIceRef.current = [];
      } catch (e) { console.error(e); }
    });

    channel.on("broadcast", { event: "accepted" }, ({ payload }) => {
      if (payload.from === user?.id) return;
      stopTone();
      setCall(prev => prev ? { ...prev, status: "active", startedAt: prev.startedAt || Date.now() } : prev);
    });

    channel.on("broadcast", { event: "ice" }, async ({ payload }) => {
      if (payload.from === user?.id) return;
      const pc = pcRef.current;
      if (!pc) {
        queuedRemoteIceRef.current.push(payload.candidate);
        return;
      }
      if (!pc.remoteDescription) {
        queuedRemoteIceRef.current.push(payload.candidate);
        return;
      }
      try { await pc.addIceCandidate(new RTCIceCandidate(payload.candidate)); } catch (e) { console.warn(e); }
    });

    channel.on("broadcast", { event: "end" }, () => {
      const c = callRef.current;
      if (c) {
        const wasActive = c.status === "active" && c.startedAt;
        const dur = wasActive ? Date.now() - (c.startedAt as number) : 0;
        if (c.isCaller) {
          if (wasActive) logSystemMessage(dur, "completed");
        }
      }
      cleanup();
      setCall(null);
    });

    channel.on("broadcast", { event: "decline" }, () => {
      toast.info("Дзвінок відхилено");
      const c = callRef.current;
      if (c?.isCaller) logSystemMessage(0, "declined");
      cleanup();
      setCall(null);
    });

    return new Promise<void>((resolve) => {
      channel.subscribe((status) => {
        if (status === "SUBSCRIBED") resolve();
      });
    });
  }, [user?.id, cleanup, logSystemMessage, stopTone]);

  const startCall = useCallback(async (peer: PeerInfo, conversationId?: string) => {
    if (!user) return;
    if (callRef.current) {
      toast.error("Завершіть поточний дзвінок");
      return;
    }
    const callId = uuid();
    const fromName = appUser
      ? `${appUser.firstName || ""} ${appUser.lastName || ""}`.trim() || "Користувач"
      : "Користувач";
    const fromAvatar = appUser?.avatarUrl || "";

    setCall({ callId, peer, isCaller: true, conversationId, status: "outgoing", muted: false, speakerOn: true });
    playRingback();

    try {
      const stream = await getMic();
      await subscribeToCallChannel(callId, true);
      const pc = setupPeerConnection(callId);
      stream.getTracks().forEach(t => pc.addTrack(t, stream));
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // 1) Notify callee inbox (works only if their app is open)
      const inbox = supabase.channel(`inbox:${peer.id}`);
      await new Promise<void>((resolve) => {
        inbox.subscribe((status) => { if (status === "SUBSCRIBED") resolve(); });
      });
      await inbox.send({
        type: "broadcast",
        event: "incoming-call",
        payload: {
          callId,
          from: user.id,
          fromName,
          fromAvatar,
          conversationId,
        },
      });
      try { supabase.removeChannel(inbox); } catch {}

      // 1b) Send push notification (works when callee's app is closed/backgrounded)
      // Fire-and-forget — failures shouldn't block the call.
      supabase.functions
        .invoke("send-call-notification", {
          body: {
            to_user_id: peer.id,
            call_id: callId,
            from_name: fromName,
            from_avatar: fromAvatar,
            conversation_id: conversationId,
          },
        })
        .catch((e) => console.warn("[Call] push notification failed:", e));

      // 2) Send offer on call channel (callee will subscribe after accept)
      // Wait a moment so the callee can pick up; resend a couple of times.
      const sendOffer = () => {
        callChannelRef.current?.send({
          type: "broadcast",
          event: "offer",
          payload: { from: user.id, sdp: pc.localDescription },
        });
      };
      sendOffer();
      const t1 = setTimeout(sendOffer, 1500);
      const t2 = setTimeout(sendOffer, 4000);

      // Auto-cancel after 45s if no answer
      const timeout = setTimeout(() => {
        const c = callRef.current;
        if (c && c.status === "outgoing") {
          toast.info("Немає відповіді");
          endCall();
        }
      }, 45000);

      // Clear timers when call ends/cleanups happen
      const origCleanup = cleanup;
      // (cleanup is stable; timeouts will simply be no-ops)
      void origCleanup;
      void t1; void t2; void timeout;
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Не вдалося запустити мікрофон");
      cleanup();
      setCall(null);
    }
  }, [user, appUser, getMic, subscribeToCallChannel, setupPeerConnection, cleanup, endCall]);

  const acceptCall = useCallback(async () => {
    const c = callRef.current;
    if (!c || c.status !== "incoming") return;
    stopTone();
    callChannelRef.current?.send({
      type: "broadcast",
      event: "accepted",
      payload: { from: user?.id },
    });
    try {
      const stream = await getMic();
      // already subscribed to call channel from incoming flow
      const pc = setupPeerConnection(c.callId);
      stream.getTracks().forEach(t => pc.addTrack(t, stream));

      // wait for offer if not yet arrived
      const waitForOffer = async () => {
        const start = Date.now();
        while (!pendingOfferRef.current && Date.now() - start < 8000) {
          await new Promise(r => setTimeout(r, 100));
        }
        return pendingOfferRef.current;
      };
      const offer = await waitForOffer();
      if (!offer) throw new Error("Offer not received");
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      for (const cand of queuedRemoteIceRef.current) {
        try { await pc.addIceCandidate(new RTCIceCandidate(cand)); } catch {}
      }
      queuedRemoteIceRef.current = [];
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      callChannelRef.current?.send({
        type: "broadcast",
        event: "answer",
        payload: { from: user?.id, sdp: pc.localDescription },
      });
      setCall(prev => prev ? { ...prev, status: "active", startedAt: Date.now() } : prev);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Не вдалося прийняти дзвінок");
      cleanup();
      setCall(null);
    }
  }, [getMic, setupPeerConnection, user?.id, cleanup, stopTone]);

  const declineCall = useCallback(() => {
    callChannelRef.current?.send({
      type: "broadcast",
      event: "decline",
      payload: { from: user?.id },
    });
    cleanup();
    setCall(null);
  }, [user?.id, cleanup]);

  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const enabled = stream.getAudioTracks()[0]?.enabled;
    stream.getAudioTracks().forEach(t => (t.enabled = !enabled));
    setCall(prev => prev ? { ...prev, muted: !!enabled } : prev);
  }, []);

  const toggleSpeaker = useCallback(() => {
    const audio = remoteAudioRef.current;
    if (!audio) return;
    setCall(prev => {
      if (!prev) return prev;
      const next = !prev.speakerOn;
      audio.volume = next ? 1.0 : 0.35;
      return { ...prev, speakerOn: next };
    });
  }, []);

  // Receive an incoming call (from inbox broadcast OR push notification)
  const receiveIncomingCall = useCallback(async (payload: {
    callId: string;
    fromUserId: string;
    fromName?: string;
    fromAvatar?: string;
    conversationId?: string;
  }, opts: { autoAccept?: boolean } = {}) => {
    if (!payload?.callId || !payload?.fromUserId) return;
    const existing = callRef.current;
    if (existing && existing.callId === payload.callId) {
      // Same call already known. Maybe just auto-accept.
      if (opts.autoAccept && existing.status === "incoming") {
        // delay slightly to ensure subscription is ready
        setTimeout(() => { acceptCallRef.current?.(); }, 100);
      }
      return;
    }
    if (existing) {
      // Already busy in a different call — ignore.
      return;
    }
    const peer: PeerInfo = {
      id: payload.fromUserId,
      name: payload.fromName || "Користувач",
      avatarUrl: payload.fromAvatar,
    };
    setCall({
      callId: payload.callId,
      peer,
      isCaller: false,
      conversationId: payload.conversationId,
      status: "incoming",
      muted: false,
      speakerOn: true,
    });
    await subscribeToCallChannel(payload.callId, false);
    if (opts.autoAccept) {
      // Skip ringtone and auto-pick-up after subscribe is ready
      setTimeout(() => { acceptCallRef.current?.(); }, 200);
    } else {
      playRingtone();
    }
  }, [subscribeToCallChannel, playRingtone]);

  // Stable ref to acceptCall (defined above) so receiveIncomingCall can call it
  const acceptCallRef = useRef<typeof acceptCall>(acceptCall);
  useEffect(() => { acceptCallRef.current = acceptCall; }, [acceptCall]);

  // Listen for incoming calls on personal inbox (realtime broadcast)
  useEffect(() => {
    if (!user) return;
    const inbox = supabase.channel(`inbox:${user.id}`);
    inbox.on("broadcast", { event: "incoming-call" }, async ({ payload }) => {
      await receiveIncomingCall({
        callId: payload.callId,
        fromUserId: payload.from,
        fromName: payload.fromName,
        fromAvatar: payload.fromAvatar,
        conversationId: payload.conversationId,
      });
    });
    inbox.subscribe();
    return () => {
      try { supabase.removeChannel(inbox); } catch {}
    };
  }, [user?.id, receiveIncomingCall]);

  // Listen for messages from the Service Worker (push notification taps)
  useEffect(() => {
    if (!user) return;
    if (!("serviceWorker" in navigator)) return;

    const handler = (event: MessageEvent) => {
      const msg = event.data;
      if (!msg || typeof msg !== "object") return;
      if (msg.type === "INCOMING_CALL_FROM_PUSH" && msg.call) {
        receiveIncomingCall(
          {
            callId: msg.call.callId,
            fromUserId: msg.call.fromUserId,
            fromName: msg.call.fromName,
            fromAvatar: msg.call.fromAvatar,
            conversationId: msg.call.conversationId,
          },
          { autoAccept: !!msg.autoAccept }
        );
      } else if (msg.type === "CALL_DECLINED_FROM_PUSH" && msg.call) {
        // Best-effort: send decline broadcast on the call channel
        const ch = supabase.channel(`call:${msg.call.callId}`);
        ch.subscribe((status) => {
          if (status === "SUBSCRIBED") {
            ch.send({ type: "broadcast", event: "decline", payload: { from: user.id } })
              .finally(() => { try { supabase.removeChannel(ch); } catch {} });
          }
        });
      }
    };

    navigator.serviceWorker.addEventListener("message", handler);
    return () => {
      navigator.serviceWorker.removeEventListener("message", handler);
    };
  }, [user?.id, receiveIncomingCall]);

  // Fallback: if the app was opened cold by a push tap, the SW couldn't
  // postMessage to a non-existent client. Recover state from URL params.
  useEffect(() => {
    if (!user) return;
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const callId = params.get("incoming_call");
    const fromUserId = params.get("from");
    if (!callId || !fromUserId) return;
    if (callRef.current) return;

    const autoAccept = params.get("accept") === "1";

    // Strip these params from the URL so refresh doesn't re-trigger
    params.delete("incoming_call");
    params.delete("from");
    params.delete("accept");
    const newSearch = params.toString();
    const newUrl = window.location.pathname + (newSearch ? `?${newSearch}` : "") + window.location.hash;
    window.history.replaceState({}, "", newUrl);

    (async () => {
      // Try to enrich peer info from DB
      let fromName = "Користувач";
      let fromAvatar: string | undefined;
      try {
        const { data } = await supabase
          .from("users")
          .select("full_name, avatar_url")
          .eq("id", fromUserId)
          .maybeSingle();
        if (data) {
          const full = ((data as any).full_name || "").trim();
          if (full) fromName = full;
          fromAvatar = (data as any).avatar_url || undefined;
        }
      } catch { /* ignore */ }

      await receiveIncomingCall(
        { callId, fromUserId, fromName, fromAvatar },
        { autoAccept }
      );
    })();
    // Run only once when user becomes available
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  return (
    <CallContext.Provider value={{ call, startCall, acceptCall, declineCall, endCall, toggleMute, toggleSpeaker, remoteAudioRef }}>
      {children}
      <audio ref={remoteAudioRef} autoPlay playsInline />
    </CallContext.Provider>
  );
}