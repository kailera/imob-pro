"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AlertTriangle, CheckCircle2, Loader2, X, XCircle } from "lucide-react";
import type { InterBatchOperation, InterBatchTaskDto } from "@/lib/inter-batch-task-types";

export const INTER_BATCH_TASK_FINISHED_EVENT = "inter-batch-task-finished";

type InterBatchTaskContextValue = {
  tasks: InterBatchTaskDto[];
  hasActiveTask: boolean;
  startingOperation: InterBatchOperation | null;
  startTask: (operation: InterBatchOperation) => Promise<boolean>;
  refreshTasks: () => Promise<void>;
};

const InterBatchTaskContext = createContext<InterBatchTaskContextValue | null>(null);

function isActive(task: InterBatchTaskDto) {
  return task.status === "QUEUED" || task.status === "RUNNING";
}

function mergeTask(tasks: InterBatchTaskDto[], task: InterBatchTaskDto) {
  return [task, ...tasks.filter(current => current.id !== task.id)].slice(0, 3);
}

export function InterBatchTaskProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<InterBatchTaskDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [startingOperation, setStartingOperation] = useState<InterBatchOperation | null>(null);
  const requestControllerRef = useRef<AbortController | null>(null);
  const knownStatusesRef = useRef(new Map<string, InterBatchTaskDto["status"]>());
  const initializedRef = useRef(false);

  const refreshTasks = useCallback(async () => {
    requestControllerRef.current?.abort();
    const controller = new AbortController();
    requestControllerRef.current = controller;
    try {
      const response = await fetch("/api/inter/tasks", {
        cache: "no-store",
        signal: controller.signal,
      });
      const payload = await response.json() as {
        success?: boolean;
        data?: InterBatchTaskDto[];
        error?: string;
      };
      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.error || "Não foi possível consultar as tarefas.");
      }

      if (initializedRef.current) {
        for (const task of payload.data) {
          const previousStatus = knownStatusesRef.current.get(task.id);
          if (
            (previousStatus === "QUEUED" || previousStatus === "RUNNING")
            && !isActive(task)
          ) {
            window.dispatchEvent(new CustomEvent(INTER_BATCH_TASK_FINISHED_EVENT, {
              detail: task,
            }));
          }
        }
      }
      knownStatusesRef.current = new Map(payload.data.map(task => [task.id, task.status]));
      initializedRef.current = true;
      setTasks(payload.data);
      setError(null);
    } catch (requestError) {
      if (requestError instanceof DOMException && requestError.name === "AbortError") return;
      setError(requestError instanceof Error
        ? requestError.message
        : "Não foi possível consultar as tarefas.");
    } finally {
      if (requestControllerRef.current === controller) requestControllerRef.current = null;
    }
  }, []);

  const hasActiveTask = tasks.some(isActive);

  useEffect(() => {
    const initialRefresh = window.setTimeout(() => void refreshTasks(), 0);
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void refreshTasks();
    };
    const interval = window.setInterval(refreshWhenVisible, hasActiveTask ? 2_000 : 15_000);
    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.clearTimeout(initialRefresh);
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      requestControllerRef.current?.abort();
    };
  }, [hasActiveTask, refreshTasks]);

  const startTask = useCallback(async (operation: InterBatchOperation) => {
    if (startingOperation || hasActiveTask) return false;
    setStartingOperation(operation);
    setError(null);
    try {
      const response = await fetch("/api/inter/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operation }),
      });
      const payload = await response.json() as {
        success?: boolean;
        data?: InterBatchTaskDto;
        error?: string;
      };
      if (payload.data) {
        knownStatusesRef.current.set(payload.data.id, payload.data.status);
        setTasks(current => mergeTask(current, payload.data!));
      }
      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.error || "Não foi possível iniciar a tarefa.");
      }
      return true;
    } catch (requestError) {
      setError(requestError instanceof Error
        ? requestError.message
        : "Não foi possível iniciar a tarefa.");
      return false;
    } finally {
      setStartingOperation(null);
    }
  }, [hasActiveTask, startingOperation]);

  const dismissTask = useCallback(async (taskId: string) => {
    const response = await fetch("/api/inter/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId }),
    });
    if (response.ok) {
      knownStatusesRef.current.delete(taskId);
      setTasks(current => current.filter(task => task.id !== taskId));
    }
  }, []);

  const value = useMemo<InterBatchTaskContextValue>(() => ({
    tasks,
    hasActiveTask,
    startingOperation,
    startTask,
    refreshTasks,
  }), [hasActiveTask, refreshTasks, startTask, startingOperation, tasks]);

  return (
    <InterBatchTaskContext.Provider value={value}>
      {children}
      <InterBatchTaskPanel
        tasks={tasks}
        error={error}
        onClearError={() => setError(null)}
        onDismiss={dismissTask}
      />
    </InterBatchTaskContext.Provider>
  );
}

