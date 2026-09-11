// Omni-Forge Mission Control Client Script

let state = {
  projects: [],
  tasks: [],
  attention: [],
};

let currentViewMode = "projects"; // 'projects' | 'epics'
let previewStatusCache = { running: false };

// Conectar ao SSE Stream para atualização em tempo real
function setupSSE() {
  const eventSource = new EventSource("/api/stream");
  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      console.log("⚡ SSE Event:", data);
      if (data.type === "E2E_RECORDING_FINISHED") {
        if (window.selectedTask && window.selectedTask.taskId === data.taskId) {
          onRecordingFinished(data);
        }
      }
      refreshData();
    } catch (e) {}
  };
  eventSource.onerror = () => {
    console.warn("SSE desconectado, tentando reconectar em 3s...");
    setTimeout(setupSSE, 3000);
  };
}

async function refreshData() {
  try {
    const res = await fetch("/api/status");
    state = await res.json();
    renderAttentionBanner();
    if (currentViewMode === "epics") {
      renderEpicKanban();
    } else {
      renderProjectsKanban();
    }
    renderWorkQueue();
    updateProjectSelects();
    checkPreviewStatus();
  } catch (err) {
    console.error("Erro ao atualizar status:", err);
  }
}

// Controle do Modo de Visualização (Por Projeto vs Por Feature / Épico)
function setViewMode(mode) {
  currentViewMode = mode;
  const btnProj = document.getElementById("btn-view-projects");
  const btnEpic = document.getElementById("btn-view-epics");

  if (mode === "projects") {
    if (btnProj)
      btnProj.className =
        "px-2.5 py-1 rounded font-bold bg-white text-sand-900 shadow-sm transition-all flex items-center space-x-1";
    if (btnEpic)
      btnEpic.className =
        "px-2.5 py-1 rounded font-medium text-sand-600 hover:text-sand-900 transition-all flex items-center space-x-1";
    renderProjectsKanban();
  } else {
    if (btnProj)
      btnProj.className =
        "px-2.5 py-1 rounded font-medium text-sand-600 hover:text-sand-900 transition-all flex items-center space-x-1";
    if (btnEpic)
      btnEpic.className =
        "px-2.5 py-1 rounded font-bold bg-white text-sand-900 shadow-sm transition-all flex items-center space-x-1";
    renderEpicKanban();
  }
}

// PREVIEW TRIO CLIENT LOGIC
async function checkPreviewStatus() {
  try {
    const res = await fetch("/api/preview/status");
    const data = await res.json();
    previewStatusCache = data;
    updatePreviewUI(data);
  } catch (e) {
    console.warn("Erro ao checar status do preview:", e);
  }
}

function updatePreviewUI(data) {
  const isRunning = data.running;
  const indicator = document.getElementById("preview-main-indicator");
  const btnStart = document.getElementById("btn-start-preview");
  const btnStop = document.getElementById("btn-stop-preview");
  const btnOpenApp = document.getElementById("btn-open-preview-app");
  const btnOpenStore = document.getElementById("btn-open-preview-store");

  const apiBadge = document.getElementById("preview-status-api");
  const appBadge = document.getElementById("preview-status-app");
  const storeBadge = document.getElementById("preview-status-store");

  if (!indicator) return;

  if (isRunning) {
    indicator.className = "w-2 h-2 rounded-full bg-emerald-400 animate-pulse";
    if (btnStart) btnStart.classList.add("hidden");
    if (btnStop) btnStop.classList.remove("hidden");
    if (btnOpenApp) btnOpenApp.classList.remove("hidden");
    if (btnOpenStore) btnOpenStore.classList.remove("hidden");

    if (apiBadge)
      apiBadge.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span><span class="text-emerald-300">API :3010 (Online)</span>`;
    if (appBadge)
      appBadge.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span><span class="text-emerald-300">App :5183 (Online)</span>`;
    if (storeBadge)
      storeBadge.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span><span class="text-emerald-300">Store :4010 (Online)</span>`;
  } else {
    indicator.className = "w-2 h-2 rounded-full bg-sand-500";
    if (btnStart) btnStart.classList.remove("hidden");
    if (btnStop) btnStop.classList.add("hidden");
    if (btnOpenApp) btnOpenApp.classList.add("hidden");
    if (btnOpenStore) btnOpenStore.classList.add("hidden");

    if (apiBadge)
      apiBadge.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-sand-600"></span><span class="text-sand-400">API :3010</span>`;
    if (appBadge)
      appBadge.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-sand-600"></span><span class="text-sand-400">App :5183</span>`;
    if (storeBadge)
      storeBadge.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-sand-600"></span><span class="text-sand-400">Store :4010</span>`;
  }
}

