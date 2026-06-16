# Fase 1 — Dashboard Gaps Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cerrar los gaps D12, D13, D14 del Dashboard para alcanzar paridad exacta con SmartOLT.

**Architecture:** Tres cambios quirúrgicos sobre archivos existentes. No se crean páginas nuevas. No se toca el backend.

**Tech Stack:** React 18 + Vite + Tailwind CSS v3 + SmartModal (ya construido en Fase 0)

---

## Estado de gaps antes de esta fase

| Gap | Descripción | Estado pre-Fase1 |
|-----|-------------|------------------|
| D12 | Signal variation settings modal | PARCIAL — funciona pero usa Bootstrap 3 clases |
| D13 | Save Config global modal | ✅ CERRADO en Fase 0 — SaveConfigProvider en AppLayout |
| D14 | KPI click navigation con filtros | FALTA — StatBoxes offline y low-signals no pasan query params |

---

## Archivos a modificar

- Modify: `frontend/src/components/dashboard/SignalDegradationTable.jsx` (D12)
- Modify: `frontend/src/pages/Dashboard/index.jsx` (D14 — dos StatBox `to` props)
- Modify: `frontend/src/pages/Diagnostics/index.jsx` (D14 — signal filter + useSearchParams)

---

## Task 1: D12 — Migrar SignalVariationModal a SmartModal

**Archivos:**
- Modify: `frontend/src/components/dashboard/SignalDegradationTable.jsx`

El `SignalVariationModal` existente tiene toda la lógica funcional (5 campos, API calls, toast). El único problema es que usa clases Bootstrap 3 (`modal-backdrop`, `modal show onu-ui-modal`, `modal-dialog`, etc.). Reemplazar el wrapper por `SmartModal`.

- [ ] **Step 1: Importar SmartModal**

Agregar al tope del archivo (después del import de `dashboardAPI`):

```jsx
import SmartModal from '../shared/SmartModal';
import SmartButton from '../shared/SmartButton';
```

- [ ] **Step 2: Reescribir SignalVariationModal**

Reemplazar la función entera `SignalVariationModal` (líneas 7–80) con:

```jsx
function SignalVariationModal({ open, onClose }) {
  const qc = useQueryClient();
  const { data: cfg } = useQuery({
    queryKey: ['signal-thresholds'],
    queryFn: () => settingsAPI.signalThresholds().then(r => r.data?.data ?? r.data),
    enabled: open,
  });
  const [form, setForm] = useState(null);
  const values = form ?? cfg ?? {};
  React.useEffect(() => { if (cfg && !form) setForm(cfg); }, [cfg, form]);

  const saveMut = useMutation({
    mutationFn: (d) => settingsAPI.saveSignalThresholds(d),
    onSuccess: () => {
      toast.success('Saved');
      qc.invalidateQueries({ queryKey: ['signal-thresholds'] });
      onClose();
    },
    onError: (e) => toast.error(e?.response?.data?.error || 'Failed'),
  });

  const fields = [
    { key: 'variationThreshold',  label: 'Signal variation threshold (dB)',   step: 0.1, parse: parseFloat },
    { key: 'largeVariationDelta', label: 'Large signal variation threshold (dB)', step: 0.1, parse: parseFloat },
    { key: 'multiOnuThreshold',   label: 'ONUs required for Unstable',        step: 1,   parse: parseInt },
    { key: 'trendWindowHours',    label: 'Repeated variation window (hours)',  step: 1,   parse: parseInt },
    { key: 'trendMinEvents',      label: 'Variations required for Critical',   step: 1,   parse: parseInt },
  ];

  return (
    <SmartModal
      open={open}
      onClose={onClose}
      title="Signal variation alert settings"
      size="sm"
      footer={
        <>
          <SmartButton variant="link" onClick={onClose}>Cancel</SmartButton>
          <SmartButton
            variant="primary"
            onClick={() => saveMut.mutate(values)}
            loading={saveMut.isPending}
          >
            Save
          </SmartButton>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {fields.map(f => (
          <div key={f.key}>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>
              {f.label}
            </label>
            <input
              type="number"
              step={f.step}
              className="input-base"
              style={{ width: 120 }}
              value={values[f.key] ?? ''}
              onChange={e => setForm({ ...values, [f.key]: f.parse(e.target.value) || 0 })}
            />
          </div>
        ))}
      </div>
    </SmartModal>
  );
}
```

- [ ] **Step 3: Verificar que SignalDegradationTable no cambió**

El componente `SignalDegradationTable` (líneas 82–137 del original) no se toca. Solo cambia el modal interno. Confirmar que el botón de engranaje `<IconSettings>` sigue llamando `setShowSettings(true)`.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/dashboard/SignalDegradationTable.jsx
git commit -m "feat(dashboard): migrar SignalVariationModal a SmartModal (D12)"
```

---

## Task 2: D14a — KPI "Total offline" y "Low signals" con query params

**Archivos:**
- Modify: `frontend/src/pages/Dashboard/index.jsx`

SmartOLT: clic en "Total offline" → `/onu/configured?status=offline`, clic en "Low signals" → `/diagnostics?signal=warning,critical`.

La página ONTs ya lee `?status` desde `useSearchParams` (línea 783 de `ONTs/index.jsx`) y la aplica al filtro `filterStatus`.

- [ ] **Step 1: Actualizar to del StatBox "Total offline"**

En `Dashboard/index.jsx`, buscar la línea:
```jsx
<StatBox to="/onu/configured"   color="slate"  icon={<IconX size={30} />}             value={fmt(offline)} label="Total offline"
```
Cambiar `to="/onu/configured"` → `to="/onu/configured?status=offline"`:

```jsx
<StatBox to="/onu/configured?status=offline" color="slate"  icon={<IconX size={30} />}  value={fmt(offline)} label="Total offline"
  footer={[`PwrFail: ${fmt(ob.pwrfail)}`, `LoS: ${fmt(ob.los)}`, `N/A: ${fmt(ob.na)}`]} />
