/**
 * Diagnostica (e opcionalmente corrige) a conexão do agente com o PostgreSQL do Docker.
 *
 *   npm run db:diagnostico              # só mostra o diagnóstico
 *   npm run db:diagnostico -- --corrigir   # também ajusta o .env
 *
 * Usa como referência as credenciais com que a própria Evolution API se conecta ao banco
 * (variável DATABASE_CONNECTION_URI dentro do container), que comprovadamente funcionam.
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { PrismaClient } = require('@prisma/client');

const FIX = process.argv.includes('--corrigir');
const ENV_PATH = path.resolve('.env');
const isWindows = process.platform === 'win32';

const ok = (msg) => console.log(`  ✅ ${msg}`);
const bad = (msg) => console.log(`  ❌ ${msg}`);
const info = (msg) => console.log(`  ℹ️  ${msg}`);
const title = (msg) => console.log(`\n${msg}`);

function run(cmd, args) {
  try {
    return execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  } catch {
    return null;
  }
}

function parseUrl(value) {
  try {
    const url = new URL(value);
    if (!/^postgres(ql)?:$/.test(url.protocol)) return null;
    return url;
  } catch {
    return null;
  }
}

const mask = (url) => {
  const copy = new URL(url.toString());
  if (copy.password) copy.password = '****';
  return copy.toString();
};

/** Monta uma URL para o banco "postgres" (sempre existe), para testar só as credenciais. */
function credentialsUrl({ user, password, host, port }) {
  const url = new URL('postgresql://localhost');
  url.username = user;
  url.password = password;
  url.hostname = host;
  url.port = String(port);
  url.pathname = '/postgres';
  return url.toString();
}