async function startPreviewTrio() {
  const btnStart = document.getElementById("btn-start-preview");
  if (btnStart) {
    btnStart.innerHTML = "<span>⏳</span><span>Subindo serviços...</span>";
    btnStart.disabled = true;
  }

  try {
    const res = await fetch("/api/preview/start", { method: "POST" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Falha ao iniciar preview");
    await checkPreviewStatus();
  } catch (err) {
    alert("Erro ao iniciar preview: " + err.message);
  } finally {
    if (btnStart) {
      btnStart.innerHTML = "<span>🚀</span><span>Subir Trio de Preview</span>";
      btnStart.disabled = false;
    }
  }
}

async function stopPreviewTrio() {
  const btnStop = document.getElementById("btn-stop-preview");
  if (btnStop) {
    btnStop.textContent = "Parando...";
    btnStop.disabled = true;
  }

  try {
    await fetch("/api/preview/stop", { method: "POST" });
    await checkPreviewStatus();
  } catch (err) {
    alert("Erro ao parar preview: " + err.message);
  } finally {
    if (btnStop) {
      btnStop.textContent = "⏹ Desligar";
      btnStop.disabled = false;
    }
  }
}

// ─── Approval Gate Sound & Badge ────────────────────────────────
let _lastGateCount = 0;
function _playGateSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(660, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
  } catch (_) {}
}

function _updateDocBadge(count) {
  const base = "Omni-Forge";
  document.title = count > 0 ? `(${count}) ⚠️ ${base}` : base;
}

// 1. Renderizar Seção de APPROVAL GATES (v2 — todos os gates com SHA)
function renderAttentionBanner() {
  const banner = document.getElementById("attention-container");
  const textElem = document.getElementById("attention-text");

  const gates = state.attention || [];
  const count = gates.length;

  // Som + badge quando abre novo gate
  if (count > _lastGateCount) {
    _playGateSound();
  }
  _lastGateCount = count;
  _updateDocBadge(count);

  if (count === 0) {
    banner.classList.add("hidden");
    return;
  }

  banner.classList.remove("hidden");

  // Renderiza todos os gates, não apenas o primeiro
  textElem.innerHTML = gates.map((gate) => {
    const sha = gate.commitSha ? `<code class="bg-amber-100 text-amber-800 px-1 rounded font-mono text-xs">${gate.commitSha}</code>` : "";
    const msg = gate.commitMessage
      ? `<span class="text-amber-700 italic text-xs">"${gate.commitMessage}"</span>`
      : "";
    const branch = gate.worktreeRef
      ? `<code class="text-xs text-amber-600 opacity-75">${gate.worktreeRef}</code>`
      : "";
    const reason = gate.reason
      ? `<em class="text-amber-600">${gate.reason}</em>`
      : "<em>Aguardando validação humana</em>";

    return `
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-amber-200 last:border-0 py-2 first:pt-0 last:pb-0">
      <div class="flex flex-col gap-0.5 min-w-0">
        <div class="flex flex-wrap items-center gap-1.5 text-xs">
          <strong class="text-amber-900">⚠️ Gate</strong>
          <code class="bg-amber-100 text-amber-800 px-1 rounded">${gate.taskId}</code>
          <span class="text-amber-700">papel: <strong>${gate.role || gate.fromRole || "?"}</strong></span>
          ${sha}
          ${msg}
          ${branch ? `<span class="opacity-60">${branch}</span>` : ""}
        </div>
        <div class="text-xs text-amber-600">${reason}</div>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <button
          onclick="approveGate('${gate.projectId || gate.project}', '${gate.taskId}')"
          class="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5 rounded shadow transition-colors"
          title="Aprovar task e despachar para o próximo papel"
        >
          ✅ Approve
        </button>
        <button
          onclick="openRejectModal('${gate.projectId || gate.project}', '${gate.taskId}')"
          class="inline-flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-3 py-1.5 rounded shadow transition-colors"
          title="Rejeitar com feedback"
        >
          ❌ Reject
        </button>
        <button
          onclick="openTaskDetails('${gate.projectId || gate.project}', '${gate.taskId}')"
          class="inline-flex items-center gap-1 bg-white hover:bg-amber-50 text-amber-800 border border-amber-300 text-xs font-medium px-2.5 py-1.5 rounded transition-colors"
          title="Ver detalhes da task"
        >
          🔍 Detalhes
        </button>
      </div>
    </div>`;
  }).join("");

  window.currentAttentionTask = gates[0];
}

// Approve via API v2
async function approveGate(projectId, taskId) {
  try {
    const res = await fetch("/api/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, taskId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Erro desconhecido");
    refreshData();
    // Feedback visual rápido
    const msg = data.message || `Task '${taskId}' aprovada.`;
    console.info("[Omni-Forge Approve]", msg);
  } catch (err) {
    alert("Erro ao aprovar: " + err.message);
  }
}

// Legado — mantido para compatibilidade com botões existentes
async function approveAttentionTask() {
  if (!window.currentAttentionTask) return;
  const { projectId, project, taskId } = window.currentAttentionTask;
  await approveGate(projectId || project, taskId);
}

// Reject — abre modal inline em vez de prompt()
function openRejectModal(projectId, taskId) {
  const existing = document.getElementById("_omni-reject-modal");
  if (existing) existing.remove();

  const modal = document.createElement("div");
  modal.id = "_omni-reject-modal";
  modal.className = "fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm";
  modal.innerHTML = `
    <div class="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4 space-y-4">
      <h3 class="font-bold text-red-700 text-sm flex items-center gap-2">❌ Rejeitar Task <code class="font-mono bg-red-50 px-1 rounded">${taskId}</code></h3>
      <p class="text-xs text-gray-600">Descreva o motivo da rejeição e as instruções de correção para o agente.</p>
      <textarea
        id="_reject-reason-input"
        class="w-full border border-gray-300 rounded-lg p-3 text-sm resize-none focus:ring-2 focus:ring-red-400 focus:border-red-400 outline-none"
        rows="4"
        placeholder="Ex: Os testes não cobrem o caso de erro 401. Adicione validação de token expirado."
        autofocus
      ></textarea>
      <div class="flex justify-end gap-2">
        <button onclick="document.getElementById('_omni-reject-modal').remove()" class="text-xs px-4 py-2 rounded border border-gray-300 hover:bg-gray-50 transition-colors">Cancelar</button>
        <button onclick="_submitReject('${projectId}', '${taskId}')" class="text-xs px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white font-semibold transition-colors">Confirmar Rejeição</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  setTimeout(() => document.getElementById("_reject-reason-input")?.focus(), 50);
}

async function _submitReject(projectId, taskId) {
  const reason = document.getElementById("_reject-reason-input")?.value?.trim();
  if (!reason) { alert("Informe o motivo da rejeição."); return; }
  document.getElementById("_omni-reject-modal")?.remove();

  try {
    const res = await fetch("/api/reject", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, taskId, reason }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Erro desconhecido");
    refreshData();
    console.info("[Omni-Forge Reject]", data.message);
  } catch (err) {
    alert("Erro ao rejeitar: " + err.message);
  }
}

async function rejectAttentionTask() {
  if (!window.currentAttentionTask) return;
  const { projectId, project, taskId } = window.currentAttentionTask;
  openRejectModal(projectId || project, taskId);
}

function viewAttentionDoc() {
  if (!window.currentAttentionTask) return;
  openTaskDetails(
    window.currentAttentionTask.projectId || window.currentAttentionTask.project,
    window.currentAttentionTask.taskId,
  );
}



// 2. Renderizar os Kanbans dos Projetos
function renderProjectsKanban() {
  const container = document.getElementById("projects-container");

  if (!state.projects || state.projects.length === 0) {
    container.innerHTML = `
      <div class="bg-white rounded-lg border border-dashed border-sand-300 p-12 text-center space-y-4 max-w-lg mx-auto mt-8 card-shadow">
        <div class="w-12 h-12 bg-sand-100 rounded-full flex items-center justify-center mx-auto text-xl">🚀</div>
        <div class="space-y-1">
          <h3 class="font-bold text-sand-900 text-sm">Nenhum projeto registrado no Forge</h3>
          <p class="text-sand-500 text-xs leading-relaxed">
            Adicione seus repositórios locais para ativar esteiras autônomas com Two-Pack, Four-Pack ou Six-Pack.
          </p>
        </div>
        <button onclick="openAddProjectModal()" class="bg-sand-900 hover:bg-black text-white text-xs font-semibold px-4 py-2 rounded shadow transition-colors inline-flex items-center space-x-1.5">
          <span>+ Adicionar Primeiro Projeto</span>
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = state.projects
    .map((project) => {
      const isTwoPack = project.pack === "two-pack";
      const lanes = isTwoPack
        ? ["CODER", "CLEANER", "DONE"]
        : ["SPECIFIER", "CODER", "REFACTORER", "GUARDIAN", "DONE"];

      const projectTasks = state.tasks.filter((t) => t.project === project.id);

      return `
      <div class="bg-[#F7F5F0] border border-sand-300 rounded-lg p-4 card-shadow">
        <div class="flex items-center justify-between mb-4 border-b border-sand-200 pb-2.5">
          <div class="flex items-center space-x-2">
            <h2 class="font-bold text-sm tracking-tight text-sand-900">${project.name}</h2>
            <span class="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-sand-200 text-sand-700 font-semibold">${project.pack}</span>
            <span class="text-[10px] text-sand-400 font-mono hidden sm:inline" title="${project.path}">${project.path}</span>
          </div>
          <div class="flex items-center space-x-2">
            <button onclick="openNewTaskModalFor('${project.id}')" class="text-xs bg-white hover:bg-sand-100 text-sand-800 border border-sand-300 font-medium px-2.5 py-1 rounded transition-colors">
              + Tarefa
            </button>
          </div>
        </div>

        <!-- LANES -->
        <div class="grid grid-cols-${lanes.length} gap-3">
          ${lanes
            .map((lane) => {
              const laneId = lane.toLowerCase();
              const matchingTasks = projectTasks.filter((t) => {
                if (lane === "DONE")
                  return t.lane === "done" || t.status === "completed";
                if (t.role && t.role.toLowerCase() === laneId) return true;
                if (t.toRole && t.toRole.toLowerCase() === laneId) return true;
                return false;
              });

              return `
              <div class="bg-sand-200/50 rounded-lg p-2.5 min-h-[140px] border border-dashed border-sand-300 flex flex-col">
                <div class="text-[10px] font-bold tracking-wider uppercase text-sand-500 mb-2 flex items-center justify-between">
                  <span>${lane}</span>
                  <span class="text-sand-400 font-normal">${matchingTasks.length}</span>
                </div>
                <div class="space-y-2 flex-1">
                  ${matchingTasks
                    .map(
                      (task) => `
                    <div onclick="openTaskDetails('${project.id}', '${task.taskId}')" class="bg-white p-3 rounded border border-sand-300 shadow-sm text-xs space-y-1.5 hover:border-sand-500 hover:shadow-md cursor-pointer transition-all group">
                      <div class="flex items-center justify-between">
                        <span class="font-bold text-sand-900">${task.taskId}</span>
                        <span class="text-[10px] text-sand-500 font-mono bg-sand-100 px-1.5 py-0.5 rounded border border-sand-200">${task.commit ? task.commit.substring(0, 7) : "HEAD"}</span>
                      </div>
                      <p class="text-sand-600 text-[11px] leading-tight line-clamp-2">${task.title || task.reason || task.summary || "Em processamento..."}</p>
                      <div class="flex items-center justify-between pt-1">
                        ${
                          task.lane === "attention"
                            ? `
                          <span class="inline-block bg-amber-100 text-amber-800 text-[9px] font-bold px-1.5 py-0.5 rounded">Aprovação</span>
                        `
                            : `
                          <span class="inline-block bg-emerald-100 text-emerald-800 text-[9px] font-medium px-1.5 py-0.5 rounded">Ativo</span>
                        `
                        }
                        <div class="flex items-center space-x-1 text-[10px] text-sand-500 font-medium group-hover:text-omni-accent transition-colors">
                          <span>Diff & Testes</span>
                          <span>➔</span>
                        </div>
                      </div>
                    </div>
                  `,
                    )
                    .join("")}
                </div>
              </div>
            `;
            })
            .join("")}
        </div>
      </div>
    `;
    })
    .join("");
}

// 2.1 Renderizar Visão por Feature / Épico (Cross-Repo Swimlanes)
function renderEpicKanban() {
  const container = document.getElementById("projects-container");
  if (!container) return;

  if (!state.projects || state.projects.length === 0) {
    renderProjectsKanban();
    return;
  }

  // Agrupar tarefas por feature / épico
  const epicsMap = new Map();

  if (!state.tasks || state.tasks.length === 0) {
    container.innerHTML = `
      <div class="bg-white rounded-lg border border-dashed border-sand-300 p-12 text-center space-y-4 max-w-lg mx-auto mt-8 card-shadow">
        <div class="w-12 h-12 bg-sand-100 rounded-full flex items-center justify-center mx-auto text-xl">🧩</div>
        <div class="space-y-1">
          <h3 class="font-bold text-sand-900 text-sm">Nenhum Épico ou Feature em andamento</h3>
          <p class="text-sand-500 text-xs leading-relaxed">
            As tarefas criadas nos projetos aparecerão aqui alinhadas em raias horizontais sincronizando API, App e Storefront.
          </p>
        </div>
        <button onclick="openNewTaskModal()" class="bg-sand-900 hover:bg-black text-white text-xs font-semibold px-4 py-2 rounded shadow transition-colors inline-flex items-center space-x-1.5">
          <span>+ Criar Tarefa de Feature</span>
        </button>
      </div>
    `;
    return;
  }

  // Identifica os épicos
  state.tasks.forEach((task) => {
    let epicName = task.epic;
    if (!epicName) {
      const cleanId = (task.taskId || "").replace(/^[T|EPIC]-?\d+-?/i, "");
      if (cleanId) {
        epicName = cleanId
          .split("-")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ");
      } else {
        epicName = "Tarefas Gerais / Core";
      }
    }
    if (!epicsMap.has(epicName)) {
      epicsMap.set(epicName, []);
    }
    epicsMap.get(epicName).push(task);
  });

  const targetProjects = state.projects;

  container.innerHTML = `
    <div class="space-y-6">
      <div class="flex items-center justify-between pb-2 border-b border-sand-300">
        <div>
          <h2 class="text-sm font-bold text-sand-900 flex items-center space-x-2">
            <span>🧩</span>
            <span>Raias de Sincronização Cross-Repo (Feature / Épico)</span>
          </h2>
          <p class="text-[11px] text-sand-500">Visão horizontal unificada de API, App e Storefront para cada entrega</p>
        </div>
        <div class="flex items-center space-x-2 text-[11px] text-sand-600 font-mono">
          <span>${epicsMap.size} Épico(s) ativo(s)</span>
        </div>
      </div>

      ${Array.from(epicsMap.entries())
        .map(([epicName, tasks]) => {
          return `
          <div class="bg-[#F7F5F0] border border-sand-300 rounded-lg p-4 card-shadow space-y-3">
            <div class="flex items-center justify-between border-b border-sand-200 pb-2">
              <div class="flex items-center space-x-2">
                <span class="w-3 h-3 rounded-full bg-omni-accent"></span>
                <h3 class="font-bold text-xs text-sand-900 uppercase tracking-wider">${escapeHtml(epicName)}</h3>
                <span class="text-[10px] bg-sand-200 text-sand-700 font-mono px-2 py-0.5 rounded font-bold">${tasks.length} tarefa(s)</span>
              </div>
            </div>

            <!-- COLUNAS SINCRONIZADAS POR PROJETO -->
            <div class="grid grid-cols-${Math.max(1, Math.min(targetProjects.length, 3))} gap-3">
              ${targetProjects
                .map((proj) => {
                  const projTasks = tasks.filter((t) => t.project === proj.id);
                  return `
                  <div class="bg-white/80 rounded-lg p-3 border border-sand-200 flex flex-col space-y-2">
                    <div class="flex items-center justify-between border-b border-sand-100 pb-1.5">
                      <span class="font-bold text-[11px] text-sand-800">${escapeHtml(proj.name)}</span>
                      <span class="text-[9px] font-mono text-sand-400 uppercase">${proj.pack}</span>
                    </div>

                    <div class="space-y-2 flex-1">
                      ${
                        projTasks.length === 0
                          ? `
                        <div class="py-6 text-center text-sand-400 italic text-[11px]">
                          Sem pendência neste repo
                        </div>
                      `
                          : projTasks
                              .map(
                                (t) => `
                        <div onclick="openTaskDetails('${proj.id}', '${t.taskId}')" class="bg-sand-50 p-2.5 rounded border border-sand-200 text-xs space-y-1.5 hover:border-sand-400 hover:bg-white cursor-pointer transition-all">
                          <div class="flex items-center justify-between">
                            <span class="font-bold text-sand-900">${t.taskId}</span>
                            <span class="text-[9px] font-mono px-1.5 py-0.2 rounded bg-sand-200 font-bold uppercase">${t.role || t.toRole || "active"}</span>
                          </div>
                          <p class="text-sand-600 text-[11px] line-clamp-2">${t.title || "Em execução..."}</p>
                          <div class="flex items-center justify-between pt-1 text-[10px]">
                            <span class="text-sand-500 font-mono">${t.commit ? t.commit.substring(0, 7) : "HEAD"}</span>
                            <span class="text-omni-accent font-semibold hover:underline">Raio-X ➔</span>
                          </div>
                        </div>
                      `,
                              )
                              .join("")
                      }
                    </div>
                  </div>
                `;
                })
                .join("")}
            </div>
          </div>
        `;
        })
        .join("")}
    </div>
  `;
}

// 3. Renderizar Work Queue e Telemetria
function renderWorkQueue() {
  const queueElem = document.getElementById("work-queue-list");
  const badgeElem = document.getElementById("queue-badge");
  const gateElem = document.getElementById("attention-gate-status");

  const activeTasks = state.tasks.filter(
    (t) => t.lane !== "done" && t.status !== "completed",
  );
  const attentionTasks = state.tasks.filter((t) => t.lane === "attention");

  if (badgeElem) {
    badgeElem.textContent = `${activeTasks.length} ativo${activeTasks.length === 1 ? "" : "s"}`;
  }

  if (gateElem) {
    if (attentionTasks.length > 0) {
      gateElem.innerHTML = `
        <span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
        <span class="text-amber-700 font-bold">${attentionTasks.length} Pendente${attentionTasks.length === 1 ? "" : "s"}</span>
      `;
    } else {
      gateElem.innerHTML = `
        <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
        <span class="text-emerald-700">Desobstruído</span>
      `;
    }
  }

  if (activeTasks.length === 0) {
    queueElem.innerHTML =
      '<div class="text-sand-400 italic text-xs py-4 text-center">Nenhum agente em execução no momento.</div>';
    return;
  }

  queueElem.innerHTML = activeTasks
    .map(
      (task) => `
    <div onclick="openTaskDetails('${task.project}', '${task.taskId}')" class="p-2.5 bg-white rounded border border-sand-200 card-shadow flex items-center justify-between cursor-pointer hover:border-sand-400 transition-all hover:scale-[1.01]">
      <div class="space-y-0.5">
        <div class="font-bold text-sand-900">${task.taskId}</div>
        <div class="text-[11px] text-sand-500 font-mono">${task.projectName || task.project} • <span class="font-bold text-sand-700">${task.toRole || task.role || "agente"}</span></div>
      </div>
      <div class="flex items-center space-x-1.5">
        <span class="w-2 h-2 rounded-full ${task.lane === "attention" ? "bg-amber-500" : "bg-emerald-500 animate-ping"}"></span>
      </div>
    </div>
  `,
    )
    .join("");
}

// 4. Detalhes do Card / Raio-X do Agente
function openTaskDetails(projectId, taskId) {
  const task = state.tasks.find(
    (t) => t.project === projectId && t.taskId === taskId,
  );
  if (!task) return;

  window.selectedTask = { projectId, taskId, task };

  const project = state.projects.find((p) => p.id === projectId) || {
    name: projectId,
    path: "",
    pack: "four-pack",
  };
  const currentRole = (task.toRole || task.role || "specifier").toLowerCase();

  document.getElementById("detail-task-id").textContent = task.taskId;
  document.getElementById("detail-task-title").textContent =
    task.title || task.summary || task.taskId;
  document.getElementById("detail-task-project").textContent =
    `${project.name} • Topologia: ${project.pack}`;

  const statusBadge = document.getElementById("detail-task-status-badge");
  if (task.lane === "attention") {
    statusBadge.className =
      "text-[10px] font-bold px-2 py-0.5 rounded uppercase bg-amber-100 text-amber-800";
    statusBadge.textContent = "Aguardando Aprovação (Attention)";
  } else if (task.lane === "done" || task.status === "completed") {
    statusBadge.className =
      "text-[10px] font-bold px-2 py-0.5 rounded uppercase bg-emerald-100 text-emerald-800";
    statusBadge.textContent = "Concluído";
  } else {
    statusBadge.className =
      "text-[10px] font-bold px-2 py-0.5 rounded uppercase bg-blue-100 text-blue-800";
    statusBadge.textContent = "Em Execução";
  }

  // Papel e Descrição
  document.getElementById("detail-role").textContent =
    currentRole.toUpperCase();
  const roleDescriptions = {
    specifier:
      "Escrevendo contratos (.d.ts), interfaces e testes falhando (TDD Red)",
    coder:
      "Implementando a solução mínima necessária para passar os testes (TDD Green)",
    cleaner: "Aplicando Clean Code, modularização e formatação",
    refactorer:
      "Refatorando código para manter complexidade ciclomática M < 5 e DRY",
    guardian:
      "Auditando isolamento multi-tenant, zero any, linter e build do CI",
    hardening:
      "Executando testes de mutação (Stryker) e auditoria de métricas CRAP",
    qa: "Executando testes E2E Playwright e validação de contratos de interface",
    done: "Tarefa concluída e aprovada com sucesso na esteira",
  };
  document.getElementById("detail-role-desc").textContent =
    roleDescriptions[currentRole] || "Processamento da esteira autônoma";

  // Worktree
  const worktreeName =
    currentRole === "done" ? "main" : `.worktrees/${currentRole}`;
  const worktreePath =
    currentRole === "done"
      ? project.path
      : `${project.path}/.worktrees/${currentRole}`;
  const worktreeEl = document.getElementById("detail-worktree");
  worktreeEl.textContent = worktreeName;
  worktreeEl.title = worktreePath;

  // Commit
  document.getElementById("detail-commit").textContent = task.commit
    ? task.commit
    : "uncommitted / HEAD";

  // Horário
  document.getElementById("detail-updated").textContent =
    task.updatedAt || task.createdAt || task.approvedAt || "Agora";

  // JSON
  document.getElementById("detail-json").textContent = JSON.stringify(
    task,
    null,
    2,
  );

  // Guia de Teste Prático (O que e como testar)
  const guideContainer = document.getElementById("detail-test-guide-container");
  const guideContent = document.getElementById("detail-test-guide-content");
  if (guideContainer && guideContent) {
    if (task.testingGuide) {
      guideContainer.classList.remove("hidden");
      const steps = Array.isArray(task.testingGuide.how)
        ? task.testingGuide.how
            .map((s) => `<li class="ml-4 list-disc">${s}</li>`)
            .join("")
        : `<p>${task.testingGuide.how}</p>`;
      guideContent.innerHTML = `
        <div class="space-y-2">
          <div>
            <span class="font-bold text-sand-900 block text-[11px] mb-0.5">🎯 O Que Testar:</span>
            <p class="text-sand-700 leading-snug">${task.testingGuide.what}</p>
          </div>
          <div>
            <span class="font-bold text-sand-900 block text-[11px] mb-0.5">🧪 Como Testar (Passo a Passo):</span>
            <ul class="space-y-1 text-sand-800 bg-white/80 p-2.5 rounded border border-emerald-200">
              ${steps}
            </ul>
          </div>
        </div>
      `;
    } else {
      guideContainer.classList.add("hidden");
    }
  }

  // Stepper Visual por Topologia de Pack
  const pack = (project.pack || "four-pack").toLowerCase();
  let pipeline = ["specifier", "coder", "refactorer", "guardian", "done"];
  if (pack === "two-pack") {
    pipeline = ["coder", "cleaner", "done"];
  } else if (pack === "six-pack") {
    pipeline = [
      "specifier",
      "coder",
      "cleaner",
      "architect",
      "hardening",
      "qa",
      "done",
    ];
  }

  const currentIdx = pipeline.indexOf(currentRole);
  const stepperContainer = document.getElementById("detail-pipeline-stepper");
  stepperContainer.innerHTML = pipeline
    .map((pRole, idx) => {
      const isPast = idx < currentIdx || task.lane === "done";
      const isCurrent = idx === currentIdx && task.lane !== "done";
      const bg = isPast
        ? "bg-emerald-500 text-white"
        : isCurrent
          ? "bg-[#0066FF] text-white animate-pulse"
          : "bg-sand-200 text-sand-500";
      const border = isCurrent ? "ring-2 ring-blue-300" : "";

      return `
      <div class="flex flex-col items-center space-y-1 flex-1 relative">
        ${idx > 0 ? `<div class="absolute top-3 right-[50%] left-[-50%] h-[2px] ${idx <= currentIdx ? "bg-emerald-400" : "bg-sand-200"} z-0"></div>` : ""}
        <div class="w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] ${bg} ${border} z-10 shadow-sm">
          ${isPast ? "✓" : idx + 1}
        </div>
        <span class="text-[9px] font-bold uppercase tracking-wider ${isCurrent ? "text-blue-700 font-extrabold" : isPast ? "text-emerald-700" : "text-sand-400"}">
          ${pRole}
        </span>
      </div>
    `;
    })
    .join("");

  // Attention actions
  const attentionContainer = document.getElementById(
    "detail-attention-actions",
  );
  if (task.lane === "attention") {
    attentionContainer.innerHTML = `
      <button onclick="approveAttentionTaskFromModal()" class="bg-[#1F493D] hover:bg-[#16362D] text-white px-3 py-1.5 rounded font-medium text-xs shadow-sm">
        Approve Handoff
      </button>
      <button onclick="rejectAttentionTaskFromModal()" class="bg-white hover:bg-red-50 text-red-700 border border-red-200 px-3 py-1.5 rounded font-medium text-xs shadow-sm">
        Reject & Devolver
      </button>
    `;
  } else {
    attentionContainer.innerHTML = "";
  }

  // Controle de Topologia: E2E com gravação interativa Codegen e IA aplica-se a Four-Pack e Six-Pack
  const noticeTwoPack = document.getElementById("playbook-two-pack-notice");
  const workflowContainer = document.getElementById(
    "playbook-workflow-container",
  );
  const packStageBadge = document.getElementById("playbook-pack-stage-badge");
  const tabPlaybookBadge = document.getElementById("tab-playbook-badge");

  if (pack === "two-pack") {
    if (noticeTwoPack) noticeTwoPack.classList.remove("hidden");
    if (workflowContainer) workflowContainer.classList.add("hidden");
    if (tabPlaybookBadge) {
      tabPlaybookBadge.textContent = "Spike";
      tabPlaybookBadge.className =
        "ml-1 text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded-full font-bold";
    }
  } else {
    if (noticeTwoPack) noticeTwoPack.classList.add("hidden");
    if (workflowContainer) workflowContainer.classList.remove("hidden");
    if (tabPlaybookBadge) {
      tabPlaybookBadge.textContent = "E2E";
      tabPlaybookBadge.className =
        "ml-1 text-[10px] bg-purple-100 text-purple-800 px-1.5 py-0.2 rounded-full font-bold";
    }
    if (packStageBadge) {
      packStageBadge.textContent =
        pack === "six-pack"
          ? "Six-Pack • QA Gate"
          : "Four-Pack • Guardian Gate";
    }
  }

  // Renderizar Playbook Visual e pré-carregar radar de governança e motor E2E
  renderPlaybookChecklist(task);
  refreshTaskGovernance();
  loadE2EInfo();

  // Reseta abas para Visão Geral
  switchModalTab("overview");

  // Pré-busca contagem de diff em background
  document.getElementById("tab-diff-badge").textContent = "...";
  fetch(
    `/api/diff?projectId=${encodeURIComponent(projectId)}&role=${encodeURIComponent(currentRole)}`,
  )
    .then((r) => r.json())
    .then((d) => {
      if (d.files && Array.isArray(d.files)) {
        document.getElementById("tab-diff-badge").textContent = d.files.length;
      } else {
        document.getElementById("tab-diff-badge").textContent = "0";
      }
    })
    .catch(() => {
      document.getElementById("tab-diff-badge").textContent = "0";
    });

  document.getElementById("modal-task-details").classList.remove("hidden");
}

function closeTaskDetails() {
  document.getElementById("modal-task-details").classList.add("hidden");
  window.selectedTask = null;
}

// 4.1 Navegação de Abas do Modal
function switchModalTab(tab) {
  const tabs = ["overview", "diff", "tests", "playbook"];
  tabs.forEach((t) => {
    const btn = document.getElementById(`tab-btn-${t}`);
    const pane = document.getElementById(`tab-pane-${t}`);
    if (btn && pane) {
      if (t === tab) {
        btn.className =
          "px-4 py-2.5 font-bold border-b-2 border-sand-900 text-sand-900 transition-colors flex items-center space-x-1.5";
        pane.classList.remove("hidden");
      } else {
        btn.className =
          "px-4 py-2.5 font-medium border-b-2 border-transparent text-sand-600 hover:text-sand-900 transition-colors flex items-center space-x-1.5";
        pane.classList.add("hidden");
      }
    }
  });

  if (tab === "diff") {
    refreshCurrentTaskDiff();
  } else if (tab === "playbook") {
    refreshTaskGovernance();
    loadE2EInfo();
  }
}

// 4.2 Visualizador de Git Diff em Tempo Real
async function refreshCurrentTaskDiff() {
  if (!window.selectedTask) return;
  const { projectId, task } = window.selectedTask;
  const role = (task.toRole || task.role || "specifier").toLowerCase();

  const summaryEl = document.getElementById("diff-summary-text");
  const filesContainer = document.getElementById("diff-files-container");
  const codeViewer = document.getElementById("diff-viewer-code");
  const badgeEl = document.getElementById("tab-diff-badge");

  summaryEl.textContent = "Carregando diff do git...";
  filesContainer.innerHTML = "";
  codeViewer.innerHTML =
    '<div class="text-sand-400 italic">Carregando patch do repositório...</div>';

  try {
    const res = await fetch(
      `/api/diff?projectId=${encodeURIComponent(projectId)}&role=${encodeURIComponent(role)}`,
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Erro ao carregar diff");

    summaryEl.textContent = data.summary || "Sem alterações";
    badgeEl.textContent = (data.files || []).length;

    if (!data.files || data.files.length === 0) {
      filesContainer.innerHTML =
        '<div class="p-2.5 text-sand-500 italic bg-sand-50 rounded border border-sand-200">Nenhum arquivo modificado no momento neste worktree.</div>';
    } else {
      filesContainer.innerHTML = data.files
        .map(
          (f) => `
        <div class="flex items-center justify-between p-2 bg-sand-50 rounded border border-sand-200 hover:bg-white transition-colors">
          <span class="font-mono text-sand-800 truncate select-all">${escapeHtml(f.file)}</span>
          <div class="flex items-center space-x-2 font-mono text-[10px] shrink-0">
            <span class="text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded font-bold">+${f.additions}</span>
            <span class="text-red-700 bg-red-100 px-1.5 py-0.5 rounded font-bold">-${f.deletions}</span>
          </div>
        </div>
      `,
        )
        .join("");
    }

    const lines = (data.diff || "").split("\n");
    codeViewer.innerHTML = lines
      .map((line) => {
        if (line.startsWith("+++") || line.startsWith("---")) {
          return `<div class="text-sand-400 font-bold px-1 py-0.5">${escapeHtml(line)}</div>`;
        } else if (line.startsWith("+")) {
          return `<div class="bg-emerald-950/70 text-emerald-300 px-1.5 py-0.5 border-l-2 border-emerald-500">${escapeHtml(line)}</div>`;
        } else if (line.startsWith("-")) {
          return `<div class="bg-red-950/70 text-red-300 px-1.5 py-0.5 border-l-2 border-red-500">${escapeHtml(line)}</div>`;
        } else if (line.startsWith("@@")) {
          return `<div class="text-blue-400 bg-blue-950/50 px-1.5 py-0.5 font-bold my-1 rounded">${escapeHtml(line)}</div>`;
        } else if (line.startsWith("diff --git")) {
          return `<div class="text-amber-400 font-bold pt-2 pb-0.5 border-t border-sand-800 mt-1">${escapeHtml(line)}</div>`;
        } else {
          return `<div class="text-sand-300 px-1.5 py-0.5">${escapeHtml(line) || "&nbsp;"}</div>`;
        }
      })
      .join("");
  } catch (err) {
    summaryEl.textContent = "Erro ao carregar diff";
    codeViewer.innerHTML = `<div class="text-red-400">Falha ao obter git diff: ${escapeHtml(err.message)}</div>`;
  }
}

// 4.3 Runner de Testes em 1 Clique
async function runCurrentTaskTests() {
  if (!window.selectedTask) return;
  const { projectId, task } = window.selectedTask;
  const role = (task.toRole || task.role || "specifier").toLowerCase();

  switchModalTab("tests");

  const btnAction = document.getElementById("btn-run-tests-action");
  const spinner = document.getElementById("test-run-spinner");
  const statusEl = document.getElementById("test-metric-status");
  const durationEl = document.getElementById("test-metric-duration");
  const passedEl = document.getElementById("test-metric-passed");
  const failedEl = document.getElementById("test-metric-failed");
  const outputEl = document.getElementById("test-terminal-output");
  const tabBadge = document.getElementById("tab-tests-badge");

  btnAction.disabled = true;
  btnAction.classList.add("opacity-50");
  spinner.classList.remove("hidden");
  statusEl.textContent = "Rodando...";
  statusEl.className = "text-sm font-bold text-amber-600 animate-pulse";
  outputEl.textContent =
    "Iniciando execução da suíte de testes no worktree isolado...\n";

  try {
    const res = await fetch("/api/run-tests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, role }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Erro na execução dos testes");

    const s = data.summary || {};
    if (s.success) {
      statusEl.textContent = "PASSOU ✓";
      statusEl.className = "text-sm font-bold text-emerald-600";
      tabBadge.textContent = "PASSOU";
      tabBadge.className =
        "ml-1 text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-full font-bold";
    } else {
      statusEl.textContent = "FALHOU ✕";
      statusEl.className = "text-sm font-bold text-red-600";
      tabBadge.textContent = "FALHOU";
      tabBadge.className =
        "ml-1 text-[10px] bg-red-100 text-red-800 px-1.5 py-0.2 rounded-full font-bold";
    }

    durationEl.textContent = s.duration || "-";
    passedEl.textContent = s.passed || "OK";
    failedEl.textContent = s.failed || "0";
    outputEl.textContent =
      data.output || "Suíte finalizada sem saída de texto.";
  } catch (err) {
    statusEl.textContent = "ERRO";
    statusEl.className = "text-sm font-bold text-red-600";
    outputEl.textContent = `Erro ao invocar runner de testes: ${err.message}`;
  } finally {
    btnAction.disabled = false;
    btnAction.classList.remove("opacity-50");
    spinner.classList.add("hidden");
  }
}

// 4.3.1 Radar de Governança Semáforo
async function refreshTaskGovernance() {
  if (!window.selectedTask) return;
  const { projectId, task } = window.selectedTask;
  const role = (task.toRole || task.role || "specifier").toLowerCase();

  const tenantBadge = document.getElementById("gov-badge-tenant");
  const complexityBadge = document.getElementById("gov-badge-complexity");
  const typingBadge = document.getElementById("gov-badge-typing");
  const detailsBox = document.getElementById("governance-details-box");

  if (!tenantBadge || !complexityBadge || !typingBadge) return;

  tenantBadge.textContent = "...";
  complexityBadge.textContent = "...";
  typingBadge.textContent = "...";
  if (detailsBox) detailsBox.classList.add("hidden");

  try {
    const res = await fetch(
      `/api/governance?projectId=${encodeURIComponent(projectId)}&role=${encodeURIComponent(role)}`,
    );
    const data = await res.json();
    if (!res.ok)
      throw new Error(data.error || "Erro na auditoria de governança");

    // Tenant Isolation
    if (data.tenantIsolation.passed) {
      tenantBadge.textContent = "OK ✓";
      tenantBadge.className =
        "text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800";
    } else {
      tenantBadge.textContent = "ALERTA ✕";
      tenantBadge.className =
        "text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-800";
    }

    // Complexity
    if (data.complexity.passed) {
      complexityBadge.textContent = "OK (M < 5) ✓";
      complexityBadge.className =
        "text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800";
    } else {
      complexityBadge.textContent = "ALERTA (>150L)";
      complexityBadge.className =
        "text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800";
    }

    // Strict Typing
    const typeSafety = data.typeSafety ||
      data.strictTyping || { passed: true, totalAny: 0, violations: [] };
    const anyCount =
      typeSafety.totalAny !== undefined
        ? typeSafety.totalAny
        : typeSafety.anyCount || 0;

    if (typeSafety.passed) {
      typingBadge.textContent = "Zero Any ✓";
      typingBadge.className =
        "text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800";
    } else {
      typingBadge.textContent = `${anyCount} Any(s) ✕`;
      typingBadge.className =
        "text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-800";
    }

    // Details box if there are violations
    const violations = [];
    if (!data.tenantIsolation.passed && data.tenantIsolation.violations) {
      violations.push(
        ...data.tenantIsolation.violations.map((v) =>
          typeof v === "string"
            ? `[Tenant] ${v}`
            : `[Tenant] ${v.file || JSON.stringify(v)}`,
        ),
      );
    }
    if (!data.complexity.passed && data.complexity.warnings) {
      violations.push(
        ...data.complexity.warnings.map((w) =>
          typeof w === "string"
            ? `[Complexidade] ${w}`
            : `[Complexidade] ${w.file}: ${w.reason}`,
        ),
      );
    }
    if (!typeSafety.passed && typeSafety.violations) {
      violations.push(
        ...typeSafety.violations.map((v) =>
          typeof v === "string"
            ? `[TypeSafety] ${v}`
            : `[TypeSafety] ${v.file} (${v.count} 'any's)`,
        ),
      );
    }

    if (detailsBox && violations.length > 0) {
      detailsBox.classList.remove("hidden");
      detailsBox.innerHTML =
        `<strong>Detalhes de Governança Identificados:</strong><br/>` +
        violations.map((v) => `• ${escapeHtml(v)}`).join("<br/>");
    }
  } catch (err) {
    console.error("Erro na governança:", err);
  }
}

// 4.3.2 Playbook de Teste Visual Humano (Passo a Passo Interativo)
function renderPlaybookChecklist(task) {
  const container = document.getElementById("playbook-checklist-container");
  if (!container) return;

  const handoff = task.handoff || {};
  const guide = handoff.testGuide || handoff.checklist || [];

  let steps = [];
  if (Array.isArray(guide) && guide.length > 0) {
    steps = guide;
  } else if (typeof guide === "string" && guide.trim().length > 0) {
    steps = guide.split("\n").filter((s) => s.trim().length > 0);
  } else {
    // Passos inteligentes baseados na tarefa e ecossistema
    steps = [
      `1. Acessar tela de preview correspondente (App em http://localhost:5183 ou Storefront em http://localhost:4010).`,
      `2. Navegar até o módulo ou componente de "${task.title || task.taskId}".`,
      `3. Interagir com os formulários / listas e validar estados de erro e feedback visual.`,
      `4. Garantir que exclusões e ações destrutivas usem modais dedicados (sem window.confirm ou window.alert).`,
      `5. Verificar se os estilos respeitam os tokens do Design System corporativo.`,
    ];
  }

  container.innerHTML = steps
    .map(
      (step, idx) => `
    <label class="flex items-start space-x-2.5 p-2.5 bg-white rounded border border-sand-200 hover:border-sand-300 transition-colors cursor-pointer select-none">
      <input type="checkbox" id="check-step-${idx}" class="mt-0.5 rounded border-sand-300 text-omni-accent focus:ring-omni-accent" />
      <span class="text-sand-800 leading-snug font-medium text-[11px]">${escapeHtml(step.replace(/^[0-9]+[.)]\s*/, ""))}</span>
    </label>
  `,
    )
    .join("");
}

// 4.3.3 Carregamento do Motor E2E Agnóstico (Cypress, Playwright, WebdriverIO, npm scripts)
let currentE2EInfo = null;

async function loadE2EInfo() {
  if (!window.selectedTask) return;
  const { projectId, task } = window.selectedTask;
  const role = (task.toRole || task.role || "specifier").toLowerCase();

  const badge = document.getElementById("e2e-detected-badge");
  const desc = document.getElementById("e2e-detected-desc");
  const btnText = document.getElementById("btn-run-e2e-text");
  const header = document.getElementById("e2e-terminal-header");

  if (badge) badge.textContent = "Detectando...";

  try {
    const res = await fetch(
      `/api/e2e-info?projectId=${encodeURIComponent(projectId)}&role=${encodeURIComponent(role)}`,
    );
    const data = await res.json();
    currentE2EInfo = data;

    if (badge) badge.textContent = data.name || "E2E";
    if (desc)
      desc.innerHTML = `Motor detectado: <strong>${data.name}</strong> • Comando: <code class="bg-sand-200 px-1 py-0.5 rounded text-[10px]">${escapeHtml(data.command)}</code>`;
    if (btnText) btnText.textContent = `Rodar ${data.name}`;
    if (header)
      header.textContent = `LOGS DE TESTE E2E (${(data.name || "E2E").toUpperCase()})`;
  } catch (err) {
    if (badge) badge.textContent = "Runner E2E";
  }
}

// 4.3.4 Runner E2E em 1 Clique (Agnóstico a Motores)
async function runCurrentTaskE2E() {
  if (!window.selectedTask) return;
  const { projectId, task } = window.selectedTask;
  const role = (task.toRole || task.role || "specifier").toLowerCase();

  const btnAction = document.getElementById("btn-run-e2e-action");
  const spinner = document.getElementById("e2e-run-spinner");
  const outputEl = document.getElementById("e2e-terminal-output");

  const engineName = currentE2EInfo?.name || "E2E";
  const command =
    currentE2EInfo?.command || "npx playwright test / npx cypress run";

  if (btnAction) {
    btnAction.disabled = true;
    btnAction.classList.add("opacity-50");
  }
  if (spinner) {
    spinner.textContent = `Executando ${engineName}...`;
    spinner.classList.remove("hidden");
  }
  if (outputEl) {
    outputEl.textContent = `Iniciando execução da suíte de testes E2E (${engineName}) no worktree '${role}'...\n$ ${command}\n\nAguarde...\n`;
  }

  try {
    const res = await fetch("/api/run-e2e", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, role }),
    });
    const data = await res.json();
    if (outputEl) {
      const banner = data.success
        ? `\n=========================================\n✓ TESTES E2E FINALIZADOS COM SUCESSO (${data.duration})\n=========================================\n`
        : `\n=========================================\n✕ TESTES E2E FINALIZADOS COM FALHAS (${data.duration})\n=========================================\n`;
      outputEl.textContent =
        (data.output || "Testes finalizados sem saída de log.") + banner;
    }
  } catch (err) {
    if (outputEl)
      outputEl.textContent = `Erro ao invocar runner E2E (${engineName}): ${err.message}`;
  } finally {
    if (btnAction) {
      btnAction.disabled = false;
      btnAction.classList.remove("opacity-50");
    }
    if (spinner) spinner.classList.add("hidden");
  }
}

