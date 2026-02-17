"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Mic, MicOff, RefreshCcw, Video, VideoOff } from "lucide-react";
import { apiFetch } from "../../lib/api";
import { connectSocket } from "../../lib/socket";

type Role = "student" | "tutor";
type FacingMode = "user" | "environment";

type LiveUser = {
  _id: string;
  name?: string;
  role?: string;
};

type RemoteStreamState = {
  userId: string;
  userName: string;
  userRole: string;
  stream: MediaStream;
};

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

export default function LiveSessionPanel({ role, courseId }: { role: Role; courseId: string }) {
  const [me, setMe] = useState<LiveUser | null>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [activeSession, setActiveSession] = useState<any>(null);
  const [statusText, setStatusText] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [remoteStreams, setRemoteStreams] = useState<RemoteStreamState[]>([]);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [micEnabled, setMicEnabled] = useState(true);
  const [facingMode, setFacingMode] = useState<FacingMode>("user");
  const [isSwitchingCamera, setIsSwitchingCamera] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const participantInfoRef = useRef<Map<string, LiveUser>>(new Map());

  const activeSessionId = String(activeSession?._id || "");

  const setLocalVideoStream = async (stream: MediaStream | null) => {
    const node = localVideoRef.current;
    if (!node) return;
    node.srcObject = stream;
    if (!stream) return;
    try {
      await node.play();
    } catch {
      // user interaction may be required on some browsers
    }
  };

  const replaceTrackForAllPeers = async (kind: "audio" | "video", track: MediaStreamTrack | null) => {
    for (const pc of peerConnectionsRef.current.values()) {
      const sender = pc.getSenders().find((s) => s.track?.kind === kind);
      if (sender) await sender.replaceTrack(track);
    }
  };

  const applyTrackEnabledStates = () => {
    const stream = localStreamRef.current;
    if (!stream) return;
    stream.getVideoTracks().forEach((track) => {
      track.enabled = cameraEnabled;
    });
    stream.getAudioTracks().forEach((track) => {
      track.enabled = micEnabled;
    });
  };

  const createLocalMedia = async (nextFacingMode: FacingMode) => {
    const constraints: MediaStreamConstraints = {
      video: { facingMode: { ideal: nextFacingMode } },
      audio: true,
    };
    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch {
      return await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    }
  };

  const loadLiveSessions = async () => {
    if (!courseId) return;
    try {
      const res = await apiFetch<any>(`/live-sessions/course/${courseId}`);
      const list = Array.isArray(res?.data) ? res.data : [];
      setSessions(list);
      setActiveSession(list.find((item: any) => String(item.status) === "active") || null);
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : "Unable to load live sessions.");
    }
  };

  useEffect(() => {
    apiFetch<any>("/users/me")
      .then((res) => {
        setMe({
          _id: String(res?.data?._id || ""),
          name: res?.data?.name || "User",
          role: res?.data?.role || role,
        });
      })
      .catch(() => {});
    loadLiveSessions();
    const interval = setInterval(loadLiveSessions, 8000);
    return () => clearInterval(interval);
  }, [courseId, role]);

  useEffect(() => {
    applyTrackEnabledStates();
  }, [cameraEnabled, micEnabled]);

  const cleanupRemoteStream = (userId: string) => {
    setRemoteStreams((prev) => prev.filter((item) => item.userId !== userId));
  };

  const closePeer = (userId: string) => {
    const pc = peerConnectionsRef.current.get(userId);
    if (pc) {
      pc.onicecandidate = null;
      pc.ontrack = null;
      pc.onconnectionstatechange = null;
      pc.close();
      peerConnectionsRef.current.delete(userId);
    }
    cleanupRemoteStream(userId);
  };

  const cleanupAllPeers = () => {
    Array.from(peerConnectionsRef.current.keys()).forEach((userId) => closePeer(userId));
  };

  const stopLocalMedia = () => {
    const stream = localStreamRef.current;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    setLocalVideoStream(null);
  };

  useEffect(() => {
    return () => {
      cleanupAllPeers();
      stopLocalMedia();
      if (activeSessionId) connectSocket().emit("live:leave", { sessionId: activeSessionId });
    };
  }, [activeSessionId]);

  const ensureLocalMedia = async () => {
    if (localStreamRef.current) {
      await setLocalVideoStream(localStreamRef.current);
      return localStreamRef.current;
    }
    const media = await createLocalMedia(facingMode);
    localStreamRef.current = media;
    applyTrackEnabledStates();
    await setLocalVideoStream(media);
    return media;
  };

  const switchCamera = async () => {
    if (!isConnected) {
      setStatusText("Join live first to switch camera.");
      return;
    }
    try {
      setIsSwitchingCamera(true);
      const nextFacingMode: FacingMode = facingMode === "user" ? "environment" : "user";
      const nextStream = await createLocalMedia(nextFacingMode);
      const nextVideoTrack = nextStream.getVideoTracks()[0] || null;
      if (!nextVideoTrack) {
        nextStream.getTracks().forEach((t) => t.stop());
        return;
      }
      nextVideoTrack.enabled = cameraEnabled;

      const prevStream = localStreamRef.current;
      if (prevStream) {
        prevStream.getVideoTracks().forEach((track) => track.stop());
        const audioTracks = prevStream.getAudioTracks();
        audioTracks.forEach((track) => nextStream.addTrack(track));
      } else {
        const audioFallback = (await createLocalMedia("user")).getAudioTracks()[0];
        if (audioFallback) nextStream.addTrack(audioFallback);
      }

      localStreamRef.current = nextStream;
      await setLocalVideoStream(nextStream);
      await replaceTrackForAllPeers("video", nextVideoTrack);
      setFacingMode(nextFacingMode);
      setStatusText(nextFacingMode === "user" ? "Front camera selected." : "Back camera selected.");
    } catch {
      setStatusText("Unable to switch camera on this device.");
    } finally {
      setIsSwitchingCamera(false);
    }
  };

  const toggleCamera = async () => {
    const next = !cameraEnabled;
    setCameraEnabled(next);
    const stream = localStreamRef.current;
    if (stream) {
      stream.getVideoTracks().forEach((track) => {
        track.enabled = next;
      });
    }
    setStatusText(next ? "Camera turned on." : "Camera turned off.");
  };

  const toggleMic = async () => {
    const next = !micEnabled;
    setMicEnabled(next);
    const stream = localStreamRef.current;
    if (stream) {
      stream.getAudioTracks().forEach((track) => {
        track.enabled = next;
      });
    }
    setStatusText(next ? "Microphone unmuted." : "Microphone muted.");
  };

  const emitSignal = (targetUserId: string, payload: any) => {
    if (!activeSessionId || !targetUserId) return;
    connectSocket().emit("live:signal", {
      sessionId: activeSessionId,
      targetUserId,
      payload,
    });
  };

  const createPeerConnection = async (remoteUser: LiveUser) => {
    const userId = String(remoteUser._id || "");
    if (!userId) return null;
    if (peerConnectionsRef.current.has(userId)) return peerConnectionsRef.current.get(userId) || null;

    const stream = await ensureLocalMedia();
    const pc = new RTCPeerConnection(RTC_CONFIG);
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    pc.onicecandidate = (event) => {
      if (event.candidate) emitSignal(userId, { type: "ice-candidate", candidate: event.candidate });
    };

    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      if (!remoteStream) return;
      setRemoteStreams((prev) => {
        const other = prev.filter((item) => item.userId !== userId);
        return [
          ...other,
          {
            userId,
            userName: remoteUser.name || participantInfoRef.current.get(userId)?.name || "Participant",
            userRole: remoteUser.role || participantInfoRef.current.get(userId)?.role || "user",
            stream: remoteStream,
          },
        ];
      });
    };

    pc.onconnectionstatechange = () => {
      if (["failed", "closed", "disconnected"].includes(pc.connectionState)) closePeer(userId);
    };

    peerConnectionsRef.current.set(userId, pc);
    return pc;
  };

  const shouldInitiateWith = (remote: LiveUser) => {
    const myId = String(me?._id || "");
    const theirId = String(remote?._id || "");
    if (!myId || !theirId) return false;
    if (role === "tutor") return true;
    if (String(remote.role || "") === "tutor") return false;
    return myId < theirId;
  };

  const initiateOffer = async (remote: LiveUser) => {
    const userId = String(remote._id || "");
    if (!userId || !activeSessionId) return;
    const pc = await createPeerConnection(remote);
    if (!pc || pc.signalingState !== "stable") return;
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    emitSignal(userId, { type: "offer", sdp: offer });
  };

  const joinLiveSocketRoom = async (sessionId: string) =>
    new Promise<void>((resolve, reject) => {
      connectSocket().emit("live:join", { sessionId }, (ack: any) => {
        if (ack?.success) resolve();
        else reject(new Error(ack?.message || "Unable to join live room"));
      });
    });

  useEffect(() => {
    const socket = connectSocket();

    const onParticipants = async (payload: any) => {
      if (String(payload?.sessionId || "") !== activeSessionId) return;
      const participants = Array.isArray(payload?.participants) ? payload.participants : [];
      for (const item of participants) {
        const remote: LiveUser = {
          _id: String(item?._id || ""),
          name: item?.name || "Participant",
          role: item?.role || "user",
        };
        if (!remote._id) continue;
        participantInfoRef.current.set(remote._id, remote);
        if (shouldInitiateWith(remote)) await initiateOffer(remote);
      }
    };

    const onUserJoined = async (payload: any) => {
      if (String(payload?.sessionId || "") !== activeSessionId) return;
      const remote: LiveUser = {
        _id: String(payload?.user?._id || ""),
        name: payload?.user?.name || "Participant",
        role: payload?.user?.role || "user",
      };
      if (!remote._id) return;
      participantInfoRef.current.set(remote._id, remote);
      if (!isConnected) return;
      if (shouldInitiateWith(remote)) await initiateOffer(remote);
    };

    const onUserLeft = (payload: any) => {
      if (String(payload?.sessionId || "") !== activeSessionId) return;
      const userId = String(payload?.userId || "");
      if (!userId) return;
      closePeer(userId);
      participantInfoRef.current.delete(userId);
    };

    const onLiveSignal = async (packet: any) => {
      if (String(packet?.sessionId || "") !== activeSessionId) return;
      const fromUserId = String(packet?.fromUserId || "");
      if (!fromUserId) return;
      const remote: LiveUser = {
        _id: fromUserId,
        name: packet?.fromUserName || "Participant",
        role: packet?.fromRole || "user",
      };
      participantInfoRef.current.set(fromUserId, remote);

      const payload = packet?.payload || {};
      if (payload?.type === "offer") {
        const pc = await createPeerConnection(remote);
        if (!pc) return;
        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        emitSignal(fromUserId, { type: "answer", sdp: answer });
        return;
      }
      if (payload?.type === "answer") {
        const pc = peerConnectionsRef.current.get(fromUserId);
        if (!pc) return;
        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        return;
      }
      if (payload?.type === "ice-candidate") {
        const pc = peerConnectionsRef.current.get(fromUserId);
        if (!pc || !payload?.candidate) return;
        try {
          await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
        } catch {
          // ignore stale candidates
        }
      }
    };

    const onLiveEnded = (payload: any) => {
      if (
        String(payload?.courseId || "") !== String(courseId) &&
        String(payload?.sessionId || "") !== activeSessionId
      ) {
        return;
      }
      setStatusText("Live session ended.");
      setIsConnected(false);
      cleanupAllPeers();
      stopLocalMedia();
      setActiveSession(null);
      loadLiveSessions();
    };
    const onLiveStarted = (payload: any) => {
      if (String(payload?.courseId || "") !== String(courseId)) return;
      setStatusText("Teacher is live now. Join live.");
      loadLiveSessions();
    };
    const onNotification = (payload: any) => {
      const note = payload?.notification;
      if (!note) return;
      const metaCourseId = String(note?.metadata?.courseId || "");
      if (metaCourseId && metaCourseId === String(courseId)) {
        loadLiveSessions();
      }
    };

    socket.on("live:participants", onParticipants);
    socket.on("live:user-joined", onUserJoined);
    socket.on("live:user-left", onUserLeft);
    socket.on("live:signal", onLiveSignal);
    socket.on("live:ended", onLiveEnded);
    socket.on("live:started", onLiveStarted);
    socket.on("notification:new", onNotification);

    return () => {
      socket.off("live:participants", onParticipants);
      socket.off("live:user-joined", onUserJoined);
      socket.off("live:user-left", onUserLeft);
      socket.off("live:signal", onLiveSignal);
      socket.off("live:ended", onLiveEnded);
      socket.off("live:started", onLiveStarted);
      socket.off("notification:new", onNotification);
    };
  }, [activeSessionId, isConnected, me?._id, role, cameraEnabled, micEnabled, courseId]);

  const joinActiveSession = async (sessionId: string) => {
    if (!sessionId) return;
    try {
      setIsBusy(true);
      await apiFetch(`/live-sessions/${sessionId}/join`, { method: "POST" });
      await ensureLocalMedia();
      await joinLiveSocketRoom(sessionId);
      setIsConnected(true);
      setStatusText("Joined live session.");
      await loadLiveSessions();
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : "Unable to join live session.");
    } finally {
      setIsBusy(false);
    }
  };

  const leaveActiveSession = async () => {
    if (!activeSessionId) return;
    try {
      setIsBusy(true);
      connectSocket().emit("live:leave", { sessionId: activeSessionId });
      await apiFetch(`/live-sessions/${activeSessionId}/leave`, { method: "POST" });
    } catch {
      // ignore
    } finally {
      setIsBusy(false);
      setIsConnected(false);
      cleanupAllPeers();
      stopLocalMedia();
      setStatusText("Left live session.");
      loadLiveSessions();
    }
  };

  const startLiveSession = async () => {
    if (role !== "tutor") return;
    try {
      setIsBusy(true);
      const res = await apiFetch<any>(`/live-sessions/course/${courseId}/start`, { method: "POST" });
      const created = res?.data;
      setActiveSession(created || null);
      if (created?._id) await joinActiveSession(String(created._id));
      setStatusText("Live session started. Students notified.");
      await loadLiveSessions();
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : "Unable to start live session.");
    } finally {
      setIsBusy(false);
    }
  };

  const endLiveSession = async () => {
    if (role !== "tutor" || !activeSessionId) return;
    try {
      setIsBusy(true);
      await apiFetch(`/live-sessions/${activeSessionId}/end`, { method: "PATCH" });
      connectSocket().emit("live:leave", { sessionId: activeSessionId });
      setIsConnected(false);
      cleanupAllPeers();
      stopLocalMedia();
      setStatusText("Live session ended.");
      setActiveSession(null);
      await loadLiveSessions();
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : "Unable to end live session.");
    } finally {
      setIsBusy(false);
    }
  };

  const activeCount = useMemo(() => {
    if (!activeSession) return 0;
    return Array.isArray(activeSession?.activeParticipantIds) ? activeSession.activeParticipantIds.length : 0;
  }, [activeSession]);

  return (
    <div className="rounded-3xl bg-white p-6 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-700">Live session</p>
          <p className="text-xs text-slate-500">{activeSession ? "Session is live now." : "No active live session."}</p>
        </div>
        <div className="flex items-center gap-2">
          {activeSession && (
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-semibold text-emerald-700">
              LIVE - {activeCount}
            </span>
          )}
          {role === "tutor" && !activeSession && (
            <button
              type="button"
              disabled={isBusy}
              onClick={startLiveSession}
              className="rounded-full bg-brand-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
            >
              Go live
            </button>
          )}
          {activeSession && !isConnected && (
            <button
              type="button"
              disabled={isBusy}
              onClick={() => joinActiveSession(String(activeSession._id))}
              className="rounded-full bg-brand-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
            >
              Join live
            </button>
          )}
          {activeSession && isConnected && (
            <button
              type="button"
              disabled={isBusy}
              onClick={leaveActiveSession}
              className="rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-60"
            >
              Leave
            </button>
          )}
          {role === "tutor" && activeSession && (
            <button
              type="button"
              disabled={isBusy}
              onClick={endLiveSession}
              className="rounded-full bg-rose-100 px-3 py-2 text-xs font-semibold text-rose-700 disabled:opacity-60"
            >
              End live
            </button>
          )}
        </div>
      </div>

      {isConnected ? (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-500">You</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={toggleCamera}
                  className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                    cameraEnabled ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {cameraEnabled ? "Camera on" : "Camera off"}
                </button>
                <button
                  type="button"
                  onClick={toggleMic}
                  className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                    micEnabled ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {micEnabled ? <Mic className="h-3.5 w-3.5" /> : <MicOff className="h-3.5 w-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={switchCamera}
                  disabled={isSwitchingCamera}
                  className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700 disabled:opacity-60"
                  title="Switch front/back camera"
                >
                  <span className="inline-flex items-center gap-1">
                    <RefreshCcw className="h-3.5 w-3.5" />
                    {facingMode === "user" ? "Front" : "Back"}
                  </span>
                </button>
              </div>
            </div>
            <video ref={localVideoRef} autoPlay muted playsInline className="h-44 w-full rounded-xl bg-black object-cover" />
          </div>
          <div className="rounded-2xl border border-slate-200 p-3">
            <p className="mb-2 text-xs font-semibold text-slate-500">Participants</p>
            <div className="grid gap-3">
              {remoteStreams.map((item) => (
                <div key={item.userId} className="rounded-xl bg-slate-50 p-2">
                  <video
                    autoPlay
                    playsInline
                    className="h-36 w-full rounded-lg bg-black object-cover"
                    ref={(node) => {
                      if (node && node.srcObject !== item.stream) {
                        node.srcObject = item.stream;
                        node.play().catch(() => {});
                      }
                    }}
                  />
                  <p className="mt-1 text-[11px] text-slate-600">
                    {item.userName} ({item.userRole})
                  </p>
                </div>
              ))}
              {remoteStreams.length === 0 && (
                <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">
                  <Video className="h-4 w-4" />
                  Waiting for participants...
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-xs text-slate-500">
          <VideoOff className="h-4 w-4" />
          Join live to enable camera and microphone.
        </div>
      )}

      <div className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Recent live sessions</p>
        <div className="mt-2 flex flex-col gap-2">
          {sessions.slice(0, 5).map((session) => (
            <div key={session._id} className="rounded-2xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
              {String(session.status).toUpperCase()} - {new Date(session.startedAt || session.createdAt).toLocaleString()}
            </div>
          ))}
          {sessions.length === 0 && <p className="text-xs text-slate-400">No live sessions yet.</p>}
        </div>
      </div>

      {statusText && <p className="mt-3 text-xs text-brand-600">{statusText}</p>}
    </div>
  );
}
