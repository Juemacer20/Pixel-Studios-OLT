# Enriquecimiento de info de ONTs — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que la plataforma traiga y persista toda la información que la OLT tiene cargada de cada ONT (ubicación física, modelo, firmware, perfiles, VLAN, distancia, última caída), sin frenar el scan rápido ni saturar las VTY.

**Architecture:** Híbrido. (1) El scan rápido pasa a persistir la ubicación física (`board`/`port`/`onu_id`) que hoy se descarta. (2) Un job Bull repetible e incremental (`enrichOnts`) toma lotes chicos de ONTs sin enriquecer, abre **una** sesión telnet por OLT (read-only), parsea `display ont detail-info` + `display ont version`, y guarda. Más un endpoint manual para forzar una OLT.

**Tech Stack:** Node.js 20, Express, Prisma 5 (PostgreSQL), Bull (Redis), Jest. Adapter Huawei MA5800 vía Telnet raw socket.

---

## File Structure

- `backend/src/services/huawei/ma5800.js` — adapter: nuevos `_parseOntDetailInfo`, `_parseOntVersion`, `getOntDetailInfoBatch`.
- `backend/src/services/huawei/__fixtures__/` — capturas reales de salida de la OLT (calibración).
- `backend/src/services/huawei/__tests__/parsers.test.js` — tests de parsers (puros).
- `backend/src/services/oltService.js` — `scanOLTOnts` persiste `board`/`port`/`onu_id`.
- `backend/src/services/enrichmentService.js` — selección de lote, agrupar por OLT, persistir.
- `backend/src/services/__tests__/enrichmentService.test.js` — test de `groupOntsByOlt`.
- `backend/src/jobs/enrichOnts.js` — job Bull repetible + cola + processor.
- `backend/src/server.js` — arrancar el job.
- `backend/src/routes/olts.js` — endpoint `POST /:id/enrich`.
- `backend/prisma/schema.prisma` + `backend/prisma/migrations/<ts>_ont_enrichment/` — 4 campos nuevos.
- `frontend/src/pages/ONUView/index.jsx` — mostrar campos nuevos.

---

## Task 1: Capturar salida real de una ONT (calibración, read-only) — ✅ HECHA

> **YA EJECUTADA.** Las OLTs son alcanzables directo por telnet desde la PC de dev, así que la
> captura se hizo localmente (read-only, idéntica a hacerla en el server). Fixtures sanitizados
> (PII de cliente redactada) commiteados en `backend/src/services/huawei/__fixtures__/`:
> `ont-info-8_50.txt`, `ont-version-8_50.txt`, `ont-info-43_25.txt`, `ont-version-43_25.txt`.
> **Hallazgo de calibración:** el comando de detalle es `display ont info <port> <id>` (no
> `display ont detail-info`, inexistente en V3R017). Pasos originales abajo (referencia):

**Files:**
- Create: `backend/src/services/huawei/__fixtures__/ont-detail-info.txt`
- Create: `backend/src/services/huawei/__fixtures__/ont-version.txt`

- [ ] **Step 1: Conectarse por telnet a una OLT y capturar el detalle de UNA ONT existente**

Elegí una ONT online conocida (board/port/onu_id). Ejemplo para Itelsa-Huawei (10.200.8.50),
ONT en 0/2 puerto 1 id 12. Comandos (todos `display`, read-only):

```
telnet 10.200.8.50
  User name: smartolt
  User password: a10smartolt%
enable
config
interface gpon 0/2
display ont detail-info 1 12
display ont version 1 12
quit
```

- [ ] **Step 2: Guardar las salidas crudas como fixtures**

Pegá la salida de `display ont detail-info 1 12` en `__fixtures__/ont-detail-info.txt` y la de
`display ont version 1 12` en `__fixtures__/ont-version.txt`, tal cual (con encabezados/guiones).

- [ ] **Step 3 (recomendado): Capturar una segunda ONT de OTRA OLT con firmware distinto**

Repetí en una OLT de otra versión (ej. Feliciano 10.200.173.25) y guardá como
`ont-detail-info-2.txt` / `ont-version-2.txt`. Sirve para que el parser sea robusto a variantes.

- [ ] **Step 4: Commit**

```bash
git add backend/src/services/huawei/__fixtures__/
git commit -m "test(huawei): fixtures reales de display ont detail-info/version para calibrar parser"
```