// 4.3.5 Gravação Interativa de Ações Humanas (Codegen)
async function startInteractiveRecording() {
  if (!window.selectedTask) return;
  const { projectId, taskId, task } = window.selectedTask;
  const role = (task.toRole || task.role || "specifier").toLowerCase();
  const btn = document.getElementById("btn-record-e2e");

  if (btn) {
    btn.innerHTML =
      '<span class="w-2 h-2 rounded-full bg-white animate-ping"></span><span>Navegador Aberto...</span>';
    btn.disabled = true;
  }

  const aiContainer = document.getElementById("ai-refine-container");
  const aiBadge = document.getElementById("ai-refine-status-badge");
  const aiDesc = document.getElementById("ai-refine-explanation");

  if (aiContainer) aiContainer.classList.remove("hidden");
  if (aiBadge) {
    aiBadge.textContent = "GRAVANDO NO NAVEGADOR";
    aiBadge.className =
      "text-[10px] font-mono px-2 py-0.5 rounded font-bold bg-rose-100 text-rose-800 uppercase animate-pulse";
  }
  if (aiDesc) {
    aiDesc.innerHTML =
      "🎥 <strong>Gravação Ativa:</strong> O navegador Codegen foi aberto na sua tela. Interaja com a aplicação normalmente. Quando terminar o fluxo de teste, <strong>basta fechar a janela do navegador</strong> que a IA iniciará a sanitização e divisão atômica imediatamente.";
  }

  try {
    const res = await fetch("/api/e2e-record", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, taskId, role }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Erro ao abrir navegador");
  } catch (err) {
    alert("Erro ao iniciar gravação: " + err.message);
    if (btn) {
      btn.innerHTML =
        '<span class="w-2 h-2 rounded-full bg-white animate-pulse"></span><span>🎥 Gravar Minhas Ações (Codegen)</span>';
      btn.disabled = false;
    }
  }
}

