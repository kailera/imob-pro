import { NextResponse } from "next/server";
import { requireUserContext } from "@/lib/auth";
import {
  createInterBatchTask,
  dismissInterBatchTask,
  listVisibleInterBatchTasks,
  toInterBatchTaskDto,
} from "@/lib/inter-batch-tasks";
import type { InterBatchOperation } from "@/lib/inter-batch-task-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isInterBatchOperation(value: unknown): value is InterBatchOperation {
  return value === "EMIT" || value === "SYNC";
}

function apiError(error: unknown) {
  const message = error instanceof Error ? error.message : "Erro inesperado.";
  const status = message === "Não autenticado" ? 401 : 500;
  if (status === 500) console.error("[inter-tasks-api] Erro:", error);
  return NextResponse.json(
    { success: false, error: status === 401 ? message : "Não foi possível processar a tarefa." },
    { status },
  );
}

/** Lista tarefas bancárias visíveis da imobiliária autenticada. */
export async function GET() {
  try {
    const context = await requireUserContext();
    if (!context.user.ativo) {
      return NextResponse.json({ success: false, error: "Usuário inativo." }, { status: 403 });
    }
    const tasks = await listVisibleInterBatchTasks(context.tenantId);
    return NextResponse.json(
      { success: true, data: tasks },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}

/** Cria um lote de emissão ou sincronização e retorna imediatamente. */
export async function POST(request: Request) {
  try {
    const context = await requireUserContext();
    if (!context.user.ativo) {
      return NextResponse.json({ success: false, error: "Usuário inativo." }, { status: 403 });
    }

    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      return NextResponse.json(
        { success: false, error: "Envie o corpo como application/json." },
        { status: 415 },
      );
    }
    const body = await request.json().catch(() => null) as { operation?: unknown } | null;
    if (!isInterBatchOperation(body?.operation)) {
      return NextResponse.json(
        { success: false, error: "Operação inválida. Use EMIT ou SYNC." },
        { status: 400 },
      );
    }

    const result = await createInterBatchTask({
      tenantId: context.tenantId,
      createdByUserId: context.userId,
      operation: body.operation,
    });
    const task = toInterBatchTaskDto(result.task);
    if (!result.created) {
      return NextResponse.json(
        {
          success: false,
          error: "Já existe uma tarefa do Banco Inter em andamento para esta imobiliária.",
          data: task,
        },
        { status: 409 },
      );
    }

    return NextResponse.json({ success: true, data: task }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}

/** Dispensa da interface uma tarefa já finalizada. */
export async function PATCH(request: Request) {
  try {
    const context = await requireUserContext();
    if (!context.user.ativo) {
      return NextResponse.json({ success: false, error: "Usuário inativo." }, { status: 403 });
    }
    const body = await request.json().catch(() => null) as { taskId?: unknown } | null;
    if (typeof body?.taskId !== "string" || !body.taskId.trim()) {
      return NextResponse.json(
        { success: false, error: "Identificador da tarefa inválido." },
        { status: 400 },
      );
    }
    const dismissed = await dismissInterBatchTask(context.tenantId, body.taskId);
    if (!dismissed) {
      return NextResponse.json(
        { success: false, error: "Tarefa não encontrada ou ainda em andamento." },
        { status: 409 },
      );
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiError(error);
  }
}
