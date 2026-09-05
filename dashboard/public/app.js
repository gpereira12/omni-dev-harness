// Omni-Forge Mission Control Client Script

let state = {
  projects: [],
  tasks: [],
  attention: []
};

// Conectar ao SSE Stream para atualização em tempo real
function setupSSE() {
  const eventSource = new EventSource('/api/stream');
  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      console.log('⚡ SSE Event:', data);
      refreshData();
    } catch (e) {}
  };
  eventSource.onerror = () => {
    console.warn('SSE desconectado, tentando reconectar em 3s...');
    setTimeout(setupSSE, 3000);
  };
}

async function refreshData() {
  try {
    const res = await fetch('/api/status');
    state = await res.json();
    renderAttentionBanner();
    renderProjectsKanban();
    renderWorkQueue();
    updateProjectSelects();
  } catch (err) {
    console.error('Erro ao atualizar status:', err);
  }
}

// 1. Renderizar Barra de ATTENTION (Portão de Aprovação)
function renderAttentionBanner() {
  const banner = document.getElementById('attention-container');
  const textElem = document.getElementById('attention-text');

  if (!state.attention || state.attention.length === 0) {
    banner.classList.add('hidden');
    return;
  }

  const active = state.attention[0];
  banner.classList.remove('hidden');
  textElem.innerHTML = `<strong>[Aprovação Pendente]</strong> Projeto <code>${active.projectName || active.project}</code> • Tarefa <code>${active.taskId}</code> (${active.role}) — <em>${active.reason || 'Aguardando validação humana para avançar na esteira'}</em>`;
  
  window.currentAttentionTask = active;
}

async function approveAttentionTask() {
  if (!window.currentAttentionTask) return;
  const { project, taskId } = window.currentAttentionTask;
  try {
    await fetch('/api/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: project, taskId })
    });
    refreshData();
  } catch (err) {
    alert('Erro ao aprovar tarefa: ' + err.message);
  }
}

async function rejectAttentionTask() {
  if (!window.currentAttentionTask) return;
  const reason = prompt('Motivo da rejeição / instrução para correção:');
  if (!reason) return;

  const { project, taskId } = window.currentAttentionTask;
  try {
    await fetch('/api/reject', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: project, taskId, reason })
    });
    refreshData();
  } catch (err) {
    alert('Erro ao rejeitar tarefa: ' + err.message);
  }
}

function viewAttentionDoc() {
  if (!window.currentAttentionTask) return;
  alert(`Detalhes da Tarefa ${window.currentAttentionTask.taskId}:\n\n` + JSON.stringify(window.currentAttentionTask, null, 2));
}