// Callback executado quando o usuário fecha a janela do navegador Codegen
function onRecordingFinished(data) {
  const btn = document.getElementById("btn-record-e2e");
  if (btn) {
    btn.innerHTML =
      '<span class="w-2 h-2 rounded-full bg-white animate-pulse"></span><span>🎥 Gravar Minhas Ações (Codegen)</span>';
    btn.disabled = false;
  }

  // Aciona automaticamente a sanitização com IA
  requestAIRefinement(data.rawContent);
}

// 4.3.6 Sanitização & Decomposição Atômica com IA
let currentRefinedTestCode = "";

async function requestAIRefinement(rawCode) {
  if (!window.selectedTask) return;
  const { projectId, taskId, task } = window.selectedTask;
  const role = (task.toRole || task.role || "specifier").toLowerCase();

  const aiContainer = document.getElementById("ai-refine-container");
  const aiBadge = document.getElementById("ai-refine-status-badge");
  const metricClicks = document.getElementById("ai-metric-removed-clicks");
  const metricTests = document.getElementById("ai-metric-split-tests");
  const metricAssertions = document.getElementById("ai-metric-assertions");
  const aiExplanation = document.getElementById("ai-refine-explanation");
  const codeViewer = document.getElementById("ai-refined-code-viewer");

  if (aiContainer) aiContainer.classList.remove("hidden");
  if (aiBadge) {
    aiBadge.textContent = "IA ANALISANDO & SANITIZANDO";
    aiBadge.className =
      "text-[10px] font-mono px-2 py-0.5 rounded font-bold bg-amber-100 text-amber-900 uppercase animate-pulse";
  }

  try {
    const res = await fetch("/api/e2e-refine", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, taskId, role, rawCode }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Erro ao refinar código com IA");

    currentRefinedTestCode = data.refinedCode;

    if (aiBadge) {
      aiBadge.textContent = "OTIMIZADO COM SUCESSO";
      aiBadge.className =
        "text-[10px] font-mono px-2 py-0.5 rounded font-bold bg-emerald-100 text-emerald-900 uppercase";
    }

    if (metricClicks)
      metricClicks.textContent = `${data.removedClicksCount} removido(s)`;
    if (metricTests)
      metricTests.textContent = `${data.splitTestsCount} atômico(s)`;
    if (metricAssertions)
      metricAssertions.textContent = `${data.convertedAssertionsCount || 0} injetada(s)`;
    if (aiExplanation) aiExplanation.textContent = data.explanation;
    if (codeViewer) codeViewer.textContent = data.refinedCode;
  } catch (err) {
    if (aiBadge) {
      aiBadge.textContent = "ERRO NA ANÁLISE";
      aiBadge.className =
        "text-[10px] font-mono px-2 py-0.5 rounded font-bold bg-red-100 text-red-900 uppercase";
    }
    if (aiExplanation) aiExplanation.textContent = err.message;
  }
}

