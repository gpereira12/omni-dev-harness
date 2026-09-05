#!/usr/bin/env node

const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PORT = process.env.PORT || 4200;
const HARNESS_DIR = path.resolve(__dirname, '..');
const PROJECTS_CONFIG = path.join(HARNESS_DIR, '.omni-projects.json');

// Lê a lista de projetos do usuário
function getProjects() {
  if (!fs.existsSync(PROJECTS_CONFIG)) {
    return [];
  }
  try {
    return JSON.parse(fs.readFileSync(PROJECTS_CONFIG, 'utf8'));
  } catch (e) {
    return [];
  }
}

// Salva a lista de projetos
function saveProjects(projects) {
  fs.writeFileSync(PROJECTS_CONFIG, JSON.stringify(projects, null, 2));
  watchHarnessDirs();
  broadcastEvent({ type: 'PROJECTS_UPDATED', projects });
}

// Obtém tarefas ativas de um projeto
function getProjectTasks(project) {
  if (!fs.existsSync(project.path)) {
    return [];
  }

  const handoffsDir = path.join(project.path, '.harness', 'handoffs');
  const queueDir = path.join(handoffsDir, 'queue');
  const attentionDir = path.join(handoffsDir, 'attention');
  const archiveDir = path.join(handoffsDir, 'archive');

  const tasks = [];

  const readDirSafe = (dir, status) => {
    if (!fs.existsSync(dir)) return;
    try {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        try {
          const content = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
          tasks.push({ ...content, lane: status, project: project.id, projectName: project.name });
        } catch (err) {}
      }
    } catch (e) {}
  };

  readDirSafe(attentionDir, 'attention');
  readDirSafe(queueDir, 'queued');
  readDirSafe(archiveDir, 'done');

  return tasks;
}

// SSE Clients
const sseClients = new Set();

function broadcastEvent(data) {
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    client.write(payload);
  }
}