// 2. Renderizar os Kanbans dos Projetos
function renderProjectsKanban() {
  const container = document.getElementById('projects-container');
  
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

  container.innerHTML = state.projects.map(project => {
    const isTwoPack = project.pack === 'two-pack';
    const lanes = isTwoPack 
      ? ['CODER', 'CLEANER', 'DONE'] 
      : ['SPECIFIER', 'CODER', 'REFACTORER', 'GUARDIAN', 'DONE'];

    const projectTasks = state.tasks.filter(t => t.project === project.id);

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
          ${lanes.map(lane => {
            const laneId = lane.toLowerCase();
            const matchingTasks = projectTasks.filter(t => {
              if (lane === 'DONE') return t.lane === 'done' || t.status === 'completed';
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
                  ${matchingTasks.map(task => `
                    <div class="bg-white p-3 rounded border border-sand-300 shadow-sm text-xs space-y-1.5 hover:border-sand-400 transition-all">
                      <div class="flex items-center justify-between">
                        <span class="font-bold text-sand-900">${task.taskId}</span>
                        <span class="text-[10px] text-sand-400 font-mono">${task.commit ? task.commit.substring(0, 7) : ''}</span>
                      </div>
                      <p class="text-sand-600 text-[11px] leading-tight">${task.title || task.reason || task.summary || 'Em processamento...'}</p>
                      ${task.lane === 'attention' ? `
                        <span class="inline-block bg-amber-100 text-amber-800 text-[9px] font-bold px-1.5 py-0.5 rounded">Aguardando Aprovação</span>
                      ` : `
                        <span class="inline-block bg-emerald-100 text-emerald-800 text-[9px] font-medium px-1.5 py-0.5 rounded">Ativo</span>
                      `}
                    </div>
                  `).join('')}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }).join('');
}

// 3. Renderizar Work Queue
function renderWorkQueue() {
  const queueElem = document.getElementById('work-queue-list');
  const activeTasks = state.tasks.filter(t => t.lane !== 'done' && t.status !== 'completed');

  if (activeTasks.length === 0) {
    queueElem.innerHTML = '<div class="text-sand-400 italic">Nenhum agente em execução no momento.</div>';
    return;
  }

  queueElem.innerHTML = activeTasks.map(task => `
    <div class="p-2.5 bg-white rounded border border-sand-200 card-shadow flex items-center justify-between">
      <div>
        <div class="font-bold text-sand-900">${task.taskId}</div>
        <div class="text-[11px] text-sand-500">${task.projectName || task.project} • ${task.toRole || task.role || 'agente'}</div>
      </div>
      <div class="flex items-center space-x-1.5">
        <span class="w-2 h-2 rounded-full ${task.lane === 'attention' ? 'bg-amber-500' : 'bg-emerald-500 animate-ping'}"></span>
      </div>
    </div>
  `).join('');
}

// 4. Gestão de Projetos (Adicionar / Remover)
function openAddProjectModal() {
  document.getElementById('modal-add-project').classList.remove('hidden');
}

function closeAddProjectModal() {
  document.getElementById('modal-add-project').classList.add('hidden');
}

async function submitAddProject(event) {
  event.preventDefault();
  const name = document.getElementById('new-project-name').value.trim();
  const targetPath = document.getElementById('new-project-path').value.trim();
  const pack = document.getElementById('new-project-pack').value;
  const initHarness = document.getElementById('new-project-init').checked;

  try {
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, targetPath, pack, initHarness })
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Falha ao adicionar projeto');
    
    closeAddProjectModal();
    document.getElementById('new-project-name').value = '';
    document.getElementById('new-project-path').value = '';
    refreshData();
  } catch (err) {
    alert('Erro: ' + err.message);
  }
}

function openManageProjectsModal() {
  const modal = document.getElementById('modal-manage-projects');
  const list = document.getElementById('manage-projects-list');

  if (!state.projects || state.projects.length === 0) {
    list.innerHTML = '<div class="text-sand-400 italic">Nenhum projeto cadastrado.</div>';
  } else {
    list.innerHTML = state.projects.map(p => `
      <div class="p-2.5 bg-sand-50 rounded border border-sand-200 flex items-center justify-between">
        <div>
          <div class="font-bold text-sand-900">${p.name} <span class="font-normal font-mono text-[10px] text-sand-500">(${p.pack})</span></div>
          <div class="text-[10px] text-sand-400 font-mono truncate max-w-xs">${p.path}</div>
        </div>
        <button onclick="removeProject('${p.id}')" class="text-red-600 hover:text-red-800 text-xs px-2 py-1 border border-red-200 hover:bg-red-50 rounded">
          Remover
        </button>
      </div>
    `).join('');
  }

  modal.classList.remove('hidden');
}

function closeManageProjectsModal() {
  document.getElementById('modal-manage-projects').classList.add('hidden');
}

async function removeProject(projectId) {
  if (!confirm(`Deseja desvincular o projeto do painel?`)) return;

  try {
    await fetch('/api/projects', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId })
    });
    openManageProjectsModal();
    refreshData();
  } catch (err) {
    alert('Erro ao remover projeto: ' + err.message);
  }
}

function updateProjectSelects() {
  const select = document.getElementById('task-project');
  if (!select) return;

  if (!state.projects || state.projects.length === 0) {
    select.innerHTML = '<option value="">Nenhum projeto disponível</option>';
    return;
  }

  select.innerHTML = state.projects.map(p => `
    <option value="${p.id}">${p.name} (${p.pack})</option>
  `).join('');
}

// 5. Modal de Nova Tarefa
function openNewTaskModal() {
  if (!state.projects || state.projects.length === 0) {
    alert('Cadastre pelo menos um projeto antes de despachar tarefas!');
    openAddProjectModal();
    return;
  }
  updateProjectSelects();
  document.getElementById('modal-new-task').classList.remove('hidden');
}

function openNewTaskModalFor(projectId) {
  openNewTaskModal();
  document.getElementById('task-project').value = projectId;
}

function closeNewTaskModal() {
  document.getElementById('modal-new-task').classList.add('hidden');
}

async function submitNewTask(event) {
  event.preventDefault();
  const projectId = document.getElementById('task-project').value;
  const taskId = document.getElementById('task-id').value.trim();
  const title = document.getElementById('task-title').value.trim();
  const role = document.getElementById('task-role').value;

  try {
    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, taskId, title, role })
    });
    closeNewTaskModal();
    refreshData();
  } catch (err) {
    alert('Erro ao criar tarefa: ' + err.message);
  }
}

// 6. Lieutenant Chat
function sendLieutenantMessage(event) {
  event.preventDefault();
  const input = document.getElementById('lieutenant-input');
  const msg = input.value.trim();
  if (!msg) return;

  const chat = document.getElementById('lieutenant-messages');
  
  // Mensagem do usuário
  chat.innerHTML += `
    <div class="bg-sand-200/70 p-2.5 rounded border border-sand-300 leading-relaxed text-right">
      <span class="font-bold text-sand-900 block mb-0.5">Operador:</span>
      ${msg}
    </div>
  `;

  input.value = '';
  chat.scrollTop = chat.scrollHeight;

  // Resposta do Lieutenant
  setTimeout(() => {
    chat.innerHTML += `
      <div class="bg-white p-2.5 rounded border border-sand-200 shadow-sm leading-relaxed">
        <span class="font-bold text-sand-900 block mb-0.5">Lieutenant:</span>
        Ordem recebida. Monitorando os projetos cadastrados no Forge.
      </div>
    `;
    chat.scrollTop = chat.scrollHeight;
  }, 500);
}

// Inicialização
setupSSE();
refreshData();