// 4.3.7 Salvar Teste Refinado no Projeto
async function saveRefinedTest() {
  if (!window.selectedTask || !currentRefinedTestCode) {
    alert("Nenhum código refinado disponível para salvar.");
    return;
  }
  const { projectId, taskId, task } = window.selectedTask;
  const role = (task.toRole || task.role || "specifier").toLowerCase();
  const btn = document.getElementById("btn-save-refined-test");

  if (btn) {
    btn.textContent = "Salvando...";
    btn.disabled = true;
  }

  try {
    const res = await fetch("/api/e2e-save-refined", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId,
        taskId,
        role,
        refinedCode: currentRefinedTestCode,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Erro ao salvar teste");

    alert(
      `Teste refinado com IA salvo com sucesso!\n\nArquivo:\n${data.filePath}\n\nVocê já pode executar a suíte clicando em 'Rodar Testes E2E'.`,
    );
    loadE2EInfo();
  } catch (err) {
    alert("Erro ao salvar teste refinado: " + err.message);
  } finally {
    if (btn) {
      btn.innerHTML = "<span>✓</span><span>Salvar Teste Refinado</span>";
      btn.disabled = false;
    }
  }
}

// 4.4 Abrir no Editor (Cursor / VSCode)
async function openCurrentTaskInEditor() {
  if (!window.selectedTask) return;
  const { projectId, task } = window.selectedTask;
  const role = (task.toRole || task.role || "specifier").toLowerCase();

  try {
    const res = await fetch("/api/open-editor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, role }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Falha ao abrir editor");

    // Feedback visual temporário
    alert(`Pasta aberta com sucesso no editor:\n${data.openedPath}`);
  } catch (err) {
    alert("Erro ao abrir no editor: " + err.message);
  }
}

// 4.5 Fazer Merge da Tarefa
async function mergeCurrentTask() {
  if (!window.selectedTask) return;
  const { projectId, taskId, task } = window.selectedTask;
  const role = (task.toRole || task.role || "specifier").toLowerCase();

  if (
    !confirm(
      `Deseja integrar (merge) as alterações da tarefa '${taskId}' na branch principal do projeto?`,
    )
  ) {
    return;
  }

  try {
    const res = await fetch("/api/merge-task", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, taskId, role }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Falha ao realizar merge");
    alert(`Merge concluído com sucesso!\n\n${data.message}`);
    refreshData();
    closeTaskDetails();
  } catch (err) {
    alert("Erro no merge: " + err.message);
  }
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function advanceTaskManually() {
  if (!window.selectedTask) return;
  const { projectId, taskId } = window.selectedTask;

  try {
    const res = await fetch("/api/advance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, taskId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Falha ao avançar tarefa");

    closeTaskDetails();
    refreshData();
  } catch (err) {
    alert("Erro: " + err.message);
  }
}

async function approveAttentionTaskFromModal() {
  if (!window.selectedTask) return;
  const { projectId, taskId } = window.selectedTask;
  try {
    await fetch("/api/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, taskId }),
    });
    closeTaskDetails();
    refreshData();
  } catch (err) {
    alert("Erro ao aprovar: " + err.message);
  }
}

async function rejectAttentionTaskFromModal() {
  if (!window.selectedTask) return;
  const reason = prompt("Motivo da rejeição / instrução para correção:");
  if (!reason) return;

  const { projectId, taskId } = window.selectedTask;
  try {
    await fetch("/api/reject", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, taskId, reason }),
    });
    closeTaskDetails();
    refreshData();
  } catch (err) {
    alert("Erro ao rejeitar: " + err.message);
  }
}