---

## Task 2: Configurar Jest

**Files:**
- Modify: `backend/package.json` (scripts)
- Create: `backend/src/services/huawei/__tests__/sanity.test.js`

- [ ] **Step 1: Agregar el script de test**

En `backend/package.json`, dentro de `"scripts"`, agregar:

```json
"test": "jest",
"test:watch": "jest --watch"
```

- [ ] **Step 2: Test de sanidad**

`backend/src/services/huawei/__tests__/sanity.test.js`:

```js
test('jest corre', () => {
  expect(1 + 1).toBe(2);
});
```

- [ ] **Step 3: Correr y verificar PASS**

Run: `cd backend && npx jest sanity -v`
Expected: PASS (1 test).

- [ ] **Step 4: Commit**

```bash
git add backend/package.json backend/src/services/huawei/__tests__/sanity.test.js
git commit -m "chore(test): configurar jest"
```

---

## Task 3: Migración de schema — 4 campos nuevos en ONT

**Files:**
- Modify: `backend/prisma/schema.prisma` (model ONT)
- Create: `backend/prisma/migrations/<timestamp>_ont_enrichment/migration.sql`

- [ ] **Step 1: Agregar los campos al modelo**

En `backend/prisma/schema.prisma`, dentro de `model ONT`, después de `odb String?` agregar:

```prisma
  enriched_at          DateTime?
  last_down_cause      String?
  line_profile         String?
  srv_profile          String?
```

- [ ] **Step 2: Generar la migración de forma NO interactiva**

```bash
cd backend
TS=$(date +%Y%m%d%H%M%S)
mkdir -p prisma/migrations/${TS}_ont_enrichment
npx prisma migrate diff \
  --from-url "$DATABASE_URL" \
  --to-schema-datamodel prisma/schema.prisma \
  --script > prisma/migrations/${TS}_ont_enrichment/migration.sql
cat prisma/migrations/${TS}_ont_enrichment/migration.sql
```

Expected: SQL con `ALTER TABLE "onts" ADD COLUMN "enriched_at" ...` (4 columnas, todas nullable).

- [ ] **Step 3: Aplicar y regenerar el cliente**

```bash
npx prisma migrate deploy
npx prisma generate
```

Expected: "migration applied" + cliente regenerado, sin pérdida de datos.

- [ ] **Step 4: Commit**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations/
git commit -m "feat(db): campos de enriquecimiento en ONT (enriched_at, last_down_cause, line/srv_profile)"
```

---

## Task 4: Persistir board/port/onu_id en el scan

**Files:**
- Modify: `backend/src/services/oltService.js` (`scanOLTOnts`, paths create y update)

- [ ] **Step 1: Mapear ubicación física en el create**

En `backend/src/services/oltService.js`, en `scanOLTOnts`, dentro del `prisma.oNT.create({ data: {...} })`
(rama `else` de ONT nueva), agregar después de `protocol: 'GPON',`:

```js
            board: ont.slot ?? null,
            port: ont.pon_port ?? null,
            onu_id: ont.onu_id ?? null,
```

- [ ] **Step 2: Mapear ubicación física en el update**

En el `prisma.oNT.update({ ... data: {...} })` de ONT existente, agregar después de `last_seen: new Date(),`:

```js
          board: ont.slot ?? undefined,
          port: ont.pon_port ?? undefined,
          onu_id: ont.onu_id ?? undefined,
```

- [ ] **Step 3: Verificar que el scan sigue compilando**

Run: `cd backend && node -e "require('./src/services/oltService.js'); console.log('ok')"`
Expected: `ok` (sin errores de sintaxis).

- [ ] **Step 4: Commit**

```bash
git add backend/src/services/oltService.js
git commit -m "feat(scan): persistir ubicación física board/port/onu_id de cada ONT"
```

---

## Task 5: Parser `_parseOntDetailInfo` (TDD)

> **CALIBRADO contra fixtures reales (Task 1 ya ejecutada).** El comando de detalle por ONT en
> el firmware de estas OLTs (V3R017C10S125) es **`display ont info <port> <id>`** — NO existe
> `display ont detail-info`. El bloque viene "Clave : valor" por línea (multipágina). VLAN y
> Description NO se parsean acá: VLAN no aparece como número simple (vive en service-port) y
> Description ya la trae el scan por SNMP (y viene multilínea). Fixtures: `ont-info-8_50.txt`
> (modelo IC485WRF) y `ont-info-43_25.txt` (modelo HG8546M, `Last down cause: -`).

**Files:**
- Modify: `backend/src/services/huawei/ma5800.js` (nuevo método de instancia `_parseOntDetailInfo`)
- Create/Modify: `backend/src/services/huawei/__tests__/parsers.test.js`

- [ ] **Step 1: Escribir el test que falla**

`backend/src/services/huawei/__tests__/parsers.test.js`:

```js
const fs = require('fs');
const path = require('path');
const MA5800 = require('../ma5800');

