# Paridad con SmartOLT — pendientes para cerrar el espejo

> **Tarea para OpenCode.** Auditoría visual lado a lado hecha por Claude (2026-06-14): logueé a
> SmartOLT (`https://itelsa.smartolt.com`) y capturé las **20 páginas** (screenshots + inventario
> estructurado del DOM) en `/home/juan/smartolt-audit/` (`screenshots/*.png` + `data/full-report.json`).
> Comparé contra la implementación actual.

## Resultado: Pixel ya es un espejo ~99% completo

La auditoría **descartó** la mayoría de los gaps que se sospechaban — están implementados:
- ✅ 18/18 páginas de SmartOLT presentes.
- ✅ ONU view con las 33 acciones (incl. VoIP, IPTV, Move, EPON, firmware, replace-by-SN, stop/start).
- ✅ Configured ONUs: ~24 filtros + panel batch completo + export/import CSV.
- ✅ Dashboard: 4 KPIs + Network status + PON outage/Signal variations + Info feed + authorizations chart.
- ✅ Settings: tabs General, **Notifications**, Backup, API Key, API Logs, Billing (ya incluye Notifications).
- ✅ "Tasks" ya está en el nav superior (`/events`).
- ✅ Export: la página real de SmartOLT es simple (filtros + botón) — Pixel ya la iguala (los "85 campos"
  eran columnas del CSV de salida, no un selector visible).
- ✅ Config mismatches, Reports (Tasks/Auth/Export/Import), VPN&TR069, Zones/ODBs/ONU types/Speed profiles,
  Auth presets, OLTs CRUD, enriquecimiento (de yapa, MÁS que SmartOLT).

---

## PENDIENTE 1 — 🌐 i18n / selector de idioma  **(único faltante funcional)**

**SmartOLT:** Settings › General › Language (Español/English). La app es multi-idioma.
**Pixel:** todo el texto está hardcodeado en inglés/español mezclado; no hay `react-i18next`.

### Cómo hacerlo
1. Instalar: `cd frontend && npm i react-i18next i18next i18next-browser-languagedetector`.
2. Crear `frontend/src/i18n/index.js`:
   - `i18n.use(LanguageDetector).use(initReactI18next).init({ fallbackLng: 'es', resources: { es:{...}, en:{...} } })`.
   - Persistir en `localStorage` (key `lang`).
3. Crear `frontend/src/i18n/locales/es.json` y `en.json` con las claves por sección
   (`nav.*`, `onuView.*`, `dashboard.*`, `settings.*`, …). Empezar por nav + Settings + ONUView;
   el resto se migra incremental.
4. Importar `./i18n` en `frontend/src/main.jsx` (antes de `<App/>`).
5. Reemplazar strings: `const { t } = useTranslation();` → `t('nav.unconfigured')` etc.
   Hacerlo por archivo, empezando por `components/layout/TopNav.jsx` y `pages/Settings/index.jsx`.
6. **Selector de idioma** en `pages/Settings/index.jsx`, tab General: un `<select>` Español/English
   que llame `i18n.changeLanguage(value)`. Default `es`.

### Criterio de aceptación
- Cambiar el idioma en Settings cambia los textos del nav, Settings y ONU view sin recargar.
- La preferencia persiste al refrescar (localStorage).
- Default español.

> **Nota de scope:** migrar TODOS los strings es grande. Aceptable hacerlo por fases: dejar la
> infraestructura i18n + el selector funcionando + nav/Settings/ONUView traducidos, y migrar el resto
> de páginas incrementalmente. Lo importante es que el mecanismo + el selector existan.

---

## PENDIENTE 2 — 🎨 Paridad de íconos (cosmético, baja prioridad)

**SmartOLT:** Font Awesome 4.7.
**Pixel:** lucide-react / @tabler/icons-react. (La guía maestra lo da por aceptable: "o mantener
lucide-react".)

### Cómo hacerlo (solo si se quiere fidelidad pixel-perfect)
- Mapear los íconos clave (acciones de ONU, nav, botones de status) a sus equivalentes FA 4.7, o
  instalar `font-awesome@4.7` y reemplazar los componentes de ícono por `<i className="fa fa-...">`.
- Referencia visual: comparar contra `/home/juan/smartolt-audit/screenshots/*.png`.
- **Recomendación:** baja prioridad. No afecta funcionalidad. Evaluar si vale el churn.

---

## PENDIENTE 3 — ✅ Certificación funcional de las 33 acciones de ONU (verificación, no build)

Las 33 acciones **existen en la UI**, pero la auditoría por código NO certifica que cada una ejecute
correctamente su comando Telnet contra una OLT real (VoIP, IPTV, replace-by-SN, firmware upgrade,
move, GPON/EPON channel, etc.).

### Cómo hacerlo
- Probar cada acción contra una OLT de dev **alcanzable** (Itelsa-Mocoreta `10.200.51.40` o
  Itelsa-SantaAna `10.200.43.25`, ya en la DB dev) sobre una ONU de prueba.
- **REGLA DE SEGURIDAD (COLLAB §4):** NO ejecutar comandos de escritura destructivos (delete,
  restore-defaults, reboot) sobre ONUs de clientes reales. Usar una ONU de laboratorio o validar
  solo el camino de construcción del comando (dry-run / inspección del comando generado).
- Documentar cuáles acciones quedaron verificadas ✅ y cuáles fallan/pendientes.

---

## Referencias
- Capturas reales de SmartOLT: `/home/juan/smartolt-audit/screenshots/` (20 PNG full-page).
- Inventario estructurado por página: `/home/juan/smartolt-audit/data/full-report.json`.
- Relevamiento original: `/mnt/claude-storage/relevamiento-smartolt/RELEVAMIENTO_COMPLETO_SMARTOLT.md`.
- Guía maestra (Apéndice B = tokens visuales): `…/GUIA_IMPLEMENTACION.md`.

> **Prioridad sugerida:** 1 (i18n) > 3 (certificación funcional) > 2 (íconos). Solo el 1 es un
> faltante funcional real; 2 y 3 son pulido/verificación.