// 5. Gestão de Projetos (Adicionar / Remover)
function openAddProjectModal() {
  document.getElementById("modal-add-project").classList.remove("hidden");
}

function closeAddProjectModal() {
  document.getElementById("modal-add-project").classList.add("hidden");
}

async function submitAddProject(event) {
  event.preventDefault();
  const name = document.getElementById("new-project-name").value.trim();
  const targetPath = document.getElementById("new-project-path").value.trim();
  const pack = document.getElementById("new-project-pack").value;
  const initHarness = document.getElementById("new-project-init").checked;

  try {
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, targetPath, pack, initHarness }),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || "Falha ao adicionar projeto");

    closeAddProjectModal();
    document.getElementById("new-project-name").value = "";
    document.getElementById("new-project-path").value = "";
    refreshData();
  } catch (err) {
    alert("Erro: " + err.message);
  }
}

function openManageProjectsModal() {
  const modal = document.getElementById("modal-manage-projects");
  const list = document.getElementById("manage-projects-list");

  if (!state.projects || state.projects.length === 0) {
    list.innerHTML =
      '<div class="text-sand-400 italic">Nenhum projeto cadastrado.</div>';
  } else {
    list.innerHTML = state.projects
      .map(
        (p) => `
      <div class="p-2.5 bg-sand-50 rounded border border-sand-200 flex items-center justify-between">
        <div>
          <div class="font-bold text-sand-900">${p.name} <span class="font-normal font-mono text-[10px] text-sand-500">(${p.pack})</span></div>
          <div class="text-[10px] text-sand-400 font-mono truncate max-w-xs">${p.path}</div>
        </div>
        <button onclick="removeProject('${p.id}')" class="text-red-600 hover:text-red-800 text-xs px-2 py-1 border border-red-200 hover:bg-red-50 rounded">
          Remover
        </button>
      </div>
    `,
      )
      .join("");
  }

  modal.classList.remove("hidden");
}