const fixture = (f) => fs.readFileSync(path.join(__dirname, '../__fixtures__', f), 'utf8');

describe('_parseOntDetailInfo', () => {
  const adapter = new MA5800({ ip: '10.0.0.1', name: 'test' });

  test('extrae distancia, perfiles, última caída, mgmt y estados (fixture 8_50)', () => {
    const r = adapter._parseOntDetailInfo(fixture('ont-info-8_50.txt'));
    expect(r.distance).toBe(3611);
    expect(r.line_profile).toBe('SMARTOLT_FLEXIBLE_GPON');
    expect(r.srv_profile).toBe('IC485WRF');
    expect(r.last_down_cause).toBe('LOSi/LOBi');
    expect(r.configuration_method).toBe('OMCI');
    expect(r.config_state).toBe('normal');
    expect(r.match_state).toBe('match');
  });

  test('"Last down cause: -" se normaliza a undefined (fixture 43_25)', () => {
    const r = adapter._parseOntDetailInfo(fixture('ont-info-43_25.txt'));
    expect(r.distance).toBe(1185);
    expect(r.srv_profile).toBe('HG8546M');
    expect(r.last_down_cause).toBeUndefined();
  });
});
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `cd backend && npx jest parsers -v`
Expected: FAIL ("adapter._parseOntDetailInfo is not a function").

- [ ] **Step 3: Implementar el parser**

En `backend/src/services/huawei/ma5800.js`, agregar dentro de la clase `MA5800`:

```js
  /**
   * Parsea la salida de `display ont info <port> <id>` (bloque detallado, "Clave : valor"
   * por línea, multipágina). Cada campo es best-effort: devuelve undefined si no aparece.
   * VLAN/Description no se extraen acá (ver nota del plan, Task 5).
   */
  _parseOntDetailInfo(raw) {
    const grab = (label) => {
      // Coincide "  <label> ...  : <valor>" hasta fin de línea
      const re = new RegExp(`^\\s*${label}[^:\\n]*:\\s*(.+?)\\s*$`, 'im');
      const m = raw.match(re);
      return m ? m[1].trim() : undefined;
    };
    const num = (v) => (v != null && /-?\d+/.test(v) ? parseInt(v.match(/-?\d+/)[0], 10) : undefined);
    const clean = (v) => (v && !/^(-|none|na)$/i.test(v) ? v : undefined);

    return {
      distance: num(grab('ONT distance')),
      line_profile: clean(grab('Line profile name')),
      srv_profile: clean(grab('Service profile name')),
      last_down_cause: clean(grab('Last down cause')),
      configuration_method: clean(grab('Management mode')), // OMCI / TR069
      config_state: clean(grab('Config state')),
      match_state: clean(grab('Match state')),
    };
  }
```

- [ ] **Step 4: Correr y verificar PASS**

Run: `cd backend && npx jest parsers -v`
Expected: PASS (ambos tests).

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/huawei/ma5800.js backend/src/services/huawei/__tests__/parsers.test.js
git commit -m "feat(huawei): parser de display ont info (detalle por ONT)"
```

---

## Task 6: Parser `_parseOntVersion` (TDD)

**Files:**
- Modify: `backend/src/services/huawei/ma5800.js` (`_parseOntVersion`)
- Modify: `backend/src/services/huawei/__tests__/parsers.test.js`

- [ ] **Step 1: Escribir el test que falla**

> Valores reales del fixture `ont-version-8_50.txt`: Equipment-ID=`IC485WRF`,
> Main Software Version=`V3R017C10S125`, ONT Version=`4B4.A`.

Agregar a `parsers.test.js`:

```js
describe('_parseOntVersion', () => {
  const adapter = new MA5800({ ip: '10.0.0.1', name: 'test' });

  test('extrae modelo (Equipment-ID), firmware y sw_version', () => {
    const r = adapter._parseOntVersion(fixture('ont-version-8_50.txt'));
    expect(r.model).toBe('IC485WRF');
    expect(r.firmware).toBe('V3R017C10S125');
    expect(r.sw_version).toBe('4B4.A');
  });
});
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `cd backend && npx jest parsers -v`
Expected: FAIL ("_parseOntVersion is not a function").