export function useInterBatchTasks() {
  const context = useContext(InterBatchTaskContext);
  if (!context) throw new Error("useInterBatchTasks requer InterBatchTaskProvider.");
  return context;
}

function InterBatchTaskPanel({
  tasks,
  error,
  onClearError,
  onDismiss,
}: {
  tasks: InterBatchTaskDto[];
  error: string | null;
  onClearError: () => void;
  onDismiss: (taskId: string) => Promise<void>;
}) {
  if (tasks.length === 0 && !error) return null;
  return (
    <aside
      data-slot="inter-batch-task-panel"
      className="fixed left-4 top-24 z-40 flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-3"
      aria-label="Tarefas do Banco Inter"
    >
      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-white p-4 shadow-xl" role="alert">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" aria-hidden="true" />
          <p className="min-w-0 flex-1 text-sm font-semibold text-red-700">{error}</p>
          <button
            type="button"
            onClick={onClearError}
            aria-label="Fechar aviso"
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#004777]"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}
      {tasks.map(task => (
        <InterBatchTaskCard key={task.id} task={task} onDismiss={onDismiss} />
      ))}
    </aside>
  );
}

function InterBatchTaskCard({
  task,
  onDismiss,
}: {
  task: InterBatchTaskDto;
  onDismiss: (taskId: string) => Promise<void>;
}) {
  const active = isActive(task);
  const partial = task.status === "PARTIAL";
  const failed = task.status === "FAILED";
  const statusLabel = task.status === "QUEUED"
    ? "Aguardando processamento"
    : task.status === "RUNNING"
      ? "Tarefa em andamento"
      : task.status === "SUCCEEDED"
        ? "Tarefa concluída"
        : partial
          ? "Concluída com falhas"
          : "Tarefa não concluída";

  return (
    <section
      data-slot="inter-batch-task-card"
      className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-xl"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0">
          {active ? (
            <Loader2 className="h-5 w-5 motion-safe:animate-spin text-[#004777]" aria-hidden="true" />
          ) : failed ? (
            <XCircle className="h-5 w-5 text-red-600" aria-hidden="true" />
          ) : partial ? (
            <AlertTriangle className="h-5 w-5 text-amber-600" aria-hidden="true" />
          ) : (
            <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-hidden="true" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-extrabold text-[#280003]">{task.name}</h2>
          <p className="mt-0.5 text-xs font-medium text-gray-500">{statusLabel}</p>
        </div>
        {!active && (
          <button
            type="button"
            onClick={() => void onDismiss(task.id)}
            aria-label={`Fechar ${task.name}`}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#004777]"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="mt-3">
        <div className="mb-1.5 flex justify-between text-xs font-bold text-gray-600">
          <span>{task.processed} de {task.total}</span>
          <span>{task.progress}%</span>
        </div>
        <div
          className="h-2.5 overflow-hidden rounded-full bg-gray-100"
          role="progressbar"
          aria-label={`Progresso de ${task.name}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={task.progress}
        >
          <div
            className={`h-full rounded-full transition-[width] duration-300 ${failed ? "bg-red-600" : partial ? "bg-amber-500" : "bg-[#004777]"}`}
            style={{ width: `${task.progress}%` }}
          />
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-bold">
        <span className="rounded-xl bg-emerald-50 px-3 py-2 text-emerald-700">
          {task.succeeded} sucesso(s)
        </span>
        <span className="rounded-xl bg-red-50 px-3 py-2 text-red-700">
          {task.failed} falha(s)
        </span>
      </div>
      {task.summaryMessage && (
        <p className="mt-3 text-xs font-medium text-gray-600">{task.summaryMessage}</p>
      )}
    </section>
  );
}