/** Tenta conectar. Retorna { ok, version } ou { ok: false, code, message }. */
async function tryConnect(url) {
  const prisma = new PrismaClient({ datasourceUrl: url, log: [] });
  try {
    const [row] = await prisma.$queryRawUnsafe('SELECT version() AS version');
    return { ok: true, version: row.version };
  } catch (err) {
    const lines = err.message.split('\n').map((l) => l.trim()).filter(Boolean);
    const message = lines.find((l) => /authentication|can't reach|does not exist|denied|timed out/i.test(l)) || lines.pop();
    return { ok: false, code: err.errorCode || (err.message.match(/P\d{4}/) || [])[0] || '', message };
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

/** Processos escutando na porta TCP (só Windows). */
function windowsListeners(port) {
  const out = run('netstat', ['-ano', '-p', 'TCP']);
  if (!out) return [];
  const pids = new Set();
  for (const line of out.split(/\r?\n/)) {
    const cols = line.trim().split(/\s+/);
    if (cols[0] === 'TCP' && cols[1]?.endsWith(`:${port}`) && /LISTEN/i.test(cols[3] || '')) pids.add(cols[4]);
  }
  return [...pids].map((pid) => {
    const csv = run('tasklist', ['/FI', `PID eq ${pid}`, '/FO', 'CSV', '/NH']) || '';
    return { pid, name: (csv.match(/^"([^"]+)"/) || [])[1] || 'desconhecido' };
  });
}

/** Atualiza (ou acrescenta) variáveis no .env preservando o resto e as quebras de linha. */
function updateEnv(vars) {
  let content = fs.existsSync(ENV_PATH) ? fs.readFileSync(ENV_PATH, 'utf8') : '';
  const eol = content.includes('\r\n') ? '\r\n' : '\n';
  for (const [key, value] of Object.entries(vars)) {
    const line = `${key}=${value}`;
    const re = new RegExp(`^${key}=.*$`, 'm');
    content = re.test(content) ? content.replace(re, line) : `${content.replace(/\s*$/, '')}${eol}${line}${eol}`;
  }
  fs.copyFileSync(ENV_PATH, `${ENV_PATH}.bak`);
  fs.writeFileSync(ENV_PATH, content);
}

(async () => {
  console.log('🔎 Diagnóstico da conexão com o PostgreSQL');

  // 1) DATABASE_URL --------------------------------------------------------
  title('1. DATABASE_URL do .env');
  const dbUrl = parseUrl(process.env.DATABASE_URL);
  if (!dbUrl) {
    bad('DATABASE_URL ausente ou inválida no .env.');
    process.exitCode = 1;
    return;
  }
  const target = {
    user: decodeURIComponent(dbUrl.username),
    password: decodeURIComponent(dbUrl.password),
    host: dbUrl.hostname,
    port: Number(dbUrl.port) || 5432,
    database: dbUrl.pathname.slice(1) || 'postgres',
  };
  info(mask(dbUrl));

  // 2) Containers ----------------------------------------------------------
  title('2. Containers do Docker');
  const ps = run('docker', ['ps', '--format', '{{.Names}}|{{.Image}}|{{.Ports}}']);
  let evoCreds = null;
  let pgContainer = null;
  if (ps === null) {
    bad('Não consegui falar com o Docker. O Docker Desktop está aberto?');
  } else {
    const containers = ps.split(/\r?\n/).filter(Boolean).map((l) => {
      const [name, image, ports] = l.split('|');
      return { name, image, ports: ports || '' };
    });
    pgContainer = containers.find((c) => /(^|\/)postgres(:|$)/.test(c.image));
    const evo = containers.find((c) => /evolution-api/.test(c.image));

    if (!pgContainer) bad('Nenhum container do PostgreSQL rodando. Rode: docker compose up -d');
    else if (!new RegExp(`:${target.port}->5432`).test(pgContainer.ports)) {
      bad(`PostgreSQL "${pgContainer.name}" (${pgContainer.image}) NÃO está publicado na porta ${target.port} do Windows.`);
      info(`Portas atuais: ${pgContainer.ports || '(nenhuma)'} — rode "docker compose up -d" para recriá-lo com a porta.`);
    } else ok(`PostgreSQL "${pgContainer.name}" (${pgContainer.image}) publicado: ${pgContainer.ports}`);

    if (!evo) info('Container da Evolution não encontrado (não dá para ler as credenciais dela).');
    else {
      const uri = parseUrl(run('docker', ['exec', evo.name, 'printenv', 'DATABASE_CONNECTION_URI']) || '');
      if (uri) {
        evoCreds = { user: decodeURIComponent(uri.username), password: decodeURIComponent(uri.password) };
        ok(`Evolution "${evo.name}" conecta como usuário "${evoCreds.user}" (senha lida do container).`);
        if (evoCreds.user !== target.user || evoCreds.password !== target.password) {
          bad('As credenciais da DATABASE_URL são DIFERENTES das que a Evolution usa.');
        } else ok('A DATABASE_URL usa o mesmo usuário e senha da Evolution.');
      } else info(`Não consegui ler DATABASE_CONNECTION_URI do container "${evo.name}".`);
    }
  }

  // 3) Quem está na porta ------------------------------------------------------
  if (isWindows) {
    title(`3. Programas escutando na porta ${target.port}`);
    const listeners = windowsListeners(target.port);
    if (!listeners.length) info('Ninguém escutando (ou sem permissão para ver).');
    for (const l of listeners) {
      const native = /^postgres/i.test(l.name);
      (native ? bad : info)(`PID ${l.pid}: ${l.name}${native ? '  ← PostgreSQL instalado no Windows!' : ''}`);
    }
  }

  // 4) Testes de autenticação ------------------------------------------------------
  title(`4. Testes de login em ${target.host}:${target.port}`);
  const hosts = target.host === 'localhost' ? ['localhost', '127.0.0.1'] : [target.host];
  const results = {};
  for (const host of hosts) {
    const r = await tryConnect(credentialsUrl({ ...target, host }));
    results[`env@${host}`] = r;
    if (r.ok) ok(`Credenciais da DATABASE_URL em ${host}: OK`);
    else bad(`Credenciais da DATABASE_URL em ${host}: ${[r.code, r.message].filter(Boolean).join(' ')}`);
  }
  if (evoCreds && (evoCreds.user !== target.user || evoCreds.password !== target.password)) {
    for (const host of hosts) {
      const r = await tryConnect(credentialsUrl({ ...target, ...evoCreds, host }));
      results[`evo@${host}`] = r;
      if (r.ok) ok(`Credenciais da Evolution em ${host}: OK`);
      else bad(`Credenciais da Evolution em ${host}: ${[r.code, r.message].filter(Boolean).join(' ')}`);
    }
  }
  const anyOk = Object.values(results).find((r) => r.ok);
  if (anyOk) {
    const native = /visual c\+\+|windows/i.test(anyOk.version);
    info(`Servidor que respondeu: ${anyOk.version.split(',')[0]}${native ? '  ← é o PostgreSQL do WINDOWS, não o do Docker' : ''}`);
  }

  // 5) Conclusão e correção ----------------------------------------------------------
  title('5. Conclusão');
  const workingHost = hosts.find((h) => results[`env@${h}`]?.ok);
  const evoHost = hosts.find((h) => results[`evo@${h}`]?.ok);

  if (workingHost) {
    ok('As credenciais estão corretas. Rode: npm run db:migrate');
    if (workingHost !== target.host && FIX) {
      dbUrl.hostname = workingHost;
      updateEnv({ DATABASE_URL: dbUrl.toString() });
      ok(`.env atualizado: host trocado para ${workingHost} (backup em .env.bak).`);
    } else if (workingHost !== target.host) {
      info(`Funciona só com ${workingHost}. Rode com --corrigir para ajustar o .env.`);
    }
    return;
  }

  if (evoHost) {
    bad('Causa: a senha da DATABASE_URL não é a senha real do banco (o PostgreSQL só usa');
    console.log('     POSTGRES_PASSWORD na PRIMEIRA criação do volume; mudar o .env depois não altera a senha).');
    if (FIX) {
      dbUrl.hostname = evoHost;
      dbUrl.username = encodeURIComponent(evoCreds.user);
      dbUrl.password = encodeURIComponent(evoCreds.password);
      updateEnv({ DATABASE_URL: dbUrl.toString(), EVOLUTION_DB_PASSWORD: evoCreds.password });
      ok('.env corrigido com as credenciais reais (DATABASE_URL e EVOLUTION_DB_PASSWORD). Backup em .env.bak.');
      ok('Agora rode: npm run db:migrate');
    } else {
      info('Rode "npm run db:diagnostico -- --corrigir" para corrigir o .env automaticamente.');
    }
    return;
  }

  const listeners = isWindows ? windowsListeners(target.port) : [];
  if (listeners.some((l) => /^postgres/i.test(l.name))) {
    bad(`Causa: um PostgreSQL instalado no Windows ocupa a porta ${target.port}; o "localhost" chega nele, não no Docker.`);
    info('Solução: publicar o PostgreSQL do Docker na porta 5433.');
    if (FIX) {
      dbUrl.hostname = '127.0.0.1';
      dbUrl.port = '5433';
      if (evoCreds) {
        dbUrl.username = encodeURIComponent(evoCreds.user);
        dbUrl.password = encodeURIComponent(evoCreds.password);
      }
      updateEnv({ POSTGRES_HOST_PORT: '5433', DATABASE_URL: dbUrl.toString() });
      ok('.env atualizado (POSTGRES_HOST_PORT=5433 e DATABASE_URL). Backup em .env.bak.');
      ok('Agora rode: docker compose up -d   e depois   npm run db:migrate');
    } else {
      info('Rode "npm run db:diagnostico -- --corrigir" para ajustar o .env automaticamente.');
    }
    return;
  }

  bad('Não foi possível identificar a causa automaticamente.');
  if (pgContainer) {
    info('Último recurso: redefinir a senha do usuário dentro do container (afeta também a Evolution):');
    console.log(`     docker exec -it ${pgContainer.name} psql -U ${target.user} -d postgres -c "ALTER USER ${target.user} PASSWORD 'NOVA_SENHA';"`);
    console.log('     e então use NOVA_SENHA em EVOLUTION_DB_PASSWORD e na DATABASE_URL, seguido de "docker compose up -d".');
  }
  process.exitCode = 1;
})().catch((err) => {
  console.error('❌ Erro no diagnóstico:', err.message);
  process.exitCode = 1;
});