- [ ] **Step 3: Implementar**

En `ma5800.js`, dentro de la clase:

```js
  /** Parsea `display ont version <port> <id>`: Equipment-ID, Main Software Version, ONT Version. */
  _parseOntVersion(raw) {
    const grab = (label) => {
      const re = new RegExp(`^\\s*${label}[^:\\n]*:\\s*(.+?)\\s*$`, 'im');
      const m = raw.match(re);
      return m ? m[1].trim() : undefined;
    };
    return {
      model: grab('Equipment-ID'),
      firmware: grab('Main Software Version'),
      sw_version: grab('ONT Version'),
    };
  }
```

- [ ] **Step 4: Correr y verificar PASS**

Run: `cd backend && npx jest parsers -v`
Expected: PASS (ambos describe). Ajustar labels/valores al fixture real si hace falta.

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/huawei/ma5800.js backend/src/services/huawei/__tests__/parsers.test.js
git commit -m "feat(huawei): parser de display ont version (modelo/firmware)"
```

---

## Task 7: Adapter `getOntDetailInfoBatch(locations)`

> Abre UNA sesión telnet, agrupa por board, corre los dos `display` por ONT, parsea y mergea.
> Reutiliza `_session`/`withOltLock` existentes (read-only, sin `save`).

**Files:**
- Modify: `backend/src/services/huawei/ma5800.js`

- [ ] **Step 1: Implementar el método**

En `ma5800.js`, dentro de la clase (después de `getOntDetailInfo`/parsers):

```js
  /**
   * Trae el detalle de varias ONTs en UNA sesión telnet. `locations` es
   * [{ board, port, onu_id, serial_number }]. Devuelve la misma lista con los
   * campos parseados mergeados: { ...location, model, firmware, sw_version,
   * distance, line_profile, srv_profile, last_down_cause, configuration_method,
   * description, vlan }. Read-only (solo comandos `display`).
   */
  async getOntDetailInfoBatch(locations) {
    if (!Array.isArray(locations) || !locations.length) return [];
    return this._session(async (collect) => {
      const results = [];
      let currentBoard = null;
      // Ordenar por board para minimizar cambios de contexto interface
      const sorted = [...locations].sort((a, b) => (a.board - b.board) || (a.port - b.port));
      for (const loc of sorted) {
        if (loc.board == null || loc.port == null || loc.onu_id == null) continue;
        if (loc.board !== currentBoard) {
          if (currentBoard !== null) await collect('quit');
          await collect(`interface gpon 0/${loc.board}`);
          currentBoard = loc.board;
        }
        const detailRaw = await collect(`display ont info ${loc.port} ${loc.onu_id}`);
        const versionRaw = await collect(`display ont version ${loc.port} ${loc.onu_id}`);
        results.push({
          ...loc,
          ...this._parseOntDetailInfo(detailRaw),
          ...this._parseOntVersion(versionRaw),
        });
      }
      if (currentBoard !== null) await collect('quit');
      logger.info(`MA5800 getOntDetailInfoBatch ${this.olt.ip}: ${results.length} ONTs`);
      return results;
    });
  }
```

- [ ] **Step 2: Verificar que compila**

Run: `cd backend && node -e "const M=require('./src/services/huawei/ma5800.js'); console.log(typeof new M({ip:'1'}).getOntDetailInfoBatch)"`
Expected: `function`.

- [ ] **Step 3: Commit**

```bash
git add backend/src/services/huawei/ma5800.js
git commit -m "feat(huawei): getOntDetailInfoBatch — detalle de ONTs en una sesión telnet"
```

---

## Task 8: enrichmentService — selección de lote y persistencia

**Files:**
- Create: `backend/src/services/enrichmentService.js`
- Create: `backend/src/services/__tests__/enrichmentService.test.js`

- [ ] **Step 1: Test de `groupOntsByOlt` (función pura)**

`backend/src/services/__tests__/enrichmentService.test.js`:

```js
const { groupOntsByOlt } = require('../enrichmentService');

