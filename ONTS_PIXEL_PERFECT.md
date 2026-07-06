# ONTs Page — Pixel-Perfect SmartOLT Clone

## Regla de oro

NO inventes nada. NO agregues funcionalidad que SmartOLT no tenga. NO uses placeholders, "coming soon", ni stubs. Cada cambio debe acercar la página ONTs a ser indistinguible de SmartOLT v3.53.0.

El archivo fuente es: `frontend/src/pages/ONTs/index.jsx`

Referencia SmartOLT: `RELEVAMIENTO_COMPLETO_SMARTOLT.md` sección 4.

---

## 🔴 PRIORIDAD 1 — Columnas de la tabla exactas como SmartOLT

### Orden y nombres de columnas (EN ESTE ORDEN EXACTO):

```
Status | View | Name | SN/MAC | ONU | Zone | ODB | Signal | B/R | VLAN | VoIP | TV | Type | Auth date
```

### Reglas:
1. **NO mostrar columna OLT** — SmartOLT no muestra OLT en la tabla, es solo filtro.
2. **NO mostrar columna PON** — SmartOLT no muestra PON port en la tabla, es solo filtro.
3. **NO mostrar columna Actions** — SmartOLT no tiene botones Reboot/Delete inline. La única acción es "View".
4. **View** debe ser un botón azul con gradiente (`sol-viewbtn`) que dice "View" con un icono ojo.
5. **B/R** debe mostrar solo "B" o "R" con letra simple, NO "BRIDGE"/"ROUTE".
6. **VoIP** y **TV** deben mostrar iconos ✅ (verde) o ❌ (rojo/gris) según estado real del dato.
7. **SN/MAC** debe mostrar serial arriba y MAC abajo en gris más pequeño.
8. **Auth date** formato: fecha corta local (`dd/mm/aaaa`).

### Implementación:
```jsx
<SortTh sortKey="status" sortState={sortState} onSort={handleSort} style={{ width: 60, textAlign: 'center' }}>
  Status
</SortTh>
<th style={{ width: 60, textAlign: 'center' }}>View</th>
<SortTh sortKey="client" sortState={sortState} onSort={handleSort}>Name</SortTh>
<SortTh sortKey="serial_number" sortState={sortState} onSort={handleSort} style={{ width: 140 }}>SN / MAC</SortTh>
<SortTh sortKey="model" sortState={sortState} onSort={handleSort} style={{ width: 100 }}>ONU</SortTh>
<SortTh sortKey="zone" sortState={sortState} onSort={handleSort} style={{ width: 80 }}>Zone</SortTh>
<SortTh sortKey="odb" sortState={sortState} onSort={handleSort} style={{ width: 80 }}>ODB</SortTh>
<SortTh sortKey="rx_power" sortState={sortState} onSort={handleSort} style={{ width: 65, textAlign: 'right' }}>Signal</SortTh>
<SortTh sortKey="wan_mode" sortState={sortState} onSort={handleSort} style={{ width: 40, textAlign: 'center' }}>B/R</SortTh>
<SortTh sortKey="vlan" sortState={sortState} onSort={handleSort} style={{ width: 50, textAlign: 'center' }}>VLAN</SortTh>
<th style={{ width: 40, textAlign: 'center' }}>VoIP</th>
<th style={{ width: 35, textAlign: 'center' }}>TV</th>
<SortTh sortKey="provisioned_at" sortState={sortState} onSort={handleSort} style={{ width: 85 }}>Auth date</SortTh>
```

### B/R cell rendering:
```jsx
<td style={{ textAlign: 'center' }}>
  {ont.wan_mode ? (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: 24, height: 24, borderRadius: 4, fontSize: 12, fontWeight: 700,
      background: ont.wan_mode === 'bridge'
        ? 'rgba(92,184,92,0.2)' : 'rgba(240,173,78,0.2)',
      color: ont.wan_mode === 'bridge' ? '#5cb85c' : '#f0ad4e',
    }}>
      {ont.wan_mode === 'bridge' ? 'B' : 'R'}
    </span>
  ) : <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>—</span>}
</td>
```

### VoIP/TV cell rendering:
```jsx
<td style={{ textAlign: 'center' }}>
  {ont.voip_enabled
    ? <IconCircleCheck size={14} style={{ color: '#5cb85c' }} />
    : <IconX size={14} style={{ color: '#94a3b8', opacity: 0.5 }} />}
</td>
<td style={{ textAlign: 'center' }}>
  {ont.catv_enabled
    ? <IconCircleCheck size={14} style={{ color: '#5cb85c' }} />
    : <IconX size={14} style={{ color: '#94a3b8', opacity: 0.5 }} />}
</td>
```

Eliminar las columnas viejas: OLT, PON, Actions. Eliminar los botones Reboot/Delete inline.

---

## 🔴 PRIORIDAD 2 — Mostrar batch SVLAN/CVLAN section

En `index.jsx` línea ~1355, cambiar:
```jsx
<div className="batch-action-row" id="batch-action-svlan-cvlan-row" style={{ display: 'none' }}>
```
a:
```jsx
<div className="batch-action-row" id="batch-action-svlan-cvlan-row">
```

---

## 🔴 PRIORIDAD 3 — Mostrar "Active batch tasks" section

En `index.jsx` línea ~1288, cambiar:
```jsx
<div id="active-batch-tasks" className="margin-bottom" style={{ display: 'none' }}>
```
a:
```jsx
<div id="active-batch-tasks" className="margin-bottom">
```

---

## 🔴 PRIORIDAD 4 — Poblar selects batch con opciones reales

### Download speed batch select (línea ~1442):
```jsx
<select ...>
  <option value="">Please select</option>
  {SPEED_OPTS.map(s => <option key={s} value={s}>{s}</option>)}
</select>
```