```

- [ ] **Step 2: Actualizar to del StatBox "Low signals"**

Buscar la línea:
```jsx
<StatBox to="/diagnostics"      color="orange" icon={<IconAlertTriangle size={30} />} value={fmt(low)}     label="Low signals"
```
Cambiar `to="/diagnostics"` → `to="/diagnostics?signal=low"`:

```jsx
<StatBox to="/diagnostics?signal=low" color="orange" icon={<IconAlertTriangle size={30} />} value={fmt(low)} label="Low signals"
  footer={[`Warning: ${fmt(lb.warning)}`, `Critical: ${fmt(lb.critical)}`]} />
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Dashboard/index.jsx
git commit -m "feat(dashboard): KPI offline y low-signals navegan con filtros (D14)"
```

---

## Task 3: D14b — Filtro de señal en Diagnostics + leer ?signal param

**Archivos:**
- Modify: `frontend/src/pages/Diagnostics/index.jsx`

Agregar filtro de nivel de señal al toolbar de Diagnostics y pre-seleccionarlo cuando llega `?signal=low` en la URL.

- [ ] **Step 1: Agregar useSearchParams al import**

En la línea 1 del archivo:
```js
import { useState, useMemo } from 'react';
```
Cambiar por:
```js
import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
```

- [ ] **Step 2: Leer ?signal y agregar estado filterSignal**

Después de la línea `export default function Diagnostics() {`, agregar:

```js
const [searchParams] = useSearchParams();
```

Cambiar las líneas de estado existentes:
```js
const [status, setStatus] = useState('');
const [oltId, setOltId] = useState('');
```
por:
```js
const [status,      setStatus]      = useState('');
const [oltId,       setOltId]       = useState('');
const [filterSignal, setFilterSignal] = useState(searchParams.get('signal') || '');
```

- [ ] **Step 3: Agregar helper de filtro de señal**

Agregar junto a la función `signalColor` existente (antes de `fmtDbm`):

```js
function signalLevel(val) {
  if (val == null) return null;
  if (val > -25) return 'good';
  if (val > -27) return 'warning';
  return 'critical';
}
```

- [ ] **Step 4: Aplicar filterSignal a la lista de ONTs**

Encontrar la línea:
```js
const onts = useMemo(() => Array.isArray(data) ? data : [], [data]);
```
Reemplazar con:
```js
const onts = useMemo(() => {
  let list = Array.isArray(data) ? data : [];
  if (filterSignal === 'warning')  list = list.filter(o => signalLevel(o.rx_power) === 'warning');
  if (filterSignal === 'critical') list = list.filter(o => signalLevel(o.rx_power) === 'critical');
  if (filterSignal === 'low')      list = list.filter(o => ['warning', 'critical'].includes(signalLevel(o.rx_power)));
  return list;
}, [data, filterSignal]);
```

- [ ] **Step 5: Agregar select de señal al toolbar**

Agregar dentro del `div` del toolbar (después del select de OLT existente):

```jsx
<select
  value={filterSignal} onChange={e => setFilterSignal(e.target.value)}
  className="bg-[#1a2035] border border-[#2a3a5c] text-gray-200 rounded px-3 py-1.5 text-sm"
>
  <option value="">All signals</option>
  <option value="good">Good (&gt; -25 dBm)</option>
  <option value="warning">Warning (-25 to -27)</option>
  <option value="critical">Critical (&lt; -27)</option>
  <option value="low">Low (Warning + Critical)</option>
</select>
```

- [ ] **Step 6: Actualizar dependencias del useMemo**

Verificar que `filterSignal` está en el array de dependencias del `useMemo` de `onts` (ya incluido en Step 4).

- [ ] **Step 7: Commit**

```bash
git add frontend/src/pages/Diagnostics/index.jsx
git commit -m "feat(diagnostics): filtro de nivel de señal + ?signal URL param (D14)"
```

---

## Task 4: Build final y verificación

- [ ] **Step 1: Build de producción**

```bash
cd frontend && node_modules/.bin/vite build
```

Esperado: `✓ built in X.XXs` sin errores.

- [ ] **Step 2: Checklist de verificación en browser (:5173)**

- [ ] Dashboard: clic en "Total offline" → navega a `/onu/configured?status=offline` con tabla pre-filtrada mostrando solo offline
- [ ] Dashboard: clic en "Low signals" → navega a `/diagnostics?signal=low` con tabla mostrando solo Warning+Critical
- [ ] Dashboard: ícono engranaje en Signal degradation → abre modal SmartModal con 5 campos
- [ ] Signal modal: botón "Cancel" cierra; botón "Save" llama API y cierra
- [ ] Nav: "Save config" en TopNav → abre SaveConfigModal (D13 verificado)
- [ ] No regresiones en otras páginas

- [ ] **Step 3: Commit de cierre de fase (si hubo ajustes)**

```bash
git add -A
git commit -m "chore(fase1): ajustes finales y verificación"
```
