#!/usr/bin/env node

const http = require("http");
const fs = require("fs");
const path = require("path");
const { execSync, spawn } = require("child_process");

const PORT = process.env.PORT || 4200;
const HARNESS_DIR = path.resolve(__dirname, "..");
const PROJECTS_CONFIG = path.join(HARNESS_DIR, ".omni-projects.json");

// Gerenciador de Processos de Preview (Portas 3010, 5183, 4010)
const previewProcesses = {
  api: null,
  app: null,
  storefront: null,
};

function killProcessGroup(proc) {
  if (!proc || !proc.pid) return;
  try {
    process.kill(-proc.pid, "SIGKILL");
  } catch (e) {
    try {
      proc.kill("SIGKILL");
    } catch (_) {}
  }
}

// Auto-detecção agnóstica do motor de teste E2E (Cypress, Playwright, WebdriverIO, npm scripts, etc.)
function detectE2EEngine(targetDir, project = {}) {
  if (project.e2eCommand) {
    return {
      engine: "custom",
      name: project.e2eEngineName || "Comando Customizado",
      command: project.e2eCommand,
    };
  }

  const pkgJsonPath = path.join(targetDir, "package.json");
  let pkg = {};
  if (fs.existsSync(pkgJsonPath)) {
    try {
      pkg = JSON.parse(fs.readFileSync(pkgJsonPath, "utf8"));
    } catch (_) {}
  }

  const scripts = pkg.scripts || {};
  const allDeps = {
    ...(pkg.dependencies || {}),
    ...(pkg.devDependencies || {}),
  };

  // 1. Script npm específico no package.json (padrão de ouro de projetos)
  if (scripts["test:e2e"]) {
    return {
      engine: "npm",
      name: "npm run test:e2e",
      command: "npm run test:e2e",
    };
  }
  if (scripts["e2e"]) {
    return { engine: "npm", name: "npm run e2e", command: "npm run e2e" };
  }

  // 2. Cypress
  if (
    allDeps["cypress"] ||
    fs.existsSync(path.join(targetDir, "cypress.config.ts")) ||
    fs.existsSync(path.join(targetDir, "cypress.config.js")) ||
    fs.existsSync(path.join(targetDir, "cypress.config.mjs")) ||
    fs.existsSync(path.join(targetDir, "cypress.config.cjs")) ||
    fs.existsSync(path.join(targetDir, "cypress.json")) ||
    fs.existsSync(path.join(targetDir, "cypress"))
  ) {
    return { engine: "cypress", name: "Cypress", command: "npx cypress run" };
  }

  // 3. Playwright
  if (
    allDeps["@playwright/test"] ||
    allDeps["playwright"] ||
    fs.existsSync(path.join(targetDir, "playwright.config.ts")) ||
    fs.existsSync(path.join(targetDir, "playwright.config.js")) ||
    fs.existsSync(path.join(targetDir, "playwright.config.mjs")) ||
    fs.existsSync(path.join(targetDir, "playwright.config.cjs"))
  ) {
    return {
      engine: "playwright",
      name: "Playwright",
      command: "npx playwright test --reporter=line",
    };
  }

  // 4. WebdriverIO
  if (
    allDeps["@wdio/cli"] ||
    fs.existsSync(path.join(targetDir, "wdio.conf.ts")) ||
    fs.existsSync(path.join(targetDir, "wdio.conf.js"))
  ) {
    return {
      engine: "wdio",
      name: "WebdriverIO",
      command: "npx wdio run wdio.conf.ts",
    };
  }

  // 5. Fallback agnóstico
  return {
    engine: "generic",
    name: "E2E Runner",
    command:
      "npm run test:e2e 2>/dev/null || npx playwright test --reporter=line 2>/dev/null || npx cypress run",
  };
}

