import type { Candidate, Risk, Scenario } from "./planner";

export type AgentInput = { lotId: number; risk: Risk; scenario: Scenario };
export type ToolEvent = { index: number; name: string; args: unknown; startedAt: string; finishedAt: string; status: "ok" | "rejected"; result?: unknown; error?: string };
export type ModelEvent = { index: number; startedAt: string; finishedAt: string; request: unknown; response?: unknown; error?: string };
export type AgentTrace = {
  version: "agriroute.agent-trace.v1"; runId: string; source: "google-genai" | "mocked-test";
  model: string; sdkVersion: string; startedAt: string; finishedAt: string;
  datasetSha256: string; contextSha256: string; input: AgentInput;
  plannerVersion: "checkpoint-1.v1"; toolVersion: "checkpoint-2.v1";
  status: "success" | "failed"; failure?: string;
  modelRequests: ModelEvent[]; tools: ToolEvent[]; toolAttempts: number;
  selection: Candidate | null; fallback: Candidate | null;
  fallbackStatus: "not_used" | "deterministic_available" | "no_feasible_candidate";
};
export type StoredTrace = { trace: AgentTrace; sha256: string; hmac: string; integrity: "local-HMAC-SHA256" };