function closeManageProjectsModal() {
  document.getElementById("modal-manage-projects").classList.add("hidden");
}

async function removeProject(projectId) {
  if (!confirm(`Deseja desvincular o projeto do painel?`)) return;

  try {
    await fetch("/api/projects", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId }),
    });
    openManageProjectsModal();
    refreshData();
  } catch (err) {
    alert("Erro ao remover projeto: " + err.message);
  }
}

function updateProjectSelects() {
  const select = document.getElementById("task-project");
  if (!select) return;

  if (!state.projects || state.projects.length === 0) {
    select.innerHTML = '<option value="">Nenhum projeto disponível</option>';
    return;
  }

  select.innerHTML = state.projects
    .map(
      (p) => `
    <option value="${p.id}">${p.name} (${p.pack})</option>
  `,
    )
    .join("");
}

// 6. Modal de Nova Tarefa
function openNewTaskModal() {
  if (!state.projects || state.projects.length === 0) {
    alert("Cadastre pelo menos um projeto antes de despachar tarefas!");
    openAddProjectModal();
    return;
  }
  updateProjectSelects();
  document.getElementById("modal-new-task").classList.remove("hidden");
}

function openNewTaskModalFor(projectId) {
  openNewTaskModal();
  document.getElementById("task-project").value = projectId;
}

function closeNewTaskModal() {
  document.getElementById("modal-new-task").classList.add("hidden");
}

async function submitNewTask(event) {
  event.preventDefault();
  const projectId = document.getElementById("task-project").value;
  const taskId = document.getElementById("task-id").value.trim();
  const title = document.getElementById("task-title").value.trim();
  const role = document.getElementById("task-role").value;

  try {
    await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, taskId, title, role }),
    });
    closeNewTaskModal();
    refreshData();
  } catch (err) {
    alert("Erro ao criar tarefa: " + err.message);
  }
}

// Inicialização
setupSSE();
refreshData();
setInterval(checkPreviewStatus, 4000);