test('groupOntsByOlt agrupa por olt_id', () => {
  const onts = [
    { id: 'a', olt_id: 'o1' },
    { id: 'b', olt_id: 'o2' },
    { id: 'c', olt_id: 'o1' },
  ];
  const g = groupOntsByOlt(onts);
  expect([...g.keys()].sort()).toEqual(['o1', 'o2']);
  expect(g.get('o1').map((o) => o.id)).toEqual(['a', 'c']);
  expect(g.get('o2').map((o) => o.id)).toEqual(['b']);
});
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `cd backend && npx jest enrichmentService -v`
Expected: FAIL ("Cannot find module '../enrichmentService'").

- [ ] **Step 3: Implementar el servicio**

`backend/src/services/enrichmentService.js`:

```js
const prisma = require('../config/database');
const { getAdapter } = require('../utils/oltFactory');
const logger = require('../middleware/logger');

const STALE_DAYS = parseInt(process.env.ENRICH_STALE_DAYS) || 7;

/** Agrupa una lista de ONTs por su olt_id. Devuelve Map<olt_id, ONT[]>. */
function groupOntsByOlt(onts) {
  const g = new Map();
  for (const o of onts) {
    if (!g.has(o.olt_id)) g.set(o.olt_id, []);
    g.get(o.olt_id).push(o);
  }
  return g;
}

/**
 * Selecciona un lote de ONTs a enriquecer: sin `model` o con `enriched_at` viejo,
 * de OLTs Huawei ONLINE. `oltId` opcional fuerza una OLT (ignora enriched_at).
 */
async function selectBatch(batchSize, oltId = null) {
  const staleBefore = new Date(Date.now() - STALE_DAYS * 86400000);
  const oltWhere = oltId
    ? { id: oltId }
    : { status: 'ONLINE', brand: { contains: 'huawei', mode: 'insensitive' } };
  const olts = await prisma.oLT.findMany({ where: oltWhere, select: { id: true } });
  const oltIds = olts.map((o) => o.id);
  if (!oltIds.length) return [];

  return prisma.oNT.findMany({
    where: {
      olt_id: { in: oltIds },
      board: { not: null }, // necesitamos ubicación física (la deja el scan)
      ...(oltId ? {} : { OR: [{ model: null }, { enriched_at: null }, { enriched_at: { lt: staleBefore } }] }),
    },
    select: { id: true, olt_id: true, serial_number: true, board: true, port: true, onu_id: true, description: true },
    take: batchSize,
  });
}

/** Enriquece un lote ya seleccionado. Abre una sesión telnet por OLT. */
async function enrichBatch(batch) {
  const byOlt = groupOntsByOlt(batch);
  let updated = 0;
  for (const [oltId, onts] of byOlt) {
    const olt = await prisma.oLT.findUnique({ where: { id: oltId } });
    const adapter = getAdapter(olt);
    if (typeof adapter.getOntDetailInfoBatch !== 'function') continue; // VSOL/KingType: no-op
    let details = [];
    try {
      details = await adapter.getOntDetailInfoBatch(onts);
    } catch (e) {
      logger.warn(`enrichBatch ${olt.name}: ${e.message}`);
      // Marcar enriched_at igual para no reintentar en bucle hasta la ventana stale
      await prisma.oNT.updateMany({ where: { id: { in: onts.map((o) => o.id) } }, data: { enriched_at: new Date() } });
      continue;
    }
    const bySerial = new Map(details.map((d) => [d.serial_number, d]));
    for (const ont of onts) {
      const d = bySerial.get(ont.serial_number);
      const data = { enriched_at: new Date() };
      if (d) {
        for (const k of ['model', 'firmware', 'sw_version', 'distance', 'line_profile',
                         'srv_profile', 'last_down_cause', 'configuration_method']) {
          if (d[k] != null) data[k] = d[k];
        }
      }
      await prisma.oNT.update({ where: { id: ont.id }, data });
      updated++;
    }
    logger.info(`enrichBatch ${olt.name}: ${onts.length} ONTs procesadas`);
  }
  return updated;
}

module.exports = { groupOntsByOlt, selectBatch, enrichBatch };
```

- [ ] **Step 4: Correr y verificar PASS**