### Upload speed batch select (línea ~1448): mismo que download.

### ONU Type batch select (línea ~1472):
```jsx
<select ...>
  <option value="">Please select</option>
  {onuTypeOpts.map(t => <option key={t} value={t}>{t}</option>)}
</select>
```

### Custom Profile batch select (línea ~1496):
```jsx
<select ...>
  <option value="">None (remove)</option>
  {profileOpts.map(t => <option key={t} value={t}>{t}</option>)}
</select>
```

Las constantes `SPEED_OPTS`, `onuTypeOpts`, `profileOpts` ya existen.

---

## 🔴 PRIORIDAD 5 — Selector "Show X entries" + server-side pagination

### Page size selector:
Agregar debajo de la tabla, antes de la paginación:
```jsx
<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Show</span>
  <select
    value={pageSize}
    onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
    style={{
      height: 30, fontSize: 12, padding: '2px 6px',
      background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)',
      color: '#f1f5f9', borderRadius: 4, outline: 'none',
    }}
  >
    <option value={25}>25</option>
    <option value={50}>50</option>
    <option value={100}>100</option>
  </select>
  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>entries</span>
</div>
```

### State:
```jsx
const [pageSize, setPageSize] = useState(25);
```

### Cambiar PAGE_SIZE por pageSize:
Reemplazar todas las referencias a `PAGE_SIZE` por `pageSize` (que es state, no constante).

### Última página en paginación:
Agregar botón "»" después de "Next ›":
```jsx
<span onClick={() => page < totalPages && setPage(totalPages)} ...>»</span>
```

---

## 🟡 PRIORIDAD 6 — Date picker en "Status changed before"

Cambiar de `input type="text"` a `input type="date"`:
```jsx
<input type="date" className="form-control input-100 input-search" id="lastStatusChange"
  value={filterLastStatusChange}
  onChange={e => { setFilterLastStatusChange(e.target.value); setPage(1); }} />
```

---

## 🟡 PRIORIDAD 7 — Refresh button junto al título

Agregar al lado del badge count:
```jsx
<span className="badge badge-gray" style={{ fontSize: 12, marginLeft: 10, verticalAlign: 'middle' }}>
  {filtered.length}
</span>
{isFetching && !isLoading && <span className="polling-dot" title="Updating…" style={{ marginLeft: 8 }} />}
<button className="btn btn-xs" onClick={() => refetch()} style={{ marginLeft: 8 }} title="Refresh">
  <IconReload size={12} />
</button>
```

Importar `IconReload` de `@tabler/icons-react`.

---

## 🟡 PRIORIDAD 8 — Badge con "X filtered of Y total"

```jsx
<span className="badge badge-gray" style={{ fontSize: 12, marginLeft: 10, verticalAlign: 'middle' }}>
  {filtered.length}
  <span style={{ opacity: 0.6, marginLeft: 4 }}>
    of {stats.total}
  </span>
</span>
```

---

## 🟡 PRIORIDAD 9 — B/R pills en filtros (ya existen, verificar que funcionen)

Las pills B/R en el filtro ya están implementadas. Verificar que:
- Hacen toggle correcto entre `filterMode === 'bridge'` y `filterMode === 'route'`
- Al hacer clic en una, se desactiva la otra
- El estilo `.onu_mode-filter.active > span` funciona

---

## 🟢 PRIORIDAD 10 — Más filtros con animación colapsable

Reemplazar el toggle de display por animación de altura. Usar un wrapper con `maxHeight` transicionado:

```jsx
<div id="more-filters-section" className="margin-bottom filters-row more-filters-panel"
  style={{
    overflow: 'hidden',
    maxHeight: showMore ? '400px' : '0',
    opacity: showMore ? 1 : 0,
    transition: 'max-height 0.25s ease, opacity 0.2s ease, padding 0.25s ease',
    padding: showMore ? '12px' : '0 12px',
    borderWidth: showMore ? '1px' : '0 1px',
    marginBottom: showMore ? 12 : 0,
  }}>
```

---

## 🟢 PRIORIDAD 11 — "Clear filters" link

Agregar después de la badge, condicionalmente:
```jsx
{hasFilters && (
  <a href="#" onClick={e => { e.preventDefault(); clearAllFilters(); }}
    style={{ fontSize: 11, color: '#8cc8ff', marginLeft: 12, cursor: 'pointer' }}>
    Clear filters
  </a>
)}
```

Implementar `clearAllFilters`:
```jsx
const clearAllFilters = () => {
  setSearch(''); setFilterOLT(''); setFilterBoard(''); setFilterPort('');
  setFilterSignal(''); setFilterStatus(''); setFilterZone(''); setFilterVlan('');
  setFilterMode(''); setFilterOnuType(''); setFilterProfile(''); setFilterPonType('');
  setFilterOdb(''); setFilterWanMode(''); setFilterMgmtIpMode(''); setFilterTr069('');
  setFilterVoip(''); setFilterCatv(''); setFilterConfigMethod(''); setFilterIpProtocol('');
  setFilterSvlan(''); setFilterCvlan(''); setFilterTagTransform('');
  setFilterDownloadSpeed(''); setFilterUploadSpeed(''); setFilterLastStatusChange('');
  setFilterShouldRebuild('');
  setPage(1);
};
```

---

## Comandos para build y verificación

```bash
# Compilar frontend (verificar errores)
cd /home/juan/Pixel-Studios-OLT/frontend
PATH="node_modules/.bin:$PATH" vite build 2>&1 | tail -30

# Ver estructura de archivos
ls -la src/pages/ONTs/

# Ver cambios en el archivo
git diff frontend/src/pages/ONTs/index.jsx

# Si hay error de compilación, ver detalles
PATH="node_modules/.bin:$PATH" vite build 2>&1
```