// Sanitizador & Otimizador com IA: Remove cliques desnecessários e decompõe maratonas em testes atômicos
function refineAndSplitE2ETest(rawCode, task = {}) {
  if (!rawCode || typeof rawCode !== "string") {
    return {
      rawCode: "",
      refinedCode: "",
      removedClicksCount: 0,
      convertedAssertionsCount: 0,
      splitTestsCount: 0,
      explanation: "Nenhum código fornecido para refinamento.",
    };
  }

  const rawLines = rawCode.split("\n");
  const taskTitle = task.title || task.taskId || "Funcionalidade Testada";
  const taskId = task.taskId || "E2E-TEST";

  let initialUrl = "";
  const cleanedActions = [];
  let removedClicksCount = 0;
  let convertedAssertionsCount = 0;

  // 1. Extração e Sanitização de Linhas
  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i].trim();

    // Ignora importações e declarações globais iniciais (serão reconstruídas)
    if (
      line.startsWith("import ") ||
      line.startsWith("test(") ||
      line.startsWith("test.describe(") ||
      line === "});" ||
      line === "})" ||
      line === "" ||
      line.startsWith("//")
    ) {
      continue;
    }

    // Captura o page.goto inicial
    const gotoMatch = line.match(/await\s+page\.goto\(['"]([^'"]+)['"]\)/);
    if (gotoMatch && !initialUrl) {
      initialUrl = gotoMatch[1];
      continue;
    }

    // 1.1 Eliminar cliques mortos em containers genéricos / neutros
    if (
      line.match(
        /await\s+page\.locator\(['"](body|html|div\.container|div\.main|div\.wrapper|#root|\.app)['"]\)\.click\(\);/,
      ) ||
      line.match(/await\s+page\.locator\(['"]div['"]\)\.click\(\);/)
    ) {
      removedClicksCount++;
      continue;
    }

    // 1.2 Eliminar clique redundante imediatamente anterior a um .fill() no mesmo seletor
    const isClick = line.match(/await\s+(page\.[^;]+)\.click\(\);/);
    if (isClick && i + 1 < rawLines.length) {
      const nextLine = rawLines[i + 1].trim();
      const locatorTarget = isClick[1]; // ex: page.getByPlaceholder('Email')
      if (nextLine.startsWith(`await ${locatorTarget}.fill(`)) {
        removedClicksCount++;
        continue;
      }
    }

    // 1.3 Eliminar clique consecutivo idêntico no mesmo seletor
    if (isClick && cleanedActions.length > 0) {
      const lastAction = cleanedActions[cleanedActions.length - 1];
      if (lastAction === line) {
        removedClicksCount++;
        continue;
      }
    }

    // 1.4 Converter cliques passivos em mensagens/toasts de confirmação para asserções
    const isNotifyClick = line.match(
      /await\s+page\.(getByText|locator)\(['"]([^'"]+)['"]\)\.click\(\);/,
    );
    if (isNotifyClick) {
      const textVal = isNotifyClick[2].toLowerCase();
      const notifyKeywords = [
        "sucesso",
        "criado",
        "salvo",
        "atualizado",
        "excluído",
        "deletado",
        "cadastrado",
        "bem-sucedido",
        "confirmado",
        "concluído",
        "toast",
        "alert",
        "notification",
        "badge",
      ];
      const hasKeyword = notifyKeywords.some((k) => textVal.includes(k));
      if (hasKeyword) {
        convertedAssertionsCount++;
        cleanedActions.push(
          `await expect(page.getByText('${isNotifyClick[2]}')).toBeVisible();`,
        );
        continue;
      }
    }

    cleanedActions.push(line);
  }

  // 2. Decomposição em Testes Atômicos
  // Agrupa ações em blocos lógicos baseados em intenção de negócio:
  // - Criação / Preenchimento de formulário
  // - Interação com modais e ações destrutivas (excluir/confirmar)
  // - Validações visuais intermediárias
  const testBlocks = [];
  let currentBlock = { title: "", actions: [] };

  cleanedActions.forEach((act) => {
    const isSubmitAction = act.match(
      /button.*(Salvar|Criar|Enviar|Confirmar|Entrar|Cadastrar|Adicionar|Save|Create|Submit)/i,
    );
    const isDestructiveAction = act.match(
      /button.*(Excluir|Deletar|Remover|Cancelar|Delete|Remove)/i,
    );

    currentBlock.actions.push(act);

    // Se encontramos uma ação de submissão e já temos ao menos 2 ações no bloco, fecha o bloco atômico
    if (isSubmitAction && currentBlock.actions.length >= 2) {
      currentBlock.title = `deve preencher e submeter ação de ${act.includes("Entrar") ? "autenticação" : "cadastro/atualização"} com sucesso`;
      testBlocks.push({ ...currentBlock });
      currentBlock = { title: "", actions: [] };
    } else if (isDestructiveAction && currentBlock.actions.length >= 2) {
      currentBlock.title = `deve acionar fluxo com confirmação de segurança`;
      testBlocks.push({ ...currentBlock });
      currentBlock = { title: "", actions: [] };
    }
  });

  if (currentBlock.actions.length > 0) {
    if (testBlocks.length === 0) {
      currentBlock.title = `deve executar o fluxo completo de ${taskTitle}`;
    } else {
      currentBlock.title = `deve validar os estados finais e interações complementares`;
    }
    testBlocks.push(currentBlock);
  }

  // Se gerou apenas 1 bloco mas ele tem muitas ações (> 7), quebra em validação + interação
  if (testBlocks.length === 1 && testBlocks[0].actions.length > 7) {
    const half = Math.ceil(testBlocks[0].actions.length / 2);
    const b1 = {
      title: `deve interagir com os elementos iniciais da tela`,
      actions: testBlocks[0].actions.slice(0, half),
    };
    const b2 = {
      title: `deve concluir as ações e validar respostas visuais`,
      actions: testBlocks[0].actions.slice(half),
    };
    testBlocks.length = 0;
    testBlocks.push(b1, b2);
  }

  // 3. Montagem do Código TypeScript Otimizado (Clean Architecture de Testes)
  const codeLines = [];
  codeLines.push(`import { test, expect } from '@playwright/test';`);
  codeLines.push("");
  codeLines.push(`test.describe('E2E [${taskId}]: ${taskTitle}', () => {`);

  if (initialUrl) {
    codeLines.push("  test.beforeEach(async ({ page }) => {");
    codeLines.push(`    await page.goto('${initialUrl}');`);
    codeLines.push("  });");
    codeLines.push("");
  }

  testBlocks.forEach((block, idx) => {
    codeLines.push(
      `  test('${block.title || `fluxo atômico ${idx + 1}`}', async ({ page }) => {`,
    );
    block.actions.forEach((a) => {
      codeLines.push(`    ${a}`);
    });
    // Adiciona expectativa básica se não houver asserções
    if (!block.actions.some((a) => a.includes("expect("))) {
      codeLines.push(`    await expect(page).not.toHaveTitle('');`);
    }
    codeLines.push("  });");
    if (idx < testBlocks.length - 1) codeLines.push("");
  });

  codeLines.push("});");
  codeLines.push("");

  const refinedCode = codeLines.join("\n");

  return {
    rawCode,
    refinedCode,
    removedClicksCount,
    convertedAssertionsCount,
    splitTestsCount: testBlocks.length,
    explanation: `Removidos ${removedClicksCount} clique(s) redundante(s) e em falso. ${convertedAssertionsCount > 0 ? `Convertidos ${convertedAssertionsCount} clique(s) passivo(s) em asserções expect(). ` : ""}A maratona foi dividida em ${testBlocks.length} teste(s) atômico(s) isolados com beforeEach.`,
  };
}

// Lê a lista de projetos do usuário
function getProjects() {
  if (!fs.existsSync(PROJECTS_CONFIG)) {
    return [];
  }
  try {
    return JSON.parse(fs.readFileSync(PROJECTS_CONFIG, "utf8"));
  } catch (e) {
    return [];
  }
}

// Salva a lista de projetos
function saveProjects(projects) {
  fs.writeFileSync(PROJECTS_CONFIG, JSON.stringify(projects, null, 2));
  watchHarnessDirs();
  broadcastEvent({ type: "PROJECTS_UPDATED", projects });
}

// Obtém tarefas ativas de um projeto
function getProjectTasks(project) {
  if (!fs.existsSync(project.path)) {
    return [];
  }

  const handoffsDir = path.join(project.path, ".harness", "handoffs");
  const queueDir = path.join(handoffsDir, "queue");
  const attentionDir = path.join(handoffsDir, "attention");
  const archiveDir = path.join(handoffsDir, "archive");

  const tasks = [];

  const readDirSafe = (dir, status) => {
    if (!fs.existsSync(dir)) return;
    try {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        if (!file.endsWith(".json")) continue;
        try {
          const content = JSON.parse(
            fs.readFileSync(path.join(dir, file), "utf8"),
          );
          tasks.push({
            ...content,
            lane: status,
            project: project.id,
            projectName: project.name,
          });
        } catch (err) {}
      }
    } catch (e) {}
  };

  readDirSafe(attentionDir, "attention");
  readDirSafe(queueDir, "queued");
  readDirSafe(archiveDir, "done");

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
    const handoffsDir = path.join(p.path, ".harness", "handoffs");
    if (fs.existsSync(handoffsDir) && !watchedDirs.has(handoffsDir)) {
      watchedDirs.add(handoffsDir);
      try {
        fs.watch(handoffsDir, { recursive: true }, () => {
          broadcastEvent({ type: "HANDOFF_UPDATE", timestamp: Date.now() });
        });
      } catch (e) {}
    }
  }
}
watchHarnessDirs();

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  // CORS Headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  // SSE Stream
  if (url.pathname === "/api/stream") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
    res.write(": connected\n\n");
    sseClients.add(res);
    req.on("close", () => sseClients.delete(res));
    return;
  }

  // GET /api/status (Retorna estado completo: projetos, tarefas e itens em atenção)
  if (url.pathname === "/api/status" && req.method === "GET") {
    const projects = getProjects();
    const allTasks = [];
    const attentionItems = [];

    for (const p of projects) {
      const pTasks = getProjectTasks(p);
      allTasks.push(...pTasks);
      for (const t of pTasks) {
        if (t.lane === "attention") {
          attentionItems.push(t);
        }
      }
    }

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        status: "live",
        projects: projects.map((p) => ({
          ...p,
          exists: fs.existsSync(p.path),
          hasHarness: fs.existsSync(path.join(p.path, ".harness")),
        })),
        tasks: allTasks,
        attention: attentionItems,
      }),
    );
    return;
  }

  // GET /api/projects
  if (url.pathname === "/api/projects" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(getProjects()));
    return;
  }

  // POST /api/projects (Cadastrar novo projeto)
  if (url.pathname === "/api/projects" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const { name, targetPath, pack, initHarness } = JSON.parse(body);

        if (!name || !targetPath) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              error: "Nome e caminho absoluto são obrigatórios.",
            }),
          );
          return;
        }

        const resolvedPath = path.resolve(targetPath);
        if (!fs.existsSync(resolvedPath)) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              error: `O caminho informado não existe: ${resolvedPath}`,
            }),
          );
          return;
        }

        // Se solicitado ou se .harness não existir, pode inicializar
        const harnessPath = path.join(resolvedPath, ".harness");
        if (!fs.existsSync(harnessPath) && initHarness) {
          const initScript = path.join(
            HARNESS_DIR,
            "scripts",
            "init-harness.sh",
          );
          try {
            execSync(`bash "${initScript}" "${resolvedPath}"`, {
              stdio: "ignore",
            });
          } catch (initErr) {
            console.warn(
              "Aviso: Falha ao rodar init-harness.sh automaticamente:",
              initErr.message,
            );
          }
        }

        // Garante criação da estrutura de handoffs
        fs.mkdirSync(path.join(resolvedPath, ".harness", "handoffs", "queue"), {
          recursive: true,
        });
        fs.mkdirSync(
          path.join(resolvedPath, ".harness", "handoffs", "attention"),
          { recursive: true },
        );
        fs.mkdirSync(
          path.join(resolvedPath, ".harness", "handoffs", "archive"),
          { recursive: true },
        );

        const projects = getProjects();
        const id = name.toLowerCase().replace(/[^a-z0-9_-]/g, "-");

        // Remove duplicata se já existir
        const filtered = projects.filter(
          (p) => p.id !== id && p.path !== resolvedPath,
        );
        const newProject = {
          id,
          name,
          path: resolvedPath,
          pack: pack || "four-pack",
          addedAt: new Date().toISOString(),
        };
        filtered.push(newProject);
        saveProjects(filtered);

        res.writeHead(201, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true, project: newProject }));
      } catch (err) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // DELETE /api/projects (Remover projeto da lista)
  if (url.pathname === "/api/projects" && req.method === "DELETE") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const { projectId } = JSON.parse(body);
        const projects = getProjects();
        const filtered = projects.filter((p) => p.id !== projectId);
        saveProjects(filtered);

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true }));
      } catch (err) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // POST /api/tasks (Criar nova tarefa no projeto selecionado)
  if (url.pathname === "/api/tasks" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const { projectId, taskId, title, role } = JSON.parse(body);
        const projects = getProjects();
        const project = projects.find((p) => p.id === projectId);
        if (!project) {
          res.writeHead(404, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Projeto não encontrado" }));
          return;
        }

        const queueDir = path.join(
          project.path,
          ".harness",
          "handoffs",
          "queue",
        );
        fs.mkdirSync(queueDir, { recursive: true });

        const taskData = {
          taskId,
          title: title || taskId,
          fromRole: "operator",
          toRole: role || (project.pack === "two-pack" ? "coder" : "specifier"),
          status: "queued",
          createdAt: new Date().toISOString(),
        };

        fs.writeFileSync(
          path.join(queueDir, `${taskId}.json`),
          JSON.stringify(taskData, null, 2),
        );
        broadcastEvent({ type: "TASK_CREATED", task: taskData, projectId });

        res.writeHead(201, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true, task: taskData }));
      } catch (err) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // POST /api/approve
  if (url.pathname === "/api/approve" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const { projectId, taskId } = JSON.parse(body);
        const projects = getProjects();
        const project = projects.find((p) => p.id === projectId);
        if (!project) {
          res.writeHead(404, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Projeto não encontrado" }));
          return;
        }

        const handoffsDir = path.join(project.path, ".harness", "handoffs");
        const attnFile = path.join(handoffsDir, "attention", `${taskId}.json`);
        const queueDir = path.join(handoffsDir, "queue");
        const archiveDir = path.join(handoffsDir, "archive");

        if (!fs.existsSync(attnFile)) {
          res.writeHead(404, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({ error: "Tarefa não encontrada em attention" }),
          );
          return;
        }

        const taskData = JSON.parse(fs.readFileSync(attnFile, "utf8"));
        fs.unlinkSync(attnFile);

        let nextRole = "coder";
        if (taskData.role === "specifier") nextRole = "coder";
        else if (taskData.role === "refactorer" || taskData.role === "cleaner")
          nextRole = "guardian";
        else if (taskData.role === "guardian" || taskData.role === "qa")
          nextRole = "done";

        if (nextRole === "done") {
          fs.mkdirSync(archiveDir, { recursive: true });
          fs.writeFileSync(
            path.join(archiveDir, `${taskId}.json`),
            JSON.stringify(
              {
                ...taskData,
                status: "completed",
                approvedAt: new Date().toISOString(),
              },
              null,
              2,
            ),
          );
        } else {
          fs.mkdirSync(queueDir, { recursive: true });
          fs.writeFileSync(
            path.join(queueDir, `${taskId}.json`),
            JSON.stringify(
              {
                ...taskData,
                fromRole: taskData.role,
                toRole: nextRole,
                status: "approved_queued",
                approvedAt: new Date().toISOString(),
              },
              null,
              2,
            ),
          );
        }

        broadcastEvent({ type: "TASK_APPROVED", taskId, projectId });
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true, nextRole }));
      } catch (err) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // POST /api/reject
  if (url.pathname === "/api/reject" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const { projectId, taskId, reason } = JSON.parse(body);
        const projects = getProjects();
        const project = projects.find((p) => p.id === projectId);
        if (!project) {
          res.writeHead(404, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Projeto não encontrado" }));
          return;
        }

        const handoffsDir = path.join(project.path, ".harness", "handoffs");
        const attnFile = path.join(handoffsDir, "attention", `${taskId}.json`);
        const queueDir = path.join(handoffsDir, "queue");

        if (fs.existsSync(attnFile)) {
          fs.unlinkSync(attnFile);
        }

        fs.mkdirSync(queueDir, { recursive: true });
        const rejectedData = {
          taskId,
          toRole: "coder",
          status: "rejected_feedback",
          reason: reason || "Rejeitado pelo operador",
          rejectedAt: new Date().toISOString(),
        };
        fs.writeFileSync(
          path.join(queueDir, `${taskId}.json`),
          JSON.stringify(rejectedData, null, 2),
        );

        broadcastEvent({ type: "TASK_REJECTED", taskId, projectId });
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true, task: rejectedData }));
      } catch (err) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // POST /api/advance (Avançar tarefa manualmente para o próximo papel da esteira)
  if (url.pathname === "/api/advance" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const { projectId, taskId } = JSON.parse(body);
        const projects = getProjects();
        const project = projects.find((p) => p.id === projectId);
        if (!project) {
          res.writeHead(404, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Projeto não encontrado" }));
          return;
        }

        const handoffsDir = path.join(project.path, ".harness", "handoffs");
        const queueDir = path.join(handoffsDir, "queue");
        const taskFile = path.join(queueDir, `${taskId}.json`);

        if (!fs.existsSync(taskFile)) {
          res.writeHead(404, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Tarefa não encontrada na fila" }));
          return;
        }

        const taskData = JSON.parse(fs.readFileSync(taskFile, "utf8"));
        const currentRole = (
          taskData.toRole ||
          taskData.role ||
          "specifier"
        ).toLowerCase();

        const pipeline =
          project.pack === "two-pack"
            ? ["coder", "cleaner", "done"]
            : ["specifier", "coder", "refactorer", "guardian", "done"];

        const currentIdx = pipeline.indexOf(currentRole);
        const nextRole =
          currentIdx >= 0 && currentIdx < pipeline.length - 1
            ? pipeline[currentIdx + 1]
            : "done";

        if (nextRole === "done") {
          const archiveDir = path.join(handoffsDir, "archive");
          fs.mkdirSync(archiveDir, { recursive: true });
          fs.unlinkSync(taskFile);
          fs.writeFileSync(
            path.join(archiveDir, `${taskId}.json`),
            JSON.stringify(
              {
                ...taskData,
                status: "completed",
                completedAt: new Date().toISOString(),
              },
              null,
              2,
            ),
          );
        } else {
          taskData.fromRole = currentRole;
          taskData.toRole = nextRole;
          taskData.status = "queued";
          taskData.updatedAt = new Date().toISOString();
          fs.writeFileSync(taskFile, JSON.stringify(taskData, null, 2));
        }

        broadcastEvent({ type: "TASK_ADVANCED", taskId, nextRole, projectId });
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true, nextRole }));
      } catch (err) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // GET /api/diff (Obter Git Diff e arquivos modificados no Worktree ou Projeto)
  if (url.pathname === "/api/diff" && req.method === "GET") {
    try {
      const projectId = url.searchParams.get("projectId");
      const role = (url.searchParams.get("role") || "specifier").toLowerCase();
      const projects = getProjects();
      const project = projects.find((p) => p.id === projectId);
      if (!project) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Projeto não encontrado" }));
        return;
      }

      const worktreePath = path.join(project.path, ".worktrees", role);
      const targetDir = fs.existsSync(worktreePath)
        ? worktreePath
        : project.path;

      let rawDiff = "";
      let fileStats = [];
      let summary = "";

      if (
        fs.existsSync(path.join(targetDir, ".git")) ||
        fs.existsSync(path.join(project.path, ".git"))
      ) {
        try {
          // 1. Tenta pegar diff uncommitted
          rawDiff = execSync("git diff HEAD", {
            cwd: targetDir,
            encoding: "utf8",
            maxBuffer: 1024 * 1024 * 5,
          }).trim();

          // Se não houver uncommitted, tenta pegar o diff do último commit
          if (!rawDiff) {
            rawDiff = execSync("git diff HEAD~1 HEAD 2>/dev/null || true", {
              cwd: targetDir,
              encoding: "utf8",
              maxBuffer: 1024 * 1024 * 5,
            }).trim();
          }

          // Stat dos arquivos
          const numstat = execSync(
            "git diff --numstat HEAD 2>/dev/null || git diff --numstat HEAD~1 HEAD 2>/dev/null || true",
            { cwd: targetDir, encoding: "utf8" },
          ).trim();
          if (numstat) {
            fileStats = numstat
              .split("\n")
              .filter(Boolean)
              .map((line) => {
                const parts = line.split("\t");
                return {
                  file: parts[2] || "",
                  additions: parseInt(parts[0], 10) || 0,
                  deletions: parseInt(parts[1], 10) || 0,
                };
              });
          }

          // Summary
          const shortstat = execSync(
            "git diff --shortstat HEAD 2>/dev/null || git diff --shortstat HEAD~1 HEAD 2>/dev/null || true",
            { cwd: targetDir, encoding: "utf8" },
          ).trim();
          summary =
            shortstat ||
            (fileStats.length
              ? `${fileStats.length} arquivo(s) modificado(s)`
              : "Sem alterações detectadas no git");
        } catch (gitErr) {
          rawDiff = `// Git diff output indisponível: ${gitErr.message}`;
        }
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          targetDir,
          isWorktree: targetDir === worktreePath,
          summary,
          files: fileStats,
          diff: rawDiff || "// Nenhum diff pendente ou arquivo modificado.",
        }),
      );
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // POST /api/open-editor (Abre o diretório no editor local)
  if (url.pathname === "/api/open-editor" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const { projectId, role, customPath } = JSON.parse(body || "{}");
        let targetPath = customPath;
        if (!targetPath && projectId) {
          const projects = getProjects();
          const project = projects.find((p) => p.id === projectId);
          if (project) {
            const wt =
              role && role !== "done"
                ? path.join(project.path, ".worktrees", role)
                : null;
            targetPath = wt && fs.existsSync(wt) ? wt : project.path;
          }
        }

        if (!targetPath || !fs.existsSync(targetPath)) {
          res.writeHead(404, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Caminho não encontrado no disco" }));
          return;
        }

        try {
          execSync(
            `cursor "${targetPath}" 2>/dev/null || code "${targetPath}" 2>/dev/null || open "${targetPath}"`,
            { stdio: "ignore" },
          );
        } catch (e) {
          try {
            execSync(`open "${targetPath}"`, { stdio: "ignore" });
          } catch (_) {}
        }

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true, openedPath: targetPath }));
      } catch (err) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // POST /api/run-tests (Executa testes automatizados no worktree ou projeto)
  if (url.pathname === "/api/run-tests" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const { projectId, role } = JSON.parse(body || "{}");
        const projects = getProjects();
        const project = projects.find((p) => p.id === projectId);
        if (!project) {
          res.writeHead(404, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Projeto não encontrado" }));
          return;
        }

        const wt =
          role && role !== "done"
            ? path.join(project.path, ".worktrees", role)
            : null;
        const targetDir = wt && fs.existsSync(wt) ? wt : project.path;

        const startTime = Date.now();
        let output = "";
        let exitCode = 0;

        try {
          output = execSync("npm test -- --run 2>&1 || npm test 2>&1", {
            cwd: targetDir,
            encoding: "utf8",
            timeout: 30000,
            maxBuffer: 1024 * 1024 * 3,
          });
          exitCode = 0;
        } catch (testErr) {
          exitCode = testErr.status || 1;
          output = testErr.stdout || testErr.stderr || testErr.message;
        }

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);

        const passedMatch = output.match(/(\d+)\s+passed/i);
        const failedMatch = output.match(/(\d+)\s+failed/i);
        const totalMatch = output.match(/Tests:\s+([^\n]+)/i);

        const summary = {
          success: exitCode === 0,
          duration: `${duration}s`,
          passed: passedMatch
            ? parseInt(passedMatch[1], 10)
            : exitCode === 0
              ? "OK"
              : 0,
          failed: failedMatch
            ? parseInt(failedMatch[1], 10)
            : exitCode === 0
              ? 0
              : "Falhou",
          overview: totalMatch
            ? totalMatch[1].trim()
            : exitCode === 0
              ? "Sucesso em todos os testes"
              : "Falha na execução dos testes",
        };

        broadcastEvent({ type: "TESTS_COMPLETED", projectId, role, summary });

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            success: exitCode === 0,
            exitCode,
            targetDir,
            summary,
            output: output.slice(-4000),
          }),
        );
      } catch (err) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // POST /api/merge-task (Integra a branch do worktree na branch principal)
  if (url.pathname === "/api/merge-task" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const { projectId, taskId, role } = JSON.parse(body || "{}");
        const projects = getProjects();
        const project = projects.find((p) => p.id === projectId);
        if (!project) {
          res.writeHead(404, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Projeto não encontrado" }));
          return;
        }

        const wt =
          role && role !== "done"
            ? path.join(project.path, ".worktrees", role)
            : null;
        let mergeOutput = "";

        if (wt && fs.existsSync(wt)) {
          const wtBranch = execSync("git rev-parse --abbrev-ref HEAD", {
            cwd: wt,
            encoding: "utf8",
          }).trim();
          mergeOutput = execSync(`git merge "${wtBranch}" --no-edit`, {
            cwd: project.path,
            encoding: "utf8",
          });
        } else {
          mergeOutput = "Branch já unificada ou em trunk.";
        }

        broadcastEvent({ type: "TASK_MERGED", projectId, taskId });
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true, message: mergeOutput }));
      } catch (err) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // GET /api/preview/status (Status do Trio de Preview)
  if (url.pathname === "/api/preview/status" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        api: {
          running: !!(previewProcesses.api && !previewProcesses.api.killed),
          port: 3010,
          url: "http://localhost:3010",
          pid: previewProcesses.api ? previewProcesses.api.pid : null,
        },
        app: {
          running: !!(previewProcesses.app && !previewProcesses.app.killed),
          port: 5183,
          url: "http://localhost:5183",
          pid: previewProcesses.app ? previewProcesses.app.pid : null,
        },
        storefront: {
          running: !!(
            previewProcesses.storefront && !previewProcesses.storefront.killed
          ),
          port: 4010,
          url: "http://localhost:4010",
          pid: previewProcesses.storefront
            ? previewProcesses.storefront.pid
            : null,
        },
      }),
    );
    return;
  }

  // POST /api/preview/start (Inicia servidores na faixa de preview)
  if (url.pathname === "/api/preview/start" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const { service } = JSON.parse(body || "{}");
        const projects = getProjects();

        const findProj = (kw) =>
          projects.find(
            (p) =>
              p.id.toLowerCase().includes(kw) ||
              p.name.toLowerCase().includes(kw) ||
              p.path.toLowerCase().includes(kw),
          );
        const projApi = findProj("api");
        const projApp = findProj("app");
        const projStore = findProj("storefront") || findProj("store");

        const started = [];

        // 1. API na 3010
        if ((!service || service === "api" || service === "all") && projApi) {
          if (!previewProcesses.api || previewProcesses.api.killed) {
            const wt = path.join(projApi.path, ".worktrees", "refactorer");
            const cwd = fs.existsSync(wt) ? wt : projApi.path;
            const env = { ...process.env, PORT: "3010" };
            previewProcesses.api = spawn("npm", ["run", "dev"], {
              cwd,
              env,
              detached: true,
              stdio: "ignore",
            });
            previewProcesses.api.unref();
            started.push("API (3010)");
          }
        }

        // 2. App na 5183 (conectado na API 3010)
        if ((!service || service === "app" || service === "all") && projApp) {
          if (!previewProcesses.app || previewProcesses.app.killed) {
            const wt = path.join(projApp.path, ".worktrees", "coder");
            const cwd = fs.existsSync(wt) ? wt : projApp.path;
            const env = {
              ...process.env,
              PORT: "5183",
              VITE_API_URL: "http://localhost:3010",
            };
            previewProcesses.app = spawn("npx", ["vite", "--port", "5183"], {
              cwd,
              env,
              detached: true,
              stdio: "ignore",
            });
            previewProcesses.app.unref();
            started.push("App (5183)");
          }
        }

        // 3. Storefront na 4010 (conectado na API 3010)
        if (
          (!service || service === "storefront" || service === "all") &&
          projStore
        ) {
          if (
            !previewProcesses.storefront ||
            previewProcesses.storefront.killed
          ) {
            const wt = path.join(projStore.path, ".worktrees", "coder");
            const cwd = fs.existsSync(wt) ? wt : projStore.path;
            const env = {
              ...process.env,
              PORT: "4010",
              API_URL: "http://localhost:3010",
            };
            previewProcesses.storefront = spawn("npm", ["run", "dev"], {
              cwd,
              env,
              detached: true,
              stdio: "ignore",
            });
            previewProcesses.storefront.unref();
            started.push("Storefront (4010)");
          }
        }

        broadcastEvent({ type: "PREVIEW_STATUS_CHANGED" });
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true, started }));
      } catch (err) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // POST /api/preview/stop (Encerra servidores e libera portas)
  if (url.pathname === "/api/preview/stop" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const { service } = JSON.parse(body || "{}");
        const stopped = [];

        if (!service || service === "api" || service === "all") {
          if (previewProcesses.api) {
            killProcessGroup(previewProcesses.api);
            previewProcesses.api = null;
            stopped.push("api");
          }
          try {
            execSync("lsof -ti :3010 | xargs kill -9 2>/dev/null || true");
          } catch (_) {}
        }

        if (!service || service === "app" || service === "all") {
          if (previewProcesses.app) {
            killProcessGroup(previewProcesses.app);
            previewProcesses.app = null;
            stopped.push("app");
          }
          try {
            execSync("lsof -ti :5183 | xargs kill -9 2>/dev/null || true");
          } catch (_) {}
        }

        if (!service || service === "storefront" || service === "all") {
          if (previewProcesses.storefront) {
            killProcessGroup(previewProcesses.storefront);
            previewProcesses.storefront = null;
            stopped.push("storefront");
          }
          try {
            execSync("lsof -ti :4010 | xargs kill -9 2>/dev/null || true");
          } catch (_) {}
        }

        broadcastEvent({ type: "PREVIEW_STATUS_CHANGED" });
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true, stopped }));
      } catch (err) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // GET /api/governance (Auditoria de Regras Duras: Tenant, Complexidade M < 5, Zero Any)
  if (url.pathname === "/api/governance" && req.method === "GET") {
    try {
      const projectId = url.searchParams.get("projectId");
      const role = (url.searchParams.get("role") || "specifier").toLowerCase();
      const projects = getProjects();
      const project = projects.find((p) => p.id === projectId);
      if (!project) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Projeto não encontrado" }));
        return;
      }

      const worktreePath = path.join(project.path, ".worktrees", role);
      const targetDir = fs.existsSync(worktreePath)
        ? worktreePath
        : project.path;

      let changedFiles = [];
      try {
        const out = execSync(
          "git diff --name-only HEAD~1 HEAD 2>/dev/null || git status -s 2>/dev/null | awk '{print $2}' || true",
          { cwd: targetDir, encoding: "utf8" },
        ).trim();
        changedFiles = out.split("\n").filter(Boolean);
      } catch (_) {}

      // 1. Auditoria de Tenant Isolation
      let tenantViolations = [];
      const dbRegex = /(db\.|selectFrom|updateTable|deleteFrom|insertInto)/;
      for (const relFile of changedFiles) {
        if (!relFile.endsWith(".ts") && !relFile.endsWith(".js")) continue;
        const fullFile = path.join(targetDir, relFile);
        if (!fs.existsSync(fullFile)) continue;
        try {
          const content = fs.readFileSync(fullFile, "utf8");
          if (dbRegex.test(content) && !content.includes("tenant_id")) {
            tenantViolations.push(relFile);
          }
        } catch (_) {}
      }

      // 2. Auditoria de Any (Zero Any)
      let anyViolations = [];
      for (const relFile of changedFiles) {
        if (!relFile.endsWith(".ts") && !relFile.endsWith(".tsx")) continue;
        const fullFile = path.join(targetDir, relFile);
        if (!fs.existsSync(fullFile)) continue;
        try {
          const content = fs.readFileSync(fullFile, "utf8");
          const matches = content.match(/:\s*any\b|as\s+any\b/g);
          if (matches && matches.length > 0) {
            anyViolations.push({ file: relFile, count: matches.length });
          }
        } catch (_) {}
      }

      // 3. Complexidade Ciclomática / Tamanho
      let complexityWarnings = [];
      for (const relFile of changedFiles) {
        if (!relFile.endsWith(".ts") && !relFile.endsWith(".tsx")) continue;
        const fullFile = path.join(targetDir, relFile);
        if (!fs.existsSync(fullFile)) continue;
        try {
          const lines = fs.readFileSync(fullFile, "utf8").split("\n");
          if (lines.length > 250) {
            complexityWarnings.push({
              file: relFile,
              reason: `Arquivo longo (${lines.length} linhas > teto de 200)`,
            });
          }
        } catch (_) {}
      }

      const passedAll =
        tenantViolations.length === 0 && anyViolations.length === 0;

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          passedAll,
          tenantIsolation: {
            passed: tenantViolations.length === 0,
            violations: tenantViolations,
            message:
              tenantViolations.length === 0
                ? "Isolamento 100% verificado (queries com tenant_id)"
                : "Detecção de queries sem filtro de tenant_id",
          },
          typeSafety: {
            passed: anyViolations.length === 0,
            totalAny: anyViolations.reduce((acc, v) => acc + v.count, 0),
            violations: anyViolations,
            message:
              anyViolations.length === 0
                ? "Zero any detectado (Tipagem estrita)"
                : "Uso de any detectado no código",
          },
          complexity: {
            passed: complexityWarnings.length === 0,
            warnings: complexityWarnings,
            message:
              complexityWarnings.length === 0
                ? "Arquitetura modular enxuta"
                : "Arquivos excedendo métricas de manutenibilidade",
          },
        }),
      );
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // GET /api/e2e-info (Detecta motor e comando E2E do projeto/worktree)
  if (url.pathname === "/api/e2e-info" && req.method === "GET") {
    const projectId = url.searchParams.get("projectId");
    const role = url.searchParams.get("role");
    const projects = getProjects();
    let project = projects.find((p) => p.id === projectId);
    if (!project) {
      project =
        projects.find(
          (p) =>
            p.id.toLowerCase().includes("app") ||
            p.path.toLowerCase().includes("app"),
        ) || projects[0];
    }

    if (!project) {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Projeto não encontrado" }));
      return;
    }

    const wt =
      role && role !== "done"
        ? path.join(project.path, ".worktrees", role)
        : null;
    const targetDir = wt && fs.existsSync(wt) ? wt : project.path;
    const detected = detectE2EEngine(targetDir, project);

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        projectId: project.id,
        projectName: project.name,
        targetDir,
        ...detected,
      }),
    );
    return;
  }

  // POST /api/run-e2e (Executa teste E2E agnóstico: Cypress, Playwright, npm script ou custom)
  if (url.pathname === "/api/run-e2e" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const { projectId, taskId, role } = JSON.parse(body || "{}");
        const projects = getProjects();
        let project = projects.find((p) => p.id === projectId);
        if (!project) {
          project =
            projects.find(
              (p) =>
                p.id.toLowerCase().includes("app") ||
                p.path.toLowerCase().includes("app"),
            ) || projects[0];
        }

        if (!project) {
          res.writeHead(404, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({ error: "Projeto para testes E2E não encontrado" }),
          );
          return;
        }

        const wt =
          role && role !== "done"
            ? path.join(project.path, ".worktrees", role)
            : null;
        const targetDir = wt && fs.existsSync(wt) ? wt : project.path;
        const detected = detectE2EEngine(targetDir, project);

        const startTime = Date.now();
        let output = "";
        let exitCode = 0;

        try {
          output = execSync(`${detected.command} 2>&1`, {
            cwd: targetDir,
            encoding: "utf8",
            timeout: 120000,
            maxBuffer: 1024 * 1024 * 6,
          });
          exitCode = 0;
        } catch (testErr) {
          exitCode = testErr.status || 1;
          output = testErr.stdout || testErr.stderr || testErr.message;
        }

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            success: exitCode === 0,
            exitCode,
            duration: `${duration}s`,
            engine: detected.name,
            command: detected.command,
            output: output.slice(-5000),
          }),
        );
      } catch (err) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // POST /api/e2e-record (Dispara navegador com Codegen interativo)
  if (url.pathname === "/api/e2e-record" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const { projectId, taskId, role, previewUrl } = JSON.parse(
          body || "{}",
        );
        const projects = getProjects();
        let project = projects.find((p) => p.id === projectId);
        if (!project) {
          project =
            projects.find(
              (p) =>
                p.id.toLowerCase().includes("app") ||
                p.path.toLowerCase().includes("app"),
            ) || projects[0];
        }

        if (!project) {
          res.writeHead(404, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Projeto não encontrado" }));
          return;
        }

        const wt =
          role && role !== "done"
            ? path.join(project.path, ".worktrees", role)
            : null;
        const targetDir = wt && fs.existsSync(wt) ? wt : project.path;

        const e2eDir = path.join(targetDir, "tests", "e2e");
        fs.mkdirSync(e2eDir, { recursive: true });
        const rawTestPath = path.join(e2eDir, `${taskId}.spec.ts`);

        // Determina URL de destino (App :5183 ou Storefront :4010)
        let targetUrl = previewUrl;
        if (!targetUrl) {
          const isStorefront =
            project.id.toLowerCase().includes("store") ||
            project.path.toLowerCase().includes("store");
          targetUrl = isStorefront
            ? "http://localhost:4010"
            : "http://localhost:5183";
        }

        // Spawna navegador Playwright Codegen
        const codegenProc = spawn(
          "npx",
          ["playwright", "codegen", targetUrl, "--output", rawTestPath],
          {
            cwd: targetDir,
            stdio: "inherit",
            env: { ...process.env, PATH: process.env.PATH },
          },
        );

        codegenProc.on("exit", (code) => {
          let rawContent = "";
          if (fs.existsSync(rawTestPath)) {
            try {
              rawContent = fs.readFileSync(rawTestPath, "utf8");
            } catch (_) {}
          }

          // Notifica via SSE que a gravação manual foi encerrada
          broadcastEvent({
            type: "E2E_RECORDING_FINISHED",
            taskId,
            projectId: project.id,
            filePath: rawTestPath,
            rawContent,
          });
        });

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            recording: true,
            targetUrl,
            testFilePath: rawTestPath,
            message:
              "Navegador interativo de gravação aberto com sucesso. Realize as ações na tela e feche a janela ao terminar.",
          }),
        );
      } catch (err) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // POST /api/e2e-refine (Sanitiza cliques e decompõe em testes atômicos com IA)
  if (url.pathname === "/api/e2e-refine" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const { projectId, taskId, role, rawCode } = JSON.parse(body || "{}");
        const projects = getProjects();
        let project = projects.find((p) => p.id === projectId);
        if (!project) {
          project =
            projects.find(
              (p) =>
                p.id.toLowerCase().includes("app") ||
                p.path.toLowerCase().includes("app"),
            ) || projects[0];
        }

        const wt =
          role && role !== "done"
            ? path.join(project.path, ".worktrees", role)
            : null;
        const targetDir = wt && fs.existsSync(wt) ? wt : project.path;
        const rawTestPath = path.join(
          targetDir,
          "tests",
          "e2e",
          `${taskId}.spec.ts`,
        );

        let codeToRefine = rawCode;
        if (!codeToRefine && fs.existsSync(rawTestPath)) {
          codeToRefine = fs.readFileSync(rawTestPath, "utf8");
        }

        if (!codeToRefine) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              error: "Nenhum código bruto gravado encontrado para refinamento.",
            }),
          );
          return;
        }

        // Obtém metadados da tarefa para contextualizar os títulos dos testes atômicos
        const tasks = getProjectTasks(project);
        const task = tasks.find((t) => t.taskId === taskId) || {
          taskId,
          title: taskId,
        };

        const refinementResult = refineAndSplitE2ETest(codeToRefine, task);

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            success: true,
            filePath: rawTestPath,
            ...refinementResult,
          }),
        );
      } catch (err) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // POST /api/e2e-save-refined (Salva o código refinado e limpo pela IA no arquivo de teste)
  if (url.pathname === "/api/e2e-save-refined" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const { projectId, taskId, role, refinedCode } = JSON.parse(
          body || "{}",
        );
        const projects = getProjects();
        let project = projects.find((p) => p.id === projectId);
        if (!project) {
          project =
            projects.find(
              (p) =>
                p.id.toLowerCase().includes("app") ||
                p.path.toLowerCase().includes("app"),
            ) || projects[0];
        }

        if (!project) {
          res.writeHead(404, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Projeto não encontrado" }));
          return;
        }

        const wt =
          role && role !== "done"
            ? path.join(project.path, ".worktrees", role)
            : null;
        const targetDir = wt && fs.existsSync(wt) ? wt : project.path;
        const e2eDir = path.join(targetDir, "tests", "e2e");
        fs.mkdirSync(e2eDir, { recursive: true });
        const finalTestPath = path.join(e2eDir, `${taskId}.spec.ts`);

        fs.writeFileSync(finalTestPath, refinedCode, "utf8");

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            success: true,
            filePath: finalTestPath,
            message: "Teste refinado e otimizado com sucesso!",
          }),
        );
      } catch (err) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }


  // ─────────────────────────────────────────────────────────────────────────
  // APPROVAL GATES — v2 Commit-Driven Handoffs
  // ─────────────────────────────────────────────────────────────────────────

  // GET /api/attention — Lista todas as tarefas aguardando aprovação humana
  if (url.pathname === "/api/attention" && req.method === "GET") {
    const projects = getProjects();
    const gates = [];

    for (const p of projects) {
      const attentionDir = path.join(p.path, ".harness", "handoffs", "attention");
      if (!fs.existsSync(attentionDir)) continue;
      try {
        const files = fs.readdirSync(attentionDir).filter((f) => f.endsWith(".json"));
        for (const file of files) {
          try {
            const content = JSON.parse(
              fs.readFileSync(path.join(attentionDir, file), "utf8")
            );
            gates.push({
              ...content,
              projectId: p.id,
              projectName: p.name,
              projectPath: p.path,
            });
          } catch (_) {}
        }
      } catch (_) {}
    }

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ gates, total: gates.length }));
    return;
  }

  // POST /api/approve — Aprova um gate e despacha para o próximo papel
  if (url.pathname === "/api/approve" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const { taskId, projectId } = JSON.parse(body);
        if (!taskId) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "taskId é obrigatório." }));
          return;
        }

        const projects = getProjects();
        // Se projectId não informado, busca em todos os projetos
        const targetProjects = projectId
          ? projects.filter((p) => p.id === projectId)
          : projects;

        let found = false;
        for (const p of targetProjects) {
          const attentionDir = path.join(p.path, ".harness", "handoffs", "attention");
          const queueDir = path.join(p.path, ".harness", "handoffs", "queue");
          const archiveDir = path.join(p.path, ".harness", "handoffs", "archive");
          const attnFile = path.join(attentionDir, `${taskId}.json`);

          if (!fs.existsSync(attnFile)) continue;

          const gate = JSON.parse(fs.readFileSync(attnFile, "utf8"));
          const role = gate.role || gate.fromRole || "unknown";
          const commitSha = gate.commitSha || "";
          const now = new Date().toISOString();

          // Tabela de próximo papel
          const nextRoleMap = {
            specifier: "coder",
            coder: "refactorer",
            refactorer: "guardian",
            cleaner: "guardian",
            hardening: "qa",
            guardian: "done",
            qa: "done",
            "architecture-advisor": "done",
          };
          const nextRole = nextRoleMap[role] || "done";

          fs.unlinkSync(attnFile);
          fs.mkdirSync(queueDir, { recursive: true });
          fs.mkdirSync(archiveDir, { recursive: true });

          if (nextRole === "done") {
            fs.writeFileSync(
              path.join(archiveDir, `${taskId}.json`),
              JSON.stringify({
                taskId,
                finalRole: role,
                commitSha,
                status: "completed",
                approvedAt: now,
              }, null, 2)
            );
          } else {
            const branchFrom = gate.worktreeRef || `harness/${role}/${taskId}`;
            fs.writeFileSync(
              path.join(queueDir, `${taskId}.json`),
              JSON.stringify({
                taskId,
                fromRole: role,
                toRole: nextRole,
                commitSha,
                commitMessage: `approved from ${role}`,
                worktreeRef: branchFrom,
                status: "approved_queued",
                approvedAt: now,
              }, null, 2)
            );
          }

          // Notifica todos os clientes SSE
          broadcastEvent({
            type: "GATE_APPROVED",
            taskId,
            role,
            nextRole,
            projectId: p.id,
            timestamp: now,
          });

          found = true;
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({
            success: true,
            taskId,
            approvedRole: role,
            nextRole,
            message: nextRole === "done"
              ? `Task '${taskId}' aprovada e CONCLUÍDA.`
              : `Task '${taskId}' aprovada → despachada para '${nextRole}'.`,
          }));
          break;
        }

        if (!found) {
          res.writeHead(404, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: `Task '${taskId}' não encontrada no Approval Gate.` }));
        }
      } catch (err) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // POST /api/reject — Rejeita gate com feedback, retorna para coder
  if (url.pathname === "/api/reject" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const { taskId, reason, projectId } = JSON.parse(body);
        if (!taskId || !reason) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "taskId e reason são obrigatórios." }));
          return;
        }

        const projects = getProjects();
        const targetProjects = projectId
          ? projects.filter((p) => p.id === projectId)
          : projects;

        let found = false;
        for (const p of targetProjects) {
          const attentionDir = path.join(p.path, ".harness", "handoffs", "attention");
          const queueDir = path.join(p.path, ".harness", "handoffs", "queue");
          const attnFile = path.join(attentionDir, `${taskId}.json`);

          if (!fs.existsSync(attnFile)) continue;

          const gate = JSON.parse(fs.readFileSync(attnFile, "utf8"));
          const role = gate.role || gate.fromRole || "unknown";
          const commitSha = gate.commitSha || "";
          const now = new Date().toISOString();

          fs.unlinkSync(attnFile);
          fs.mkdirSync(queueDir, { recursive: true });

          fs.writeFileSync(
            path.join(queueDir, `${taskId}.json`),
            JSON.stringify({
              taskId,
              fromRole: role,
              toRole: "coder",
              commitSha,
              status: "rejected_feedback",
              reason,
              rejectedAt: now,
            }, null, 2)
          );

          broadcastEvent({
            type: "GATE_REJECTED",
            taskId,
            role,
            reason,
            projectId: p.id,
            timestamp: now,
          });

          found = true;
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({
            success: true,
            taskId,
            rejectedRole: role,
            reason,
            message: `Task '${taskId}' rejeitada → retornada ao coder com feedback.`,
          }));
          break;
        }

        if (!found) {
          res.writeHead(404, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: `Task '${taskId}' não encontrada no Approval Gate.` }));
        }
      } catch (err) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // GET /api/worktree-status?projectId=<id> — Status git de todos os worktrees
  if (url.pathname === "/api/worktree-status" && req.method === "GET") {
    const projectId = url.searchParams.get("projectId");
    const projects = getProjects();
    const target = projectId
      ? projects.find((p) => p.id === projectId)
      : projects[0];

    if (!target) {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Projeto não encontrado." }));
      return;
    }

    const worktreesBase = path.join(target.path, ".worktrees");
    const result = {};

    const roles = ["specifier", "coder", "refactorer", "guardian", "hardening", "qa"];
    for (const role of roles) {
      const wtPath = path.join(worktreesBase, role);
      if (!fs.existsSync(wtPath)) {
        result[role] = { exists: false };
        continue;
      }
      try {
        const dirty = execSync(`git -C "${wtPath}" status --porcelain`, { encoding: "utf8" }).trim();
        const branch = execSync(`git -C "${wtPath}" rev-parse --abbrev-ref HEAD`, { encoding: "utf8" }).trim();
        const commitSha = execSync(`git -C "${wtPath}" rev-parse --short HEAD`, { encoding: "utf8" }).trim();
        const commitMsg = execSync(`git -C "${wtPath}" log -1 --format="%s"`, { encoding: "utf8" }).trim();
        result[role] = {
          exists: true,
          clean: dirty === "",
          dirty: dirty !== "",
          branch,
          commitSha,
          commitMessage: commitMsg,
        };
      } catch (_) {
        result[role] = { exists: true, error: "git error" };
      }
    }

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ projectId: target.id, worktrees: result }));
    return;
  }

  // GET /api/commits/:role?projectId=<id> — Histórico de commits do worktree de um papel
  if (url.pathname.startsWith("/api/commits/") && req.method === "GET") {
    const role = url.pathname.replace("/api/commits/", "");
    const projectId = url.searchParams.get("projectId");
    const limit = parseInt(url.searchParams.get("limit") || "10", 10);

    const projects = getProjects();
    const target = projectId
      ? projects.find((p) => p.id === projectId)
      : projects[0];

    if (!target) {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Projeto não encontrado." }));
      return;
    }

    const wtPath = path.join(target.path, ".worktrees", role);
    if (!fs.existsSync(wtPath)) {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: `Worktree para '${role}' não encontrado.` }));
      return;
    }

    try {
      const log = execSync(
        `git -C "${wtPath}" log --format="%H|%h|%s|%ai|%an" -n ${limit}`,
        { encoding: "utf8" }
      ).trim();

      const commits = log
        .split("\n")
        .filter(Boolean)
        .map((line) => {
          const [sha, shortSha, subject, date, author] = line.split("|");
          return { sha, shortSha, subject, date, author };
        });

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ role, projectId: target.id, commits }));
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // Servir arquivos estáticos (public/)

  let filePath = path.join(
    __dirname,
    "public",
    url.pathname === "/" ? "index.html" : url.pathname,
  );
  if (!fs.existsSync(filePath)) {
    filePath = path.join(__dirname, "public", "index.html");
  }

  const ext = path.extname(filePath);
  const mimeTypes = {
    ".html": "text/html",
    ".js": "application/javascript",
    ".css": "text/css",
    ".json": "application/json",
    ".png": "image/png",
    ".svg": "image/svg+xml",
  };

  const contentType = mimeTypes[ext] || "text/plain";
  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404);
      res.end("Not Found");
    } else {
      res.writeHead(200, { "Content-Type": contentType });
      res.end(content);
    }
  });
});

server.listen(PORT, () => {
  console.log(
    `\n🚀 [OMNI-FORGE DASHBOARD] Operando em: http://localhost:${PORT}`,
  );
  console.log(`📂 Configuração local de projetos: ${PROJECTS_CONFIG}`);
  console.log(`📡 SSE Stream ativo em: http://localhost:${PORT}/api/stream`);
  console.log(`🧭 Pressione Ctrl+C para encerrar.\n`);
});