Run: `cd backend && npx jest enrichmentService -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/enrichmentService.js backend/src/services/__tests__/enrichmentService.test.js
git commit -m "feat(enrich): servicio de selección de lote y persistencia de detalle de ONTs"
```

---

## Task 9: Job Bull `enrichOnts` + registro + env

**Files:**
- Create: `backend/src/jobs/enrichOnts.js`
- Modify: `backend/src/server.js` (startJobs)
- Modify: `backend/.env.example`

- [ ] **Step 1: Crear el job**

`backend/src/jobs/enrichOnts.js`:

```js
const Bull = require('bull');
const { selectBatch, enrichBatch } = require('../services/enrichmentService');
const logger = require('../middleware/logger');

const queue = new Bull('enrich-onts', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
  },
});

queue.process(async (job) => {
  const batchSize = parseInt(process.env.ENRICH_BATCH_SIZE) || 50;
  const oltId = job.data && job.data.oltId ? job.data.oltId : null;
  const batch = await selectBatch(batchSize, oltId);
  if (!batch.length) return { updated: 0 };
  const updated = await enrichBatch(batch);
  logger.info(`enrichOnts: ${updated} ONTs enriquecidas${oltId ? ` (OLT ${oltId})` : ''}`);
  return { updated };
});

queue.on('failed', (job, err) => logger.error(`enrichOnts job failed: ${err.message}`));

/** Encola el enriquecimiento de una OLT puntual (ignora enriched_at). */
function enqueueOlt(oltId) {
  return queue.add({ oltId }, { removeOnComplete: 5, removeOnFail: 10 });
}

function startEnrichOnts() {
  const interval = parseInt(process.env.ENRICH_INTERVAL_MS) || 60000;
  queue.add({}, { repeat: { every: interval }, removeOnComplete: 5, removeOnFail: 10 });
  logger.info(`Enrich ONTs job started, interval=${interval}ms`);
}

module.exports = { startEnrichOnts, enqueueOlt, queue };
```

- [ ] **Step 2: Registrar en server.js**

En `backend/src/server.js`, dentro de `startJobs()`, junto a los otros require/start:

```js
    const { startEnrichOnts } = require('./jobs/enrichOnts');
```
y después de `startTrafficPoll();`:
```js
    startEnrichOnts();
```

- [ ] **Step 3: Documentar env**

En `backend/.env.example` agregar:

```
ENRICH_INTERVAL_MS=60000
ENRICH_BATCH_SIZE=50
ENRICH_STALE_DAYS=7
```

- [ ] **Step 4: Verificar que el server carga el job sin romper**

Run: `cd backend && node -e "require('./src/jobs/enrichOnts'); console.log('ok')"`
Expected: `ok`.

- [ ] **Step 5: Commit**

```bash
git add backend/src/jobs/enrichOnts.js backend/src/server.js backend/.env.example
git commit -m "feat(jobs): job Bull enrichOnts incremental + arranque + env"
```

---

## Task 10: Endpoint manual `POST /olts/:id/enrich`

**Files:**
- Modify: `backend/src/routes/olts.js`

- [ ] **Step 1: Agregar la ruta**

En `backend/src/routes/olts.js`, después de la línea de `router.post('/:id/scan', ...)`:

```js
router.post('/:id/enrich', checkRole('noc'), async (req, res, next) => {
  try {
    const { enqueueOlt } = require('../jobs/enrichOnts');
    await enqueueOlt(req.params.id);
    res.json({ data: { queued: true, oltId: req.params.id } });
  } catch (e) { next(e); }
});
```

- [ ] **Step 2: Verificar que el router compila**

Run: `cd backend && node -e "require('./src/routes/olts.js'); console.log('ok')"`
Expected: `ok`.

- [ ] **Step 3: Commit**

```bash
git add backend/src/routes/olts.js
git commit -m "feat(api): POST /olts/:id/enrich para forzar enriquecimiento de una OLT"
```

---

## Task 11: Frontend — mostrar los campos nuevos en ONUView

> Solo cablear datos ya guardados. Buscá en `frontend/src/pages/ONUView/index.jsx` el panel de
> detalles de la ONT y agregá las filas. Los nombres exactos de campos vienen del objeto ONT
> de la API (`model`, `firmware`, `sw_version`, `line_profile`, `srv_profile`, `vlan`,
> `distance`, `last_down_cause`).

**Files:**
- Modify: `frontend/src/pages/ONUView/index.jsx`