// File watchers dinâmicos por projeto
const watchedDirs = new Set();
function watchHarnessDirs() {
  const projects = getProjects();
  for (const p of projects) {
    if (!p.path || !fs.existsSync(p.path)) continue;
    const handoffsDir = path.join(p.path, '.harness', 'handoffs');
    if (fs.existsSync(handoffsDir) && !watchedDirs.has(handoffsDir)) {
      watchedDirs.add(handoffsDir);
      try {
        fs.watch(handoffsDir, { recursive: true }, () => {
          broadcastEvent({ type: 'HANDOFF_UPDATE', timestamp: Date.now() });
        });
      } catch (e) {}
    }
  }
}
watchHarnessDirs();

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // SSE Stream
  if (url.pathname === '/api/stream') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });
    res.write(': connected\n\n');
    sseClients.add(res);
    req.on('close', () => sseClients.delete(res));
    return;
  }

  // GET /api/status (Retorna estado completo: projetos, tarefas e itens em atenção)
  if (url.pathname === '/api/status' && req.method === 'GET') {
    const projects = getProjects();
    const allTasks = [];
    const attentionItems = [];

    for (const p of projects) {
      const pTasks = getProjectTasks(p);
      allTasks.push(...pTasks);
      for (const t of pTasks) {
        if (t.lane === 'attention') {
          attentionItems.push(t);
        }
      }
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'live',
      projects: projects.map(p => ({
        ...p,
        exists: fs.existsSync(p.path),
        hasHarness: fs.existsSync(path.join(p.path, '.harness'))
      })),
      tasks: allTasks,
      attention: attentionItems
    }));
    return;
  }

  // GET /api/projects
  if (url.pathname === '/api/projects' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(getProjects()));
    return;
  }

  // POST /api/projects (Cadastrar novo projeto)
  if (url.pathname === '/api/projects' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { name, targetPath, pack, initHarness } = JSON.parse(body);

        if (!name || !targetPath) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Nome e caminho absoluto são obrigatórios.' }));
          return;
        }

        const resolvedPath = path.resolve(targetPath);
        if (!fs.existsSync(resolvedPath)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: `O caminho informado não existe: ${resolvedPath}` }));
          return;
        }

        // Se solicitado ou se .harness não existir, pode inicializar
        const harnessPath = path.join(resolvedPath, '.harness');
        if (!fs.existsSync(harnessPath) && initHarness) {
          const initScript = path.join(HARNESS_DIR, 'scripts', 'init-harness.sh');
          try {
            execSync(`bash "${initScript}" "${resolvedPath}"`, { stdio: 'ignore' });
          } catch (initErr) {
            console.warn('Aviso: Falha ao rodar init-harness.sh automaticamente:', initErr.message);
          }
        }

        // Garante criação da estrutura de handoffs
        fs.mkdirSync(path.join(resolvedPath, '.harness', 'handoffs', 'queue'), { recursive: true });
        fs.mkdirSync(path.join(resolvedPath, '.harness', 'handoffs', 'attention'), { recursive: true });
        fs.mkdirSync(path.join(resolvedPath, '.harness', 'handoffs', 'archive'), { recursive: true });

        const projects = getProjects();
        const id = name.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
        
        // Remove duplicata se já existir
        const filtered = projects.filter(p => p.id !== id && p.path !== resolvedPath);
        const newProject = {
          id,
          name,
          path: resolvedPath,
          pack: pack || 'four-pack',
          addedAt: new Date().toISOString()
        };
        filtered.push(newProject);
        saveProjects(filtered);

        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, project: newProject }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // DELETE /api/projects (Remover projeto da lista)
  if (url.pathname === '/api/projects' && req.method === 'DELETE') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { projectId } = JSON.parse(body);
        const projects = getProjects();
        const filtered = projects.filter(p => p.id !== projectId);
        saveProjects(filtered);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // POST /api/tasks (Criar nova tarefa no projeto selecionado)
  if (url.pathname === '/api/tasks' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { projectId, taskId, title, role } = JSON.parse(body);
        const projects = getProjects();
        const project = projects.find(p => p.id === projectId);
        if (!project) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Projeto não encontrado' }));
          return;
        }

        const queueDir = path.join(project.path, '.harness', 'handoffs', 'queue');
        fs.mkdirSync(queueDir, { recursive: true });

        const taskData = {
          taskId,
          title: title || taskId,
          fromRole: 'operator',
          toRole: role || (project.pack === 'two-pack' ? 'coder' : 'specifier'),
          status: 'queued',
          createdAt: new Date().toISOString()
        };

        fs.writeFileSync(path.join(queueDir, `${taskId}.json`), JSON.stringify(taskData, null, 2));
        broadcastEvent({ type: 'TASK_CREATED', task: taskData, projectId });

        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, task: taskData }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // POST /api/approve
  if (url.pathname === '/api/approve' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { projectId, taskId } = JSON.parse(body);
        const projects = getProjects();
        const project = projects.find(p => p.id === projectId);
        if (!project) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Projeto não encontrado' }));
          return;
        }

        const handoffsDir = path.join(project.path, '.harness', 'handoffs');
        const attnFile = path.join(handoffsDir, 'attention', `${taskId}.json`);
        const queueDir = path.join(handoffsDir, 'queue');
        const archiveDir = path.join(handoffsDir, 'archive');

        if (!fs.existsSync(attnFile)) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Tarefa não encontrada em attention' }));
          return;
        }

        const taskData = JSON.parse(fs.readFileSync(attnFile, 'utf8'));
        fs.unlinkSync(attnFile);

        let nextRole = 'coder';
        if (taskData.role === 'specifier') nextRole = 'coder';
        else if (taskData.role === 'refactorer' || taskData.role === 'cleaner') nextRole = 'guardian';
        else if (taskData.role === 'guardian' || taskData.role === 'qa') nextRole = 'done';

        if (nextRole === 'done') {
          fs.mkdirSync(archiveDir, { recursive: true });
          fs.writeFileSync(path.join(archiveDir, `${taskId}.json`), JSON.stringify({
            ...taskData,
            status: 'completed',
            approvedAt: new Date().toISOString()
          }, null, 2));
        } else {
          fs.mkdirSync(queueDir, { recursive: true });
          fs.writeFileSync(path.join(queueDir, `${taskId}.json`), JSON.stringify({
            ...taskData,
            fromRole: taskData.role,
            toRole: nextRole,
            status: 'approved_queued',
            approvedAt: new Date().toISOString()
          }, null, 2));
        }

        broadcastEvent({ type: 'TASK_APPROVED', taskId, projectId });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, nextRole }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // POST /api/reject
  if (url.pathname === '/api/reject' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { projectId, taskId, reason } = JSON.parse(body);
        const projects = getProjects();
        const project = projects.find(p => p.id === projectId);
        if (!project) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Projeto não encontrado' }));
          return;
        }

        const handoffsDir = path.join(project.path, '.harness', 'handoffs');
        const attnFile = path.join(handoffsDir, 'attention', `${taskId}.json`);
        const queueDir = path.join(handoffsDir, 'queue');

        if (fs.existsSync(attnFile)) {
          fs.unlinkSync(attnFile);
        }

        fs.mkdirSync(queueDir, { recursive: true });
        const rejectedData = {
          taskId,
          toRole: 'coder',
          status: 'rejected_feedback',
          reason: reason || 'Rejeitado pelo operador',
          rejectedAt: new Date().toISOString()
        };
        fs.writeFileSync(path.join(queueDir, `${taskId}.json`), JSON.stringify(rejectedData, null, 2));

        broadcastEvent({ type: 'TASK_REJECTED', taskId, projectId });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, task: rejectedData }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // Servir arquivos estáticos (public/)
  let filePath = path.join(__dirname, 'public', url.pathname === '/' ? 'index.html' : url.pathname);
  if (!fs.existsSync(filePath)) {
    filePath = path.join(__dirname, 'public', 'index.html');
  }

  const ext = path.extname(filePath);
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.svg': 'image/svg+xml'
  };

  const contentType = mimeTypes[ext] || 'text/plain';
  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404);
      res.end('Not Found');
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
});

server.listen(PORT, () => {
  console.log(`\n🚀 [OMNI-FORGE DASHBOARD] Operando em: http://localhost:${PORT}`);
  console.log(`📂 Configuração local de projetos: ${PROJECTS_CONFIG}`);
  console.log(`📡 SSE Stream ativo em: http://localhost:${PORT}/api/stream`);
  console.log(`🧭 Pressione Ctrl+C para encerrar.\n`);
});
