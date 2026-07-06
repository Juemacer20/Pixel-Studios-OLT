# PLAN DE IMPLEMENTACIÓN — Pixel Studios OLT → SmartOLT Parity

## Orden por dependencias

### FASE 5A — Frontend inmediato (sin cambios de backend)
1. ONU View: Show running-config + SW info buttons (endpoints existen)
2. ONU View: Unificar Get status en un solo botón 
3. ONU View: History como sección expandible
4. Save Config modal en el shell global (App.jsx/TopNav)
5. ODBs: Usage + Coordinates filters
6. Zones: Delete unused button
7. ODBs: Delete unused button

### FASE 5B — Acciones batch faltantes (backend + frontend)
8. Batch Mgmt IP
9. Batch TR-069
10. Batch WAN config
11. Batch IPv6
12. Batch DNS
13. Batch DHCP Option 82
14. Batch PPPoE Plus
15. Batch Move zone
16. Batch Web user/pass

### FASE 5C — Modales y páginas faltantes
17. Permission Required modal en ONTs list
18. Import location details modal
19. API Logs tab en Settings
20. Resync failed filter en ONTs

### FASE 5D — Backend/Integración
21. Autofind page refinements
22. OLT adapter edge cases
23. Signal monitoring improvements

### FASE 5E — Pruebas y validación
24. Test each module against SmartOLT behavior
25. Visual comparison at 1366/1440/1920
26. Regression testing