- [ ] **Step 1: Localizar el panel de detalle**

Run: `cd frontend && grep -n "serial_number\|external_id\|zone\|odb\|rx_power" src/pages/ONUView/index.jsx | head`
Expected: ubicar dónde se renderizan los campos de la ONT (tabla/lista de detalle).

- [ ] **Step 2: Agregar las filas de los campos nuevos**

Siguiendo el mismo patrón de fila que usan los campos existentes (ej. una fila label/valor),
agregar Modelo (`ont.model`), Firmware (`ont.firmware || ont.sw_version`), Perfil de línea
(`ont.line_profile`), Perfil de servicio (`ont.srv_profile`), VLAN (`ont.vlan`), Distancia
(`ont.distance` m), Última caída (`ont.last_down_cause`). Mostrar `—` cuando el valor sea nulo,
igual que el resto de la página.

- [ ] **Step 3: Verificar el build**

Run: `cd frontend && npm run build`
Expected: build OK sin errores.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/ONUView/index.jsx
git commit -m "feat(ui): mostrar modelo/firmware/perfil/VLAN/distancia/última-caída en ONUView"
```

---

## Task 12: Verificación end-to-end y deploy a producción

**Files:** ninguno (operación)

- [ ] **Step 1: Correr toda la suite de tests**

Run: `cd backend && npx jest -v`
Expected: todos PASS (sanity, parsers, enrichmentService).

- [ ] **Step 2: Smoke local del job (si hay acceso a una OLT)**

Levantar backend local (`npm run dev`) y en otra terminal:
```bash
node -e "require('dotenv').config(); const {selectBatch,enrichBatch}=require('./src/services/enrichmentService'); (async()=>{ const b=await selectBatch(2); console.log('lote',b.length); console.log(await enrichBatch(b)); process.exit(0); })()"
```
Expected: enriquece 0–2 ONTs sin error; en la DB esas ONTs quedan con `model`/`firmware`/`enriched_at`.

> Si tu PC no tiene acceso a la red de OLTs, saltá este paso y verificá en producción (Step 5).

- [ ] **Step 3: Push de la rama**

```bash
git push -u origin feat/ont-info-enrichment
```

- [ ] **Step 4: Merge a main** (PR en GitHub Juemacer20/Pixel-Studios-OLT, o merge directo según preferencia de Juan).

- [ ] **Step 5: Deploy a producción (10.200.1.75)** — respetando las reglas de producción:

```bash
# en el server, dentro del repo
git pull
docker compose -f infra/docker/docker-compose.prod.yml build
docker compose -f infra/docker/docker-compose.prod.yml up -d
# aplicar migración (NUNCA migrate dev ni seed)
docker compose -f infra/docker/docker-compose.prod.yml exec backend npx prisma migrate deploy
```

- [ ] **Step 6: Verificar en producción**

- Re-escanear una OLT (botón scan o `POST /olts/:id/scan`) → confirmar que las ONTs tienen `board/port/onu_id`.
- `POST /olts/:id/enrich` sobre una OLT → esperar unos minutos → abrir una ONT en ONUView y
  confirmar que aparece modelo/firmware/perfil/VLAN/distancia.
- Revisar logs del backend: `enrichOnts: N ONTs enriquecidas` sin errores de VTY.

---

## Self-Review (cobertura del spec)

- Scan persiste board/port/onu_id → **Task 4** ✅
- Parser detalle por ONT (model/firmware/perfil/vlan/distancia/última-caída/config) → **Tasks 5, 6** ✅
- Calibración con salida real → **Task 1** ✅
- Adapter detalle por ONT respetando VTY lock → **Task 7** (usa `_session`/`withOltLock`) ✅
- Job Bull incremental + selección por model null/stale + agrupar por OLT → **Tasks 8, 9** ✅
- Endpoint manual `POST /olts/:id/enrich` → **Task 10** ✅
- Migración 4 campos vía migrate deploy → **Task 3** ✅
- Frontend mínimo → **Task 11** ✅
- Tests parsers con fixtures + group puro → **Tasks 5, 6, 8** ✅
- Reglas de producción (solo display, migrate deploy, no seed/down -v) → **Tasks 1, 3, 12** ✅
- Solo Huawei (VSOL/KingType no-op) → **Task 8** (`typeof getOntDetailInfoBatch !== 'function'`) ✅
