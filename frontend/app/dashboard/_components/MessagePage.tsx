"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { apiFetch } from "../../lib/api";
import {
  connectSocket,
  joinThread,
  leaveThread,
  markThreadRead,
} from "../../lib/socket";

type Role = "student" | "tutor";

type Thread = {
  _id: string;
  status: "pending" | "approved" | "rejected";
  lastMessageText?: string;
  lastMessageAt?: string;
  isUnread?: boolean;
  unreadBy?: string[];
  otherParticipantId?: string | null;
  otherParticipantName?: string;
  otherParticipantRole?: string;
  studentId?: string | null;
  tutorId?: string | null;
};

type Message = {
  _id: string;
  text: string;
  createdAt: string;
  sender?: {
    _id?: string;
    role?: string;
    name?: string;
  };
};

export default function MessagePage({ role }: { role: Role }) {
  const [activeTab, setActiveTab] = useState<"message" | "notification">("message");
  const [threads, setThreads] = useState<Thread[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Message[]>([]);
  const [actionStatus, setActionStatus] = useState("");
  const [tutorMessageView, setTutorMessageView] = useState<"approved" | "requests">("approved");
  const [enrolledStudentIds, setEnrolledStudentIds] = useState<string[]>([]);
  const [enrolledStudents, setEnrolledStudents] = useState<Array<{ _id: string; name: string }>>([]);
  const [availableTutors, setAvailableTutors] = useState<any[]>([]);
  const [requestingTutorId, setRequestingTutorId] = useState("");
  const [startingStudentId, setStartingStudentId] = useState("");

  const selectedThread = useMemo(
    () => threads.find((thread) => thread._id === activeThreadId) || null,
    [threads, activeThreadId]
  );

  const approvedThreads = useMemo(
    () => threads.filter((thread) => thread.status === "approved"),
    [threads]
  );
  const enrolledStudentNameMap = useMemo(() => {
    const map = new Map<string, string>();
    enrolledStudents.forEach((item) => map.set(String(item._id), item.name || "Student"));
    return map;
  }, [enrolledStudents]);
  const resolvedApprovedThreads = useMemo(() => {
    if (role !== "tutor") return approvedThreads;
    return approvedThreads.map((thread) => {
      const key = String(thread.otherParticipantId || thread.studentId || "");
      const fallbackName = enrolledStudentNameMap.get(key) || "";
      return {
        ...thread,
        otherParticipantName: thread.otherParticipantName || fallbackName || "Student",
      };
    });
  }, [approvedThreads, role, enrolledStudentNameMap]);
  const enrolledApprovedThreads = useMemo(() => {
    if (role !== "tutor") return resolvedApprovedThreads;
    const allow = new Set(enrolledStudentIds.map((id) => String(id)));
    return resolvedApprovedThreads.filter((thread) => {
      const candidateId = String(thread.otherParticipantId || thread.studentId || "");
      return allow.has(candidateId);
    });
  }, [resolvedApprovedThreads, enrolledStudentIds, role]);
  const filteredApprovedThreads = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return enrolledApprovedThreads;
    return enrolledApprovedThreads.filter((thread) => {
      const name = String(thread.otherParticipantName || "").toLowerCase();
      const text = String(thread.lastMessageText || "").toLowerCase();
      return name.includes(query) || text.includes(query);
    });
  }, [enrolledApprovedThreads, searchQuery]);
  const pendingThreads = useMemo(
    () => threads.filter((thread) => thread.status === "pending"),
    [threads]
  );
  const filteredStudentThreads = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return resolvedApprovedThreads;
    return resolvedApprovedThreads.filter((thread) => {
      const name = String(thread.otherParticipantName || "").toLowerCase();
      const text = String(thread.lastMessageText || "").toLowerCase();
      return name.includes(query) || text.includes(query);
    });
  }, [resolvedApprovedThreads, searchQuery]);
  const filteredAvailableTutors = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return availableTutors.slice(0, 6);
    return availableTutors.filter((item) => {
      const name = String(item?.user?.name || "").toLowerCase();
      const subject = String((item?.subjects || []).map((s: any) => s?.title || "").join(" ")).toLowerCase();
      return name.includes(query) || subject.includes(query);
    });
  }, [availableTutors, searchQuery]);
  const filteredEnrolledStudents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return enrolledStudents.slice(0, 8);
    return enrolledStudents.filter((item) => String(item.name || "").toLowerCase().includes(query));
  }, [enrolledStudents, searchQuery]);

  const loadThreads = async () => {
    const res = await apiFetch<any>("/messages/threads");
    setThreads(Array.isArray(res.data) ? res.data : []);
  };

  const loadNotifications = async () => {
    const res = await apiFetch<any>("/notifications?type=all");
    setNotifications(Array.isArray(res.data) ? res.data : []);
  };
  const loadEnrolledStudents = async () => {
    if (role !== "tutor") return;
    const res = await apiFetch<any>("/enrollments");
    const normalized = Array.isArray(res.data)
      ? res.data
          .map((item: any) => ({
            _id: String(item?.student?._id || ""),
            name: String(item?.student?.name || "Student"),
          }))
          .filter((item: any) => item._id)
      : [];
    const ids = normalized.map((item: any) => item._id);
    setEnrolledStudentIds(Array.from(new Set(ids)));
    const uniqueMap = new Map<string, { _id: string; name: string }>();
    normalized.forEach((item: any) => {
      if (!uniqueMap.has(item._id)) uniqueMap.set(item._id, item);
    });
    setEnrolledStudents(Array.from(uniqueMap.values()));
  };
  const loadAvailableTutors = async () => {
    if (role !== "student") return;
    const res = await apiFetch<any>("/professionals", { auth: false });
    setAvailableTutors(Array.isArray(res.data) ? res.data : []);
  };

  const loadThreadMessages = async (threadId: string) => {
    const res = await apiFetch<any>(`/messages/threads/${threadId}/messages`);
    setChatMessages(Array.isArray(res.data) ? res.data : []);
    await apiFetch(`/messages/threads/${threadId}/read`, { method: "POST" });
    markThreadRead(threadId);
    setThreads((prev) =>
      prev.map((thread) => (thread._id === threadId ? { ...thread, isUnread: false } : thread))
    );
  };

  useEffect(() => {
    const init = async () => {
      try {
        if (role === "tutor") {
          await Promise.all([loadThreads(), loadNotifications(), loadEnrolledStudents()]);
        } else {
          await Promise.all([loadThreads(), loadNotifications(), loadAvailableTutors()]);
        }
      } catch {
        // ignore
      }
    };
    init();

    const socket = connectSocket();
    socket.on("notification:new", (payload: any) => {
      if (payload?.notification) {
        setNotifications((prev) => [payload.notification, ...prev]);
      }
    });
    socket.on("thread:updated", (payload: any) => {
      if (!payload?.thread?._id) return;
      setThreads((prev) => {
        const next = prev.filter((item) => item._id !== payload.thread._id);
        return [payload.thread, ...next];
      });
    });
    socket.on("message:new", (payload: any) => {
      if (!payload?.message || !payload?.threadId) return;
      if (payload.threadId === activeThreadId) {
        setChatMessages((prev) => {
          if (prev.some((m) => m._id === payload.message._id)) return prev;
          return [...prev, payload.message];
        });
      }
    });

    return () => {
      socket.off("notification:new");
      socket.off("thread:updated");
      socket.off("message:new");
    };
  }, [activeThreadId]);

  useEffect(() => {
    if (!activeThreadId) return;
    joinThread(activeThreadId);
    return () => leaveThread(activeThreadId);
  }, [activeThreadId]);

  const activeList = useMemo(() => {
    if (activeTab === "notification") return notifications;
    return role === "tutor" ? filteredApprovedThreads : filteredStudentThreads;
  }, [activeTab, notifications, role, filteredApprovedThreads, filteredStudentThreads]);

  const sendCurrentMessage = async () => {
    if (!activeThreadId || !chatInput.trim()) return;
    try {
      await apiFetch(`/messages/threads/${activeThreadId}/messages`, {
        method: "POST",
        body: JSON.stringify({ text: chatInput.trim() }),
      });
      setChatInput("");
    } catch (error) {
      setActionStatus(error instanceof Error ? error.message : "Failed to send message");
    }
  };

  const approveRequest = async (threadId: string) => {
    try {
      await apiFetch(`/messages/threads/${threadId}/approve`, { method: "POST" });
      setActionStatus("Request approved.");
      await loadThreads();
    } catch (error) {
      setActionStatus(error instanceof Error ? error.message : "Unable to approve request.");
    }
  };

  const rejectRequest = async (threadId: string) => {
    try {
      await apiFetch(`/messages/threads/${threadId}/reject`, { method: "POST" });
      setActionStatus("Request rejected.");
      await loadThreads();
    } catch (error) {
      setActionStatus(error instanceof Error ? error.message : "Unable to reject request.");
    }
  };

  const searchMessages = async () => {
    if (role === "tutor") {
      setSearchResults([]);
      return;
    }
    if (role === "student") {
      setSearchResults([]);
      return;
    }
    const q = searchQuery.trim();
    if (!q) {
      setSearchResults([]);
      return;
    }
    try {
      const res = await apiFetch<any>(`/messages/search?q=${encodeURIComponent(q)}`);
      setSearchResults(Array.isArray(res.data) ? res.data : []);
    } catch {
      setSearchResults([]);
    }
  };

  const requestTutorChat = async (tutorId: string) => {
    if (!tutorId) return;
    try {
      setRequestingTutorId(tutorId);
      await apiFetch("/messages/threads/request", {
        method: "POST",
        body: JSON.stringify({ tutorId }),
      });
      await loadThreads();
      setActionStatus("Message request sent.");
    } catch (error) {
      setActionStatus(error instanceof Error ? error.message : "Unable to send request.");
    } finally {
      setRequestingTutorId("");
    }
  };
  const startChatWithStudent = async (studentId: string) => {
    if (!studentId) return;
    try {
      setStartingStudentId(studentId);
      const res = await apiFetch<any>("/messages/threads/start", {
        method: "POST",
        body: JSON.stringify({ studentId }),
      });
      const threadId = String(res?.data?._id || "");
      await loadThreads();
      setTutorMessageView("approved");
      if (threadId) {
        setActiveThreadId(threadId);
        await loadThreadMessages(threadId);
      }
      setActionStatus("Chat started. You can message this student now.");
    } catch (error) {
      setActionStatus(error instanceof Error ? error.message : "Unable to start chat.");
    } finally {
      setStartingStudentId("");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <div className="flex w-full items-center gap-3 justify-start">
          <Link
            href={`/dashboard/${role}`}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-soft"
          >
            <ChevronLeft className="h-4 w-4 text-slate-500" />
          </Link>
          <h1 className="text-lg font-semibold text-slate-900">Notifications</h1>
        </div>

        <div className="flex justify-center gap-6 text-xs font-semibold text-slate-500">
          {(["message", "notification"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-2 ${activeTab === tab ? "border-b-2 border-brand-600 text-brand-600" : ""}`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="rounded-3xl bg-white p-4 shadow-soft">
          {activeTab === "message" && role === "tutor" && (
            <div className="mb-3 flex gap-2 text-xs font-semibold">
              <button
                onClick={() => setTutorMessageView("approved")}
                className={`rounded-full px-3 py-1 ${
                  tutorMessageView === "approved"
                    ? "bg-brand-600 text-white"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                Approved Chats
              </button>
              <button
                onClick={() => setTutorMessageView("requests")}
                className={`rounded-full px-3 py-1 ${
                  tutorMessageView === "requests"
                    ? "bg-brand-600 text-white"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                Message Requests
              </button>
            </div>
          )}

          {activeTab === "message" && (role !== "tutor" || tutorMessageView === "approved") && (
            <div className="mb-3 flex items-center gap-2">
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={role === "tutor" ? "Search enrolled student name" : "Search messages"}
                className="flex-1 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs"
              />
              <button
                onClick={searchMessages}
                className="rounded-full bg-brand-600 px-3 py-2 text-xs font-semibold text-white"
              >
                Search
              </button>
            </div>
          )}

          {activeTab === "message" && searchResults.length > 0 && (
            <div className="mb-4 rounded-2xl bg-slate-50 p-3 text-xs text-slate-600">
              {searchResults.slice(0, 5).map((msg) => (
                <p key={msg._id} className="truncate py-1">
                  {msg.text}
                </p>
              ))}
            </div>
          )}

          {activeTab === "message" &&
            role === "student" &&
            searchQuery.trim().length > 0 &&
            filteredStudentThreads.length === 0 && (
              <div className="mb-4 rounded-2xl bg-slate-50 p-3">
                <p className="text-xs font-semibold text-slate-700">Available teachers</p>
                <div className="mt-2 flex flex-col gap-2">
                  {filteredAvailableTutors.length === 0 && (
                    <p className="text-xs text-slate-500">No teachers matched your search.</p>
                  )}
                  {filteredAvailableTutors.slice(0, 6).map((teacher: any) => (
                    <div
                      key={teacher._id}
                      className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-3 py-2"
                    >
                      <div>
                        <p className="text-xs font-semibold text-slate-700">{teacher?.user?.name || "Teacher"}</p>
                        <p className="text-[11px] text-slate-500">
                          {(teacher?.subjects || []).map((s: any) => s?.title).filter(Boolean).join(", ") || "Tutor"}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={requestingTutorId === String(teacher._id)}
                        onClick={() => requestTutorChat(String(teacher._id))}
                        className="rounded-full bg-brand-600 px-3 py-1 text-xs font-semibold text-white disabled:opacity-60"
                      >
                        {requestingTutorId === String(teacher._id) ? "Sending..." : "Request chat"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

          {activeTab === "message" &&
            role === "tutor" &&
            tutorMessageView === "approved" &&
            searchQuery.trim().length > 0 &&
            filteredApprovedThreads.length === 0 && (
              <div className="mb-4 rounded-2xl bg-slate-50 p-3">
                <p className="text-xs font-semibold text-slate-700">Enrolled students</p>
                <div className="mt-2 flex flex-col gap-2">
                  {filteredEnrolledStudents.length === 0 && (
                    <p className="text-xs text-slate-500">No enrolled student matched your search.</p>
                  )}
                  {filteredEnrolledStudents.map((student) => (
                    <div
                      key={student._id}
                      className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-3 py-2"
                    >
                      <p className="text-xs font-semibold text-slate-700">{student.name}</p>
                      <button
                        type="button"
                        disabled={startingStudentId === student._id}
                        onClick={() => startChatWithStudent(student._id)}
                        className="rounded-full bg-brand-600 px-3 py-1 text-xs font-semibold text-white disabled:opacity-60"
                      >
                        {startingStudentId === student._id ? "Starting..." : "Start chat"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

          <div className="flex flex-col gap-3">
            {(role === "tutor" && tutorMessageView === "requests" ? [] : activeList).map((item: any) => {
              const threadId = item._id || item.id;
              return (
                <div
                  key={threadId}
                  className="flex items-center justify-between rounded-2xl border border-slate-100 px-4 py-3"
                  onClick={() => {
                    if (activeTab !== "message") return;
                    setActiveThreadId(threadId);
                    loadThreadMessages(threadId).catch(() => {});
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-100 text-xs font-semibold text-brand-600">
                      {activeTab === "message" ? "M" : "N"}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {item.otherParticipantName || item.title || "Thread"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {item.body || item.message || item.lastMessageText || "No message yet."}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.status === "pending" && (
                      <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] text-amber-700">
                        pending
                      </span>
                    )}
                    {item.isUnread && (
                      <span className="rounded-full bg-rose-100 px-2 py-1 text-[10px] text-rose-600">
                        unread
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {activeTab === "message" && role === "student" && approvedThreads.length === 0 && (
              <div className="rounded-2xl bg-slate-50 p-3 text-xs text-slate-500">
                No approved chats yet. Use Explore to request a tutor chat.
              </div>
            )}

            {activeTab === "message" && role === "tutor" && tutorMessageView === "requests" && (
              <div className="mt-2 rounded-2xl bg-slate-50 p-3">
                <p className="text-xs font-semibold text-slate-700">Message Requests</p>
                <div className="mt-2 flex flex-col gap-2">
                  {pendingThreads.length === 0 && (
                    <p className="text-xs text-slate-500">No pending message requests.</p>
                  )}
                  {pendingThreads.map((thread) => (
                    <div
                      key={thread._id}
                      className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-3 py-2"
                    >
                      <p className="text-xs text-slate-700">Request for chat</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => approveRequest(thread._id)}
                          className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => rejectRequest(thread._id)}
                          className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "message" && activeThreadId && selectedThread?.status === "approved" && (
              <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                <div className="flex max-h-40 flex-col gap-2 overflow-y-auto text-xs text-slate-600">
                  {chatMessages.length === 0 && <p className="text-slate-400">Start the conversation.</p>}
                  {chatMessages.map((msg) => (
                    <div
                      key={msg._id}
                      className={`rounded-2xl px-3 py-2 ${
                        (msg.sender?.role === role || (role === "tutor" && msg.sender?.role === "teacher"))
                          ? "self-end bg-brand-100 text-brand-700"
                          : "bg-white"
                      }`}
                    >
                      {msg.text}
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <input
                    value={chatInput}
                    onChange={(event) => setChatInput(event.target.value)}
                    placeholder="Type a message"
                    className="flex-1 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs"
                  />
                  <button
                    onClick={sendCurrentMessage}
                    className="rounded-full bg-brand-600 px-3 py-2 text-xs font-semibold text-white"
                  >
                    Send
                  </button>
                </div>
              </div>
            )}
          </div>
          {actionStatus && <p className="mt-3 text-xs text-emerald-600">{actionStatus}</p>}
        </div>
      </div>
    </div>
  );
}
