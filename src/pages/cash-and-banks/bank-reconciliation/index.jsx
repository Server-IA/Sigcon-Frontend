import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';

import AlertPage from '@/components/molecules/AlertPage';
import { base_url, formatPrice } from '@/utils/functions';
import { fetchHelper } from '@/utils/fetch';
import InputDate from '@/components/molecules/InputDate';
import InputModal from '@/components/molecules/InputModal';
import InputSelectModal from '@/components/molecules/inputSelectModal';

import DataTableReference from '@/components/organism/DataTable';

// CONC-5: la conservación de soportes es la única herramienta que permanece en la
// pestaña "Herramientas" (junto con reportes/reapertura/versionado de la sesión).
// Los demás apartados (partidas, GMF, antigüedad, cruce FE, diferencia en cambio)
// se retiraron de la navegación según la reorganización del módulo.
import SoportesConciliacion from '../soportes-conciliacion';
// CONC #4: traducción de enums crudos (tipo/método/estado de emparejamientos) a español.
import { traducir } from '@/utils/statusLabels';

/**
 * Conciliación bancaria — pantalla guiada única por cuenta (cuenta fija por URL).
 *
 * Centraliza todo el flujo de conciliación en un solo lugar (el botón
 * "Conciliación bancaria" de cada cuenta), reemplazando los menús sueltos.
 * Anclada en la sesión rica (SesionConciliacion: BORRADOR/.../CERRADA + firma +
 * versionado + informe). Implementación por fases:
 *   F1 (esta): backbone de sesión (crear/retomar) + Paso 1 (período) + Paso 2
 *              (libros del período). Se preserva intacto el import CSV + tabla
 *              de movimientos + emparejar comprobante/JE dentro del Paso 3.
 *   F2: import de extracto filtrado por período + reporte de descartados + V4.
 *   F3: matching automático scoped a la sesión + aceptar/rechazar + manual.
 *   F4: cierre-en-cero + firma + reporte + reapertura/versiones + cerradas.
 */

const parseOptionalMoney = (raw) => {
    if (raw == null || String(raw).trim() === '') return undefined;
    const n = Number(String(raw).replace(/\s/g, '').replace(',', '.'));
    if (Number.isNaN(n)) return undefined;
    return n;
};

const fmtMoney = (v) => (v == null || v === '' ? '—' : formatPrice(Number(v)));

// QA BNK (2026-06-04) Caso 1: en los libros contables de conciliación la columna
// IMPORTE debe mostrar el SIGNO antes del símbolo de pesos ("-$ 450.000", no
// "$ -450.000"). Intl.NumberFormat puede colocar el menos después del símbolo según
// el runtime, así que el signo se compone aquí de forma determinista sobre el valor
// absoluto.
const fmtImporte = (v) => {
    if (v == null || v === '') return '—';
    const n = Number(v);
    if (Number.isNaN(n)) return '—';
    return (n < 0 ? '-' : '') + formatPrice(Math.abs(n));
};

// Mapea el estado de la sesión rica a etiqueta + color de badge.
const ESTADO_BADGE = {
    BORRADOR:    { label: 'Borrador',    cls: 'bg-label-warning' },
    EN_REVISION: { label: 'En revisión', cls: 'bg-label-info' },
    APROBADA:    { label: 'Aprobada',    cls: 'bg-label-primary' },
    CERRADA:     { label: 'Cerrada',     cls: 'bg-label-success' },
    REABIERTA:   { label: 'Reabierta',   cls: 'bg-label-danger' },
};
const estadoBadge = (e) => ESTADO_BADGE[e] || { label: e || '—', cls: 'bg-label-secondary' };

const ESTADO_MOV = {
    NO_CONCILIADO: { label: 'No conciliado', cls: 'bg-label-secondary' },
    EN_REVISION:   { label: 'En revisión',   cls: 'bg-label-info' },
    CONCILIADO:    { label: 'Conciliado',    cls: 'bg-label-success' },
    YA_CONCILIADO_BLOQUEADO: { label: 'Ya conciliado', cls: 'bg-label-success' },
};
const estadoMovBadge = (e) => ESTADO_MOV[e] || { label: e || '—', cls: 'bg-label-secondary' };

// HU-068: color del badge de confianza de clasificación.
const confBadge = (c) => {
    if (c == null) return 'bg-label-secondary';
    if (c >= 100) return 'bg-label-primary';
    if (c >= 90) return 'bg-label-success';
    return 'bg-label-warning';
};

const STEPS = [
    { id: 1, label: 'Sesión y período' },
    { id: 2, label: 'Libros del período' },
    { id: 3, label: 'Extracto bancario' },
    { id: 4, label: 'Matching automático' },
    { id: 5, label: 'Aceptar / Rechazar' },
    { id: 6, label: 'Emparejamiento manual' },
    { id: 7, label: 'Cierre y firma' },
];

const BankReconciliation = () => {
    const { bankAccountId } = useParams();
    const id = Number(bankAccountId);
    const navigate = useNavigate();
    // QA Conciliación (2026-05-25) Bug 3: datos del usuario logueado para el formulario
    // de firma (nombre completo + cargo/rol, mostrados como solo lectura).
    const currentUser = useSelector((state) => state.user.user);
    const currentUserName = `${currentUser?.name ?? ''} ${currentUser?.last_name ?? currentUser?.lastname ?? ''}`.trim() || (currentUser?.username ?? '—');
    const currentUserRole = (() => {
        const roles = currentUser?.roles;
        if (!Array.isArray(roles) || !roles.length) return currentUser?.platformRole || 'Responsable';
        return roles.map((r) => (typeof r === 'string' ? r : (r?.name || r?.nombre || ''))).filter(Boolean).join(', ') || 'Responsable';
    })();

    const tableRef = useRef(null);
    const dataTableRef = useRef(null);

    const [accountLabel, setAccountLabel] = useState('');
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState({ message: '', type: '', show: false });

    // ---- Sesión rica (backbone del flujo) ----
    const [sessions, setSessions] = useState([]);
    const [selectedSessionId, setSelectedSessionId] = useState('');
    const [sessionForm, setSessionForm] = useState({ periodStart: '', periodEnd: '' });
    const [showNewSession, setShowNewSession] = useState(false);
    const [libros, setLibros] = useState([]);
    const [librosLoading, setLibrosLoading] = useState(false);
    const [extracto, setExtracto] = useState([]);
    const [extractoLoading, setExtractoLoading] = useState(false);

    // ---- F3: matching + emparejamientos (Pasos 4/5/6) ----
    const [emparejamientos, setEmparejamientos] = useState([]);
    const [matchSummary, setMatchSummary] = useState(null);
    const [running, setRunning] = useState(false);
    const [wsExtracto, setWsExtracto] = useState([]); // extracto libre (NO_CONCILIADO)
    const [wsLibros, setWsLibros] = useState([]);      // libros libres (NO_CONCILIADO)
    const [selExt, setSelExt] = useState([]);          // ids extracto seleccionados (manual)
    const [selLib, setSelLib] = useState([]);          // ids libros seleccionados (manual)
    const [manualMotivo, setManualMotivo] = useState('');

    const [activeStep, setActiveStep] = useState(1);

    // ---- F4: cierre/firma (Paso 7) + Conciliaciones cerradas (Sec 12) ----
    const [cierre, setCierre] = useState(null);          // resumenCierre (enCero, pendientes…)
    const [viewMode, setViewMode] = useState('guiada');  // 'guiada' | 'cerradas' | 'herramientas'
    const [cerradas, setCerradas] = useState([]);        // CERRADA activas
    const [archivadas, setArchivadas] = useState([]);    // archivadas (read-only)
    const [showArchivadas, setShowArchivadas] = useState(false);

    // ---- Movimientos de la cuenta (preservado del flujo previo) ----
    const [movements, setMovements] = useState([]);
    const [unmatchedOnly, setUnmatchedOnly] = useState(false);
    const [vouchers, setVouchers] = useState([]);

    const selectedSession = useMemo(
        () => sessions.find((s) => String(s.id) === String(selectedSessionId)) || null,
        [sessions, selectedSessionId],
    );

    const notify = (msg, type = 'success') => setMessage({ message: msg, type, show: true });
    const clearMsg = () => setMessage({ message: '', type: '', show: false });

    // ===== carga de datos =====
    const loadSessions = useCallback(async () => {
        if (!id || Number.isNaN(id)) return;
        try {
            const res = await fetchHelper.get(
                base_url(['api', 'v1', 'banks', 'sesiones-conciliacion', 'cuenta', id]), {}, 1, false, true);
            const arr = Array.isArray(res) ? res : (res?.data ?? []);
            setSessions(arr);
            // Auto-seleccionar la sesión editable más reciente (BORRADOR/REABIERTA).
            if (!selectedSessionId && arr.length) {
                const editable = arr.find((s) => s.estado === 'BORRADOR' || s.estado === 'REABIERTA');
                if (editable) setSelectedSessionId(String(editable.id));
            }
        } catch (e) {
            setSessions([]);
        }
    }, [id, selectedSessionId]);

    const refreshMovements = useCallback(async () => {
        if (!id || Number.isNaN(id)) return;
        try {
            const [accRes, movRes, vouRes] = await Promise.all([
                fetchHelper.get(base_url(['api', 'v1', 'bank-accounts', id]), {}, 1, false, true),
                fetchHelper.get(
                    base_url(['api', 'v1', 'bank-accounts', id, 'financial-movements'], { unmatchedOnly: String(unmatchedOnly) }),
                    {}, 1, false, true),
                fetchHelper.post(base_url(['api', 'v1', 'vouchers', 'search']), { length: -1 }, {}, 0, false),
            ]);
            const acc = accRes?.data ?? accRes;
            setAccountLabel(`${acc?.code || ''} — ${acc?.accountName || ''}`.trim() || `Cuenta #${id}`);
            const movList = Array.isArray(movRes?.data) ? movRes.data : [];
            setMovements(movList);
            const matchedIds = new Set(movList.map((m) => m.matchedVoucherId).filter(Boolean));
            setVouchers(Array.isArray(vouRes?.data) ? vouRes.data.filter((v) => {
                const accountId = v?.bankAccount?.id;
                if (accountId == null || accountId != id) return false;
                return !matchedIds.has(v.id);
            }) : []);
        } catch (e) {
            console.error(e);
        }
    }, [id, unmatchedOnly]);

    const loadLibros = useCallback(async (sid) => {
        if (!sid) { setLibros([]); return; }
        setLibrosLoading(true);
        try {
            const res = await fetchHelper.get(
                base_url(['api', 'v1', 'banks', 'sesiones-conciliacion', sid, 'libros']), {}, 1, false, true);
            setLibros(Array.isArray(res) ? res : (res?.data ?? []));
        } catch (e) {
            setLibros([]);
        } finally {
            setLibrosLoading(false);
        }
    }, []);

    const loadExtracto = useCallback(async (sid) => {
        if (!sid) { setExtracto([]); return; }
        setExtractoLoading(true);
        try {
            const res = await fetchHelper.get(
                base_url(['api', 'v1', 'banks', 'sesiones-conciliacion', sid, 'extracto']), {}, 1, false, true);
            setExtracto(Array.isArray(res) ? res : (res?.data ?? []));
        } catch (e) {
            setExtracto([]);
        } finally {
            setExtractoLoading(false);
        }
    }, []);

    // QA Conciliación (2026-05-25) Bug 1/4: emparejamientos (Paso 5) y workspace de
    // movimientos libres (Paso 6) ACOTADOS a la sesión seleccionada. Antes consultaban
    // por cuenta (bankAccountId), por lo que al cambiar de sesión seguían mostrando los
    // datos de la sesión anterior / del ámbito global de la cuenta.
    const loadEmparejamientos = useCallback(async (sid) => {
        if (!sid) { setEmparejamientos([]); return; }
        try {
            const res = await fetchHelper.get(
                base_url(['api', 'v1', 'banks', 'emparejamientos', 'sesion', sid]), {}, 1, false, true);
            setEmparejamientos(Array.isArray(res) ? res : (res?.data ?? []));
        } catch (e) { setEmparejamientos([]); }
    }, []);

    const loadWorkspace = useCallback(async (sid) => {
        if (!sid) { setWsExtracto([]); setWsLibros([]); return; }
        try {
            const res = await fetchHelper.get(
                base_url(['api', 'v1', 'banks', 'emparejamientos', 'workspace-sesion', sid]), {}, 1, false, true);
            const w = res?.data ?? res ?? {};
            setWsExtracto(Array.isArray(w.extracto) ? w.extracto : []);
            setWsLibros(Array.isArray(w.libros) ? w.libros : []);
        } catch (e) { setWsExtracto([]); setWsLibros([]); }
    }, []);

    // F4: definidos ANTES de los effects que los referencian en sus deps (evita TDZ).
    const sUrl = (...p) => base_url(['api', 'v1', 'banks', 'sesiones-conciliacion', ...p]);

    const loadCierre = useCallback(async (sid) => {
        if (!sid) { setCierre(null); return; }
        try {
            const res = await fetchHelper.get(sUrl(sid, 'resumen-cierre'), {}, 0, false, true);
            setCierre(res?.data ?? res ?? null);
        } catch { setCierre(null); }
    }, []);

    const loadCerradas = useCallback(async () => {
        if (!id || Number.isNaN(id)) return;
        try {
            const [c, a] = await Promise.all([
                fetchHelper.get(sUrl('cuenta', id, 'cerradas'), {}, 0, false, true),
                fetchHelper.get(sUrl('cuenta', id, 'archivadas'), {}, 0, false, true),
            ]);
            setCerradas(Array.isArray(c) ? c : (c?.data ?? []));
            setArchivadas(Array.isArray(a) ? a : (a?.data ?? []));
        } catch { setCerradas([]); setArchivadas([]); }
    }, [id]);

    useEffect(() => {
        (async () => {
            setLoading(true);
            await Promise.all([loadSessions(), refreshMovements()]);
            setLoading(false);
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, unmatchedOnly]);

    useEffect(() => {
        // QA Conciliación (2026-05-25) Bug 1/4: al cambiar de sesión, limpiar de
        // inmediato el estado de la sesión previa (emparejamientos, workspace y
        // selecciones manuales) ANTES de cargar la nueva, para que no quede ningún
        // residuo visible durante la carga asíncrona.
        setEmparejamientos([]); setWsExtracto([]); setWsLibros([]);
        setSelExt([]); setSelLib([]); setManualMotivo('');
        if (selectedSessionId) {
            loadLibros(selectedSessionId); loadExtracto(selectedSessionId);
            loadEmparejamientos(selectedSessionId); loadWorkspace(selectedSessionId); loadCierre(selectedSessionId);
        } else {
            setLibros([]); setExtracto([]); setCierre(null);
        }
    }, [selectedSessionId, loadLibros, loadExtracto, loadEmparejamientos, loadWorkspace, loadCierre]);

    // Refrescar el resumen de cierre al entrar al Paso 7.
    useEffect(() => {
        if (activeStep === 7 && selectedSessionId) loadCierre(selectedSessionId);
    }, [activeStep, selectedSessionId, loadCierre]);

    // Cargar las conciliaciones cerradas/archivadas al abrir esa vista.
    useEffect(() => {
        if (viewMode === 'cerradas') loadCerradas();
    }, [viewMode, loadCerradas]);

    // Recarga conjunta tras una acción de matching/emparejamiento.
    const reloadConciliacion = useCallback(() => {
        if (!selectedSessionId) return;
        loadEmparejamientos(selectedSessionId); loadWorkspace(selectedSessionId);
        loadLibros(selectedSessionId); loadExtracto(selectedSessionId);
        refreshMovements();
    }, [selectedSessionId, loadEmparejamientos, loadWorkspace, loadLibros, loadExtracto, refreshMovements]);

    // ===== F4: cierre / firma / reapertura / cerradas =====
    // (sUrl + loadCierre + loadCerradas se definen arriba, antes de los effects que los usan)
    // Reload silencioso (time=0) de sesiones + resumen, para no clobberar el Swal de éxito.
    const refreshSesionState = useCallback(async () => {
        try {
            const res = await fetchHelper.get(sUrl('cuenta', id), {}, 0, false, true);
            setSessions(Array.isArray(res) ? res : (res?.data ?? []));
        } catch { /* ignore */ }
        await loadCierre(selectedSessionId);
        loadEmparejamientos(selectedSessionId); loadWorkspace(selectedSessionId);
        loadLibros(selectedSessionId); loadExtracto(selectedSessionId);
    }, [id, selectedSessionId, loadCierre, loadEmparejamientos, loadWorkspace, loadLibros, loadExtracto]);

    // HU-066 E2/E3: firma en 2 pasos (OTP stand-in) — reusa el flujo del módulo de firma.
    // QA Conciliación (2026-05-25) Bug 3: el formulario incluye nombre completo + cargo/rol
    // (solo lectura, auto-llenados del usuario logueado), fecha/hora (auto, solo lectura),
    // documento + tarjeta profesional, y una confirmación explícita de aprobación obligatoria.
    const firmarSesion = async (sid, rol) => {
        const rolLabel = rol === 'REVISOR' ? 'revisor' : (rol === 'ELABORADOR' ? 'elaborador' : 'responsable');
        const ahora = new Date().toLocaleString('es-CO');
        const esc = (s) => String(s ?? '').replace(/"/g, '&quot;');
        const { value: datos } = await window.Swal.fire({
            title: `Firmar como ${rolLabel} — sesión #${sid}`,
            html:
                // QA 2026-05-28: cada par label+input se envuelve en un <div block>.
                // Antes label e input venian sueltos en el flujo del .text-start;
                // como ambos quedan como inline-block (form-label de Bootstrap y
                // swal2-input de Swat), si el ancho del Swal sobraba, el label
                // de la siguiente fila se "subia" a la derecha del input anterior
                // (ej. "Cargo o rol" aparecia al lado de "Admin QA4" en vez de
                // encima de su propio input). Cada wrapper rompe la linea.
                `<div class="text-start">`
                + `<div class="mb-2">`
                +   `<label class="form-label mb-1 small fw-semibold d-block">Nombre completo del responsable</label>`
                +   `<input class="swal2-input mt-0" value="${esc(currentUserName)}" readonly>`
                + `</div>`
                + `<div class="mb-2">`
                +   `<label class="form-label mb-1 small fw-semibold d-block">Cargo o rol</label>`
                +   `<input class="swal2-input mt-0" value="${esc(currentUserRole)}" readonly>`
                + `</div>`
                + `<div class="mb-2">`
                +   `<label class="form-label mb-1 small fw-semibold d-block">Fecha y hora de la firma</label>`
                +   `<input class="swal2-input mt-0" value="${esc(ahora)}" readonly>`
                + `</div>`
                + `<div class="mb-2">`
                +   `<label class="form-label mb-1 small fw-semibold d-block">Documento de identidad</label>`
                +   `<input id="sw-doc" class="swal2-input mt-0" placeholder="Documento de identidad">`
                + `</div>`
                + `<div class="mb-2">`
                +   `<label class="form-label mb-1 small fw-semibold d-block">Tarjeta profesional (T.P.)</label>`
                +   `<input id="sw-tp" class="swal2-input mt-0" placeholder="Tarjeta profesional (T.P.)">`
                + `</div>`
                + `<div class="form-check mt-3 ms-1"><input type="checkbox" id="sw-confirm" class="form-check-input">`
                +   `<label class="form-check-label small" for="sw-confirm">Confirmo la aprobación de esta conciliación bancaria.</label></div>`
                + `</div>`,
            focusConfirm: false, showCancelButton: true, confirmButtonText: 'Solicitar código', cancelButtonText: 'Cancelar',
            preConfirm: () => {
                const documento = (document.getElementById('sw-doc').value || '').trim();
                const tarjetaProfesional = document.getElementById('sw-tp').value;
                const confirmado = document.getElementById('sw-confirm').checked;
                // QA BNK (2026-06-03) BNK-RF-24/38: documento de identidad min 5 / max 20,
                // solo digitos y guion (ej: cedula colombiana).
                if (!documento) { window.Swal.showValidationMessage('Ingrese el documento de identidad'); return false; }
                if (documento.length < 5 || documento.length > 20) { window.Swal.showValidationMessage('El documento de identidad debe tener entre 5 y 20 caracteres'); return false; }
                if (!/^[0-9-]+$/.test(documento)) { window.Swal.showValidationMessage('El documento de identidad solo admite dígitos y guion'); return false; }
                if (!confirmado) { window.Swal.showValidationMessage('Debe marcar la confirmación de aprobación'); return false; }
                return { documento, tarjetaProfesional };
            },
        });
        if (!datos) return;
        let res;
        try { res = await fetchHelper.post(sUrl(sid, 'firmar') + `?rol=${rol}`, { ...datos, metodo: 'OTP' }, {}, 0, true); }
        catch { return; }
        if (res?.otpRequired) {
            const { value: otp } = await window.Swal.fire({
                title: 'Código de firma (OTP)',
                html: `<div class="alert alert-info small mb-2">Ingrese el número para confirmar.</div>`
                    + `<div class="mb-2">Código: <b>${res.devOtp}</b></div>`
                    + `<input id="sw-otp" class="swal2-input" placeholder="Ingrese el código">`,
                focusConfirm: false, showCancelButton: true, confirmButtonText: 'Firmar', cancelButtonText: 'Cancelar',
                preConfirm: () => document.getElementById('sw-otp').value,
            });
            if (!otp) return;
            try {
                await fetchHelper.post(sUrl(sid, 'firmar') + `?rol=${rol}`, { ...datos, metodo: 'OTP', otp }, {}, 0, true);
                await refreshSesionState();
                window.Swal.fire({ icon: 'success', title: 'Firma registrada', timer: 1300, showConfirmButton: false });
            } catch { /* error ya mostrado */ }
        }
    };

    // Transición de estado (enviar-revisión / aprobar / cerrar). C1 + segregación los valida el backend.
    const accionSesion = async (sid, path, okMsg) => {
        try {
            await fetchHelper.post(sUrl(sid, path), {}, {}, 0, true);
            await refreshSesionState();
            if (viewMode === 'cerradas') loadCerradas();
            window.Swal.fire({ icon: 'success', title: okMsg, timer: 1400, showConfirmButton: false });
        } catch { /* error ya mostrado */ }
    };

    const descargarPdf = async (sid) => {
        try {
            const token = localStorage.getItem('token');
            const resp = await fetch(sUrl(sid, 'informe.pdf'), { headers: { Authorization: `Bearer ${token}` } });
            if (!resp.ok) throw new Error('no-pdf');
            const blob = await resp.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = `informe_conciliacion_${sid}.pdf`;
            document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(url);
        } catch { window.Swal.fire({ icon: 'error', title: 'No se pudo descargar el informe' }); }
    };

    const verificarFirmas = async (sid) => {
        try {
            const r = await fetchHelper.get(sUrl(sid, 'verificar-firma'), {}, 0, false, true);
            const rows = (r?.firmas || []).map((f) => `<tr><td>${f.rolFirma}</td><td>${f.firmante || ''}</td><td>${f.tarjetaProfesional || ''}</td><td>${f.valida ? '✅' : '❌'}</td></tr>`).join('');
            window.Swal.fire({
                icon: r?.todasValidas ? 'success' : 'error',
                title: r?.todasValidas ? 'Firmas íntegras' : 'Firma comprometida',
                html: `<table class="table table-sm"><thead><tr><th>Rol</th><th>Firmante</th><th>T.P.</th><th>Válida</th></tr></thead><tbody>${rows || '<tr><td colspan="4">Sin firmas</td></tr>'}</tbody></table>`,
            });
        } catch { /* */ }
    };

    const verHistorial = async (sid) => {
        try {
            const r = await fetchHelper.get(sUrl(sid, 'historial'), {}, 0, false, true);
            const list = Array.isArray(r) ? r : (r?.data ?? []);
            const rows = list.map((v) => `<tr><td>v${v.version}</td><td>${v.estado}</td><td>#${v.id}</td></tr>`).join('');
            window.Swal.fire({ title: 'Histórico de versiones', html: `<table class="table table-sm"><thead><tr><th>Versión</th><th>Estado</th><th>ID</th></tr></thead><tbody>${rows}</tbody></table>` });
        } catch { /* */ }
    };

    // QA reeval Q3: reapertura en UN SOLO PASO, sin segregación (no requiere 2 personas).
    // Antes el flujo era solicitar -> aprobar (otra persona), y daba "BNK-CON-025: el
    // solicitante no puede ser quien la autoriza". Ahora el mismo usuario reabre indicando
    // el motivo; el backend crea la nueva versión REABIERTA directamente.
    const solicitarReapertura = async (sid) => {
        const { value: f } = await window.Swal.fire({
            title: `Reabrir conciliación — sesión #${sid}`,
            html: `<div class="alert alert-info small text-start mb-2">Se creará una nueva versión <b>REABIERTA</b> conservando la versión anterior intacta. Indique el motivo de la reapertura.</div>`
                + `<textarea id="sw-mot" class="swal2-textarea" maxlength="500" placeholder="Motivo de la reapertura (entre 20 y 500 caracteres)"></textarea>`
                + `<input id="sw-ev" class="swal2-input" placeholder="Nombre del archivo de evidencia (opcional)">`,
            focusConfirm: false, showCancelButton: true, confirmButtonText: 'Reabrir', cancelButtonText: 'Cancelar',
            // QA BNK (2026-06-03) BNK-RF-38/46: motivo de reapertura min 20 / max 500 + clase.
            preConfirm: () => {
                const motivo = (document.getElementById('sw-mot').value || '').trim();
                if (motivo.length < 20) { window.Swal.showValidationMessage('El motivo debe tener al menos 20 caracteres'); return false; }
                if (motivo.length > 500) { window.Swal.showValidationMessage('El motivo no puede superar los 500 caracteres'); return false; }
                if (!/^[\p{L}0-9 .,_-]+$/u.test(motivo)) { window.Swal.showValidationMessage('El motivo contiene caracteres no válidos'); return false; }
                return { motivo, evidenciaFileName: document.getElementById('sw-ev').value };
            },
        });
        if (!f) return;
        try {
            const r = await fetchHelper.post(sUrl(sid, 'reabrir'), f, {}, 0, true);
            await refreshSesionState(); loadCerradas(); await loadSessions();
            window.Swal.fire({ icon: 'success', title: 'Conciliación reabierta',
                html: `Nueva versión: <b>v${r?.version}</b> (sesión #${r?.nuevaSesionId})` });
        } catch { /* */ }
    };

    const aprobarReapertura = async (sol) => {
        const { value: f } = await window.Swal.fire({
            title: `Aprobar reapertura #${sol.id}`,
            html: `<div class="alert alert-warning small">Escriba <b>REABRIR</b> para confirmar. Se exige su segunda firma electrónica.</div>`
                + `<input id="sw-cf" class="swal2-input" placeholder="Escriba REABRIR">`
                + `<input id="sw-doc" class="swal2-input" placeholder="Documento">`
                + `<input id="sw-tp" class="swal2-input" placeholder="Tarjeta profesional">`,
            focusConfirm: false, showCancelButton: true, confirmButtonText: 'Aprobar', cancelButtonText: 'Cancelar',
            // QA BNK (2026-06-03) BNK-RF-24/38: confirmacion exacta "REABRIR" + documento min 5 / max 20 (digitos+guion).
            preConfirm: () => {
                const confirmText = (document.getElementById('sw-cf').value || '').trim();
                const documento = (document.getElementById('sw-doc').value || '').trim();
                if (confirmText !== 'REABRIR') { window.Swal.showValidationMessage('Escriba exactamente REABRIR para confirmar'); return false; }
                if (documento.length < 5 || documento.length > 20 || !/^[0-9-]+$/.test(documento)) { window.Swal.showValidationMessage('El documento de identidad debe tener entre 5 y 20 dígitos (admite guion)'); return false; }
                return { confirmText, documento, tarjetaProfesional: document.getElementById('sw-tp').value };
            },
        });
        if (!f) return;
        try {
            const r = await fetchHelper.post(sUrl('reaperturas', sol.id, 'aprobar'), f, {}, 0, true);
            await refreshSesionState(); loadCerradas(); await loadSessions();
            window.Swal.fire({ icon: 'success', title: 'Reapertura aprobada', html: `Nueva versión: <b>v${r?.version}</b> (sesión #${r?.nuevaSesionId})` });
        } catch { /* */ }
    };

    const rechazarReapertura = async (sol) => {
        const { value: motivo } = await window.Swal.fire({ title: 'Rechazar reapertura', input: 'textarea', inputPlaceholder: 'Motivo del rechazo', showCancelButton: true, confirmButtonText: 'Rechazar', cancelButtonText: 'Cancelar' });
        if (!motivo) return;
        try {
            await fetchHelper.post(sUrl('reaperturas', sol.id, 'rechazar'), { motivoRechazo: motivo }, {}, 0, true);
            window.Swal.fire({ icon: 'success', title: 'Solicitud rechazada', timer: 1300, showConfirmButton: false });
        } catch { /* */ }
    };

    const verSolicitudes = async (sid) => {
        try {
            const r = await fetchHelper.get(sUrl(sid, 'solicitudes'), {}, 0, false, true);
            const list = Array.isArray(r) ? r : (r?.data ?? []);
            if (!list.length) { window.Swal.fire({ icon: 'info', title: 'Sin solicitudes de reapertura' }); return; }
            const rows = list.map((x) => `<tr><td>#${x.id}</td><td>${x.estado}</td><td>${(x.motivo || '').slice(0, 50)}…</td></tr>`).join('');
            const pend = list.find((x) => x.estado === 'PENDIENTE');
            const { isConfirmed, isDenied } = await window.Swal.fire({
                title: 'Solicitudes de reapertura',
                html: `<table class="table table-sm"><thead><tr><th>ID</th><th>Estado</th><th>Motivo</th></tr></thead><tbody>${rows}</tbody></table>`
                    + (pend ? `<div class="small text-muted">Aprobar/Rechazar la solicitud PENDIENTE #${pend.id} (segregación: no puede ser el solicitante).</div>` : ''),
                showCancelButton: true, showDenyButton: !!pend, confirmButtonText: pend ? 'Aprobar reapertura' : 'Cerrar', denyButtonText: 'Rechazar', cancelButtonText: 'Volver',
            });
            if (!pend) return;
            if (isConfirmed) await aprobarReapertura(pend);
            else if (isDenied) await rechazarReapertura(pend);
        } catch { /* */ }
    };

    const archivarSesion = async (sid) => {
        const ok = await window.Swal.fire({
            title: '¿Archivar conciliación?', icon: 'question',
            html: 'Solo aplica a conciliaciones cerradas hace más de 1 año. El informe PDF y la evidencia se conservan en Soportes (retención 10 años); solo se oculta del listado activo.',
            showCancelButton: true, confirmButtonText: 'Archivar', cancelButtonText: 'Cancelar',
        });
        if (!ok.isConfirmed) return;
        try {
            await fetchHelper.post(sUrl(sid, 'archivar'), {}, {}, 0, true);
            await loadCerradas();
            window.Swal.fire({ icon: 'success', title: 'Conciliación archivada', timer: 1400, showConfirmButton: false });
        } catch { /* error ya mostrado */ }
    };

    // ===== DataTable de movimientos (preservado) =====
    useEffect(() => {
        if (!dataTableRef.current) return;
        dataTableRef.current.clear();
        dataTableRef.current.rows.add(movements);
        dataTableRef.current.draw(true);

        const handler = function () {
            const action = $(this).data('action');
            const rid = Number($(this).data('id'));
            const movement = movements.find((m) => m.id == rid);
            if (!movement) return;
            if (action === 'match') openMatchModal(movement);
            else if (action === 'unmatch') submitUnmatch(movement);
        };
        dataTableRef.current.on('click', 'button.btn-label-primary', handler);
        dataTableRef.current.on('click', 'button.btn-label-secondary', handler);
        return () => {
            dataTableRef.current?.off('click', 'button.btn-label-primary', handler);
            dataTableRef.current?.off('click', 'button.btn-label-secondary', handler);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [movements]);

    // ===== emparejar con comprobante / asiento (preservado) =====
    const [matchModal, setMatchModal] = useState({ open: false, movement: null, suggestions: [], journalEntries: [], voucherId: '', loadingSug: false });

    const openMatchModal = async (mov) => {
        setMatchModal({ open: true, movement: mov, suggestions: [], journalEntries: [], voucherId: '', loadingSug: true });
        try {
            const urlV = base_url(['api', 'v1', 'bank-accounts', id, 'financial-movements', mov.id, 'voucher-suggestions']);
            const urlJ = base_url(['api', 'v1', 'bank-accounts', id, 'financial-movements', mov.id, 'journal-entry-suggestions']);
            const [resV, resJ] = await Promise.all([
                fetchHelper.get(urlV, {}, 1, false, true).catch(() => ({ data: [] })),
                fetchHelper.get(urlJ, {}, 1, false, true).catch(() => ({ data: [] })),
            ]);
            setMatchModal((m) => ({
                ...m,
                suggestions: Array.isArray(resV?.data) ? resV.data : [],
                journalEntries: Array.isArray(resJ?.data) ? resJ.data : [],
                loadingSug: false,
            }));
        } catch {
            setMatchModal((m) => ({ ...m, suggestions: [], journalEntries: [], loadingSug: false }));
        }
    };

    const closeMatchModal = () => setMatchModal({ open: false, movement: null, suggestions: [], journalEntries: [], voucherId: '', loadingSug: false });

    const submitMatch = async (selectedId, type = 'voucher') => {
        const targetId = selectedId || matchModal.voucherId;
        if (!targetId) { notify('Indique un comprobante válido', 'warning'); return; }
        // QA Conciliación (2026-05-25) Bug 7: pedir motivo obligatorio (>=10 caracteres)
        // ANTES de emparejar con un comprobante/asiento, igual que en el emparejamiento
        // manual del Paso 6. El motivo se envía al backend y queda en auditoría.
        const { value: motivo } = await window.Swal.fire({
            title: 'Motivo del emparejamiento',
            input: 'textarea',
            inputLabel: 'Explique por qué este movimiento corresponde a este comprobante/asiento (mínimo 10 caracteres)',
            inputPlaceholder: 'Motivo de la conciliación (entre 10 y 500 caracteres)…',
            inputAttributes: { maxlength: 500 },
            showCancelButton: true, confirmButtonText: 'Emparejar', cancelButtonText: 'Cancelar',
            // QA BNK (2026-06-03) BNK-RF-23: motivo de emparejamiento min 10 / max 500 + clase.
            inputValidator: (v) => {
                const t = (v || '').trim();
                if (t.length < 10) return 'El motivo debe tener al menos 10 caracteres';
                if (t.length > 500) return 'El motivo no puede superar los 500 caracteres';
                if (!/^[\p{L}0-9 .,;_-]+$/u.test(t)) return 'El motivo contiene caracteres no válidos';
                return undefined;
            },
        });
        if (!motivo) return;
        try {
            const endpoint = type === 'journalEntry' ? 'match-journal-entry' : 'match-voucher';
            const url = base_url(['api', 'v1', 'bank-accounts', id, 'financial-movements', matchModal.movement.id, endpoint]);
            await fetchHelper.put(url, { voucherId: Number(targetId), bankAccountId: id, motivo: motivo.trim() }, {}, 1000);
            notify('Movimiento conciliado con el asiento contable');
            closeMatchModal();
            // CONC-3b: refrescar el workspace de la sesión para que el movimiento
            // recién conciliado salga de "extracto libre" y cuente en el cierre.
            if (selectedSessionId) reloadConciliacion(); else refreshMovements();
        } catch (e) {
            notify(e?.msg || 'Error al emparejar', 'danger');
        }
    };

    const submitUnmatch = async (mov) => {
        try {
            const url = base_url(['api', 'v1', 'bank-accounts', id, 'financial-movements', mov.id, 'unmatch']);
            await fetchHelper.put(url, {}, {}, 1000);
            notify('Emparejamiento eliminado');
            refreshMovements();
            if (selectedSessionId) loadLibros(selectedSessionId);
        } catch (e) {
            notify(e?.msg || 'Error', 'danger');
        }
    };

    const matchLabel = (m) => {
        if (m.matchedCheckId) return `Cheque #${m.matchedCheckId}`;
        if (m.matchedVoucherId) return `Comprobante #${m.matchedVoucherId}`;
        if (m.matchedJournalEntryId) return m.matchedJournalEntryNumber || `JE #${m.matchedJournalEntryId}`;
        return '—';
    };

    // ===== F3: matching automático (Paso 4) + aceptar/rechazar (Paso 5) + manual (Paso 6) =====
    const runMatching = async () => {
        if (!selectedSessionId) return;
        setRunning(true);
        try {
            const res = await fetchHelper.post(
                base_url(['api', 'v1', 'banks', 'matching', 'ejecutar-sesion', selectedSessionId]), {}, {}, 1000);
            const r = res?.data ?? res;
            setMatchSummary(r);
            notify(`Matching ejecutado: ${r?.conciliadosAutomaticamente ?? 0} conciliados, ${r?.sugeridos ?? 0} sugeridos, ${r?.ambiguos ?? 0} ambiguos`);
            reloadConciliacion();
        } catch (e) {
            notify(e?.msg || 'No se pudo ejecutar el matching', 'danger');
        } finally {
            setRunning(false);
        }
    };

    const acceptEmp = async (empId) => {
        try {
            await fetchHelper.post(base_url(['api', 'v1', 'banks', 'emparejamientos', empId, 'confirmar']), {}, {}, 1000);
            notify('Emparejamiento aceptado y conciliado');
            reloadConciliacion();
        } catch (e) { notify(e?.msg || 'No se pudo aceptar', 'danger'); }
    };

    const rejectEmp = async (empId) => {
        const { value: motivo } = await window.Swal.fire({
            title: 'Rechazar emparejamiento',
            input: 'textarea',
            inputLabel: 'Motivo del rechazo (mínimo 10 caracteres)',
            inputPlaceholder: 'Explique por qué este emparejamiento es incorrecto…',
            showCancelButton: true, confirmButtonText: 'Rechazar', cancelButtonText: 'Cancelar',
            inputValidator: (v) => (!v || v.trim().length < 10) ? 'El motivo debe tener al menos 10 caracteres' : undefined,
        });
        if (!motivo) return;
        try {
            const res = await fetchHelper.post(
                base_url(['api', 'v1', 'banks', 'emparejamientos', empId, 'rechazar']), { motivo }, {}, 1000);
            const r = res?.data ?? res;
            // R-2: por cada movimiento de extracto liberado, generar su asiento de ajuste
            // en una transacción independiente (evita el rollback-only de encadenar en el backend).
            const extractoIds = r?.extractoMovimientos || [];
            let asientos = 0;
            for (const movId of extractoIds) {
                try {
                    await fetchHelper.post(base_url(['api', 'v1', 'banks', 'ajustes', 'generar']), { financialMovementId: movId }, {}, 0);
                    asientos++;
                } catch (_) { /* movimiento no clasificable: queda libre para el Paso 6 */ }
            }
            notify(`Emparejamiento rechazado. ${asientos > 0 ? asientos + ' asiento(s) de ajuste generado(s).' : 'Genere el asiento en el Paso 6 si aplica.'}`);
            reloadConciliacion();
        } catch (e) { notify(e?.msg || 'No se pudo rechazar', 'danger'); }
    };

    // BNK-RF-36 (QA Bloque BNK 2026-06-03): deshacer el cruce movimiento-comprobante de un
    // emparejamiento CONFIRMADO. Pide motivo (10-500). El backend bloquea si la sesión está
    // cerrada o si hay un cheque asociado, y deja los movimientos en NO_CONCILIADO.
    const desvincularEmp = async (empId) => {
        const { value: motivo } = await window.Swal.fire({
            title: 'Deshacer cruce',
            input: 'textarea',
            inputLabel: 'Motivo del desemparejamiento (mínimo 10 caracteres)',
            inputPlaceholder: 'Explique por qué desvincula este cruce…',
            inputAttributes: { maxlength: 500 },
            showCancelButton: true, confirmButtonText: 'Desvincular', cancelButtonText: 'Cancelar',
            confirmButtonColor: '#dc3545',
            // QA BNK (2026-06-03) BNK-RF-36: motivo del desemparejamiento min 10 / max 500 + clase.
            inputValidator: (v) => {
                const t = (v || '').trim();
                if (t.length < 10) return 'El motivo debe tener al menos 10 caracteres';
                if (t.length > 500) return 'El motivo no puede superar los 500 caracteres';
                if (!/^[\p{L}0-9 .,;_-]+$/u.test(t)) return 'El motivo contiene caracteres no válidos';
                return undefined;
            },
        });
        if (!motivo) return;
        try {
            await fetchHelper.delete(base_url(['api', 'v1', 'banks', 'emparejamientos', empId]), { motivo: motivo.trim() }, {}, 1000);
            notify('Cruce deshecho. Los movimientos vuelven a estar disponibles para conciliar.');
            reloadConciliacion();
        } catch (e) { notify(e?.msg || 'No se pudo deshacer el cruce', 'danger'); }
    };

    const toggleSel = (arr, setArr, value) => setArr(arr.includes(value) ? arr.filter((x) => x !== value) : [...arr, value]);

    const manualMatch = async () => {
        if (!selExt.length && !selLib.length) { notify('Seleccione movimientos a emparejar', 'warning'); return; }
        // CONC-3d: motivo OBLIGATORIO por cada conciliación manual (no uno general).
        if (manualMotivo.trim().length < 10) {
            notify('Escriba el motivo de esta conciliación manual (mínimo 10 caracteres)', 'warning');
            return;
        }
        try {
            // Bug 1: etiquetar el emparejamiento manual con la sesión para que el Paso 5
            // lo liste solo dentro de ella.
            const body = { bankAccountId: id, extractoIds: selExt, librosIds: selLib, motivo: manualMotivo.trim(),
                reconciliationSessionId: selectedSessionId ? Number(selectedSessionId) : null };
            await fetchHelper.post(base_url(['api', 'v1', 'banks', 'emparejamientos']), body, {}, 1000);
            notify('Emparejamiento manual creado');
            setSelExt([]); setSelLib([]); setManualMotivo('');
            reloadConciliacion();
        } catch (e) { notify(e?.msg || 'No se pudo emparejar', 'danger'); }
    };

    const generateAdjustment = async (movId) => {
        try {
            const res = await fetchHelper.post(base_url(['api', 'v1', 'banks', 'ajustes', 'generar']), { financialMovementId: movId }, {}, 1000);
            const r = res?.data ?? res;
            notify('Asiento de ajuste generado (BORRADOR)' + (r?.voucherCode ? ': ' + r.voucherCode : ''));
            reloadConciliacion();
        } catch (e) { notify(e?.msg || 'No se pudo generar el asiento. Verifique la clasificación del movimiento.', 'danger'); }
    };

    // HU-068 E8/E10: corregir la clasificación del pre-procesamiento desde el Paso 3.
    const corregirClasificacion = async (m) => {
        const { value: form } = await window.Swal.fire({
            title: `Corregir clasificación — mov #${m.id}`,
            html: `<div class="text-start small text-muted mb-2">${m.descripcion || ''}</div>`
                + `<input id="sw-tipo" class="swal2-input" placeholder="Tipo de movimiento" value="${m.tipoMovimiento || ''}">`
                + `<input id="sw-cuenta" class="swal2-input" placeholder="Cuenta PUC sugerida" value="${m.cuentaPucSugerida || ''}">`,
            focusConfirm: false, showCancelButton: true, confirmButtonText: 'Guardar', cancelButtonText: 'Cancelar',
            preConfirm: () => ({ tipoMovimiento: document.getElementById('sw-tipo').value, cuentaPucSugerida: document.getElementById('sw-cuenta').value }),
        });
        if (!form) return;
        try {
            await fetchHelper.put(base_url(['api', 'v1', 'banks', 'preprocesamiento', 'movimiento', m.id, 'clasificacion']), form, {}, 0, true);
            await loadExtracto(selectedSessionId);
            window.Swal.fire({ icon: 'success', title: 'Clasificación corregida (confianza 100)', timer: 1300, showConfirmButton: false });
        } catch { /* error ya mostrado */ }
    };

    const sumSel = (arr, pool) => pool.filter((m) => arr.includes(m.id)).reduce((s, m) => s + Math.abs(Number(m.monto ?? m.importe ?? m.amount ?? 0)), 0);

    // ===== crear / retomar sesión rica =====
    const createSession = async () => {
        if (!sessionForm.periodStart || !sessionForm.periodEnd) {
            notify('Indique la fecha inicial y final del período', 'warning');
            return;
        }
        try {
            const body = {
                bankAccountId: id,
                periodStart: sessionForm.periodStart,
                periodEnd: sessionForm.periodEnd,
            };
            // QA BNK (2026-06-03 / IEEE BNK-RF-37): el saldo del extracto NO es entrada
            // al crear la sesion; se quito del formulario y ya no se envia.
            const res = await fetchHelper.post(
                base_url(['api', 'v1', 'banks', 'sesiones-conciliacion']), body, {}, 1000);
            const created = res?.data ?? res;
            notify('Sesión de conciliación creada (borrador)');
            setSessionForm({ periodStart: '', periodEnd: '' });
            setShowNewSession(false);
            await loadSessions();
            if (created?.id) { setSelectedSessionId(String(created.id)); setActiveStep(1); }
        } catch (e) {
            notify(e?.msg || 'No se pudo crear la sesión', 'danger');
        }
    };

    // QA reeval Q3: eliminar una sesión en BORRADOR para reajustar fechas cuando
    // se solapa con el rango que el usuario quiere conciliar. Solo BORRADOR.
    const eliminarBorrador = async () => {
        if (!selectedSession || selectedSession.estado !== 'BORRADOR') return;
        const c = await window.Swal.fire({
            title: 'Eliminar borrador',
            html: `¿Eliminar la sesión en borrador <b>#${selectedSession.id}</b> `
                + `(${selectedSession.periodStart} → ${selectedSession.periodEnd})?`
                + `<br/><span class="small text-muted">Podrá volver a crear la conciliación con las fechas ajustadas.</span>`,
            icon: 'warning', showCancelButton: true, confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar', confirmButtonColor: '#d33',
        });
        if (!c.isConfirmed) return;
        try {
            await fetchHelper.delete(sUrl(selectedSession.id), {}, {}, 0, true);
            notify('Borrador eliminado. Puede crear la conciliación con las fechas ajustadas.');
            setSelectedSessionId('');
            await loadSessions();
        } catch (e) { notify(e?.msg || 'No se pudo eliminar el borrador', 'danger'); }
    };

    // ===== importar extracto CSV (preservado; F2 lo filtra por período) =====
    const importCsv = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        // QA BNK (2026-06-03) BNK-RF-22/34: extension .csv, nombre solo
        // alfanumericos/puntos/guiones/guion_bajo (sin espacios ni simbolos),
        // tamano maximo 20 MB.
        if (!/\.csv$/i.test(file.name)) { notify('El archivo debe tener extensión .csv', 'warning'); e.target.value = ''; return; }
        const baseName = file.name.replace(/\.csv$/i, '');
        if (!/^[A-Za-z0-9._-]+$/.test(baseName)) { notify('El nombre del archivo solo admite letras, números, puntos, guiones y guion bajo (sin espacios ni símbolos)', 'warning'); e.target.value = ''; return; }
        if (file.size > 20 * 1024 * 1024) { notify('El archivo supera el tamaño máximo permitido (20 MB)', 'warning'); e.target.value = ''; return; }
        const fd = new FormData();
        fd.append('file', file);
        // Conciliación I2/I3: la importación se acota al período de la sesión seleccionada.
        if (selectedSessionId) fd.append('sesionConciliacionId', selectedSessionId);
        try {
            const url = base_url(['api', 'v1', 'bank-accounts', id, 'financial-movements', 'import-csv']);
            const res = await fetchHelper.postForm(url, fd, {}, 1000);
            const info = res?.data;
            // Preferir el mensaje del backend (incluye el reporte I3 de filas fuera de rango).
            // Éxito → clave `message` (SuccessRespondJson); error → `msg` (ErrorRespondJson).
            notify(res?.message || res?.msg || `Importados ${info?.imported ?? 0} movimientos`);
            e.target.value = '';
            if (selectedSessionId) reloadConciliacion(); else refreshMovements();
        } catch (err) {
            notify(err?.msg || 'Error en importación', 'danger');
        }
    };

    if (!id || Number.isNaN(id)) {
        return <div className="alert alert-warning">Cuenta bancaria no válida.</div>;
    }

    const hasSession = !!selectedSession;
    const Placeholder = ({ fase, children }) => (
        <div className="alert alert-secondary d-flex align-items-start gap-2">
            <i className="ri-tools-line mt-1" />
            <div>
                <strong>Disponible en {fase}.</strong>
                <div className="small text-muted">{children}</div>
            </div>
        </div>
    );

    return (
        <>
            <div className="card mb-4">
                <div className="card-header d-flex flex-wrap justify-content-between align-items-center gap-2">
                    <div>
                        <h5 className="mb-0">Conciliación bancaria</h5>
                        <small className="text-muted">{accountLabel}</small>
                    </div>
                    <Link to="/cash-and-banks/bank-accounts" className="btn btn-sm btn-outline-secondary">
                        <i className="ri-arrow-left-line me-1" /> Volver a cuentas
                    </Link>
                </div>

                <div className="card-body">
                    <AlertPage type={message.type} message={message.message} show={message.show} onChange={clearMsg} />
                    {loading ? <p className="text-muted">Cargando…</p> : null}

                    {/* ===== Pestañas de modo ===== */}
                    <ul className="nav nav-tabs mb-3">
                        <li className="nav-item">
                            <button type="button" className={`nav-link ${viewMode === 'guiada' ? 'active' : ''}`} onClick={() => setViewMode('guiada')}>
                                <i className="ri-git-merge-line me-1" />Conciliación guiada
                            </button>
                        </li>
                        <li className="nav-item">
                            <button type="button" className={`nav-link ${viewMode === 'cerradas' ? 'active' : ''}`} onClick={() => setViewMode('cerradas')}>
                                <i className="ri-archive-line me-1" />Conciliaciones cerradas
                            </button>
                        </li>
                        <li className="nav-item">
                            <button type="button" className={`nav-link ${viewMode === 'herramientas' ? 'active' : ''}`} onClick={() => setViewMode('herramientas')}>
                                <i className="ri-tools-line me-1" />Herramientas
                            </button>
                        </li>
                    </ul>

                    {viewMode === 'guiada' && (
                    <>
                    {/* ===== Barra de sesión ===== */}
                    <div className="border rounded p-3 mb-4 bg-body-secondary bg-opacity-25">
                        <div className="row g-2 align-items-end">
                            <div className="col-md-7">
                                <InputSelectModal
                                    id="selectedSessionId"
                                    label="Sesión de conciliación"
                                    placeholder="Seleccione o cree una sesión"
                                    /* QA Bloque BNK (2026-06-03) Bug 3: el desplegable solo debe
                                       ofrecer sesiones en borrador o en proceso (no CERRADA), para no
                                       volver a registrar movimientos/extractos en una conciliación
                                       cerrada. Las CERRADA viven en la pestaña "Conciliaciones Cerradas". */
                                    options={sessions.filter((s) => s.estado !== 'CERRADA').map((s) => ({
                                        id: s.id,
                                        label: `#${s.id} · ${s.periodStart} → ${s.periodEnd} · ${estadoBadge(s.estado).label} (v${s.version})`,
                                    }))}
                                    value={selectedSessionId}
                                    clearable={true}
                                    emptyMessage="Esta cuenta no tiene sesiones de conciliación todavía"
                                    onChange={(value) => { setSelectedSessionId(value); setActiveStep(1); }}
                                />
                            </div>
                            <div className="col-md-5 text-md-end">
                                {selectedSession?.estado === 'BORRADOR' && (
                                    <button type="button" className="btn btn-outline-danger btn-sm me-2" onClick={eliminarBorrador}>
                                        <i className="ri-delete-bin-line me-1" /> Eliminar borrador
                                    </button>
                                )}
                                <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowNewSession((v) => !v)}>
                                    <i className="ri-add-line me-1" /> Nueva sesión
                                </button>
                            </div>
                        </div>

                        {showNewSession && (
                            <div className="row g-2 align-items-end mt-2 pt-2 border-top">
                                <div className="col-md-4">
                                    <InputDate
                                        id="periodStart" placeholder="dd/mm/yyyy" dateFormat="Y-m-d"
                                        label="Fecha inicial del período" date={sessionForm.periodStart}
                                        onChange={(value) => setSessionForm((f) => ({ ...f, periodStart: value }))}
                                    />
                                </div>
                                <div className="col-md-4">
                                    <InputDate
                                        id="periodEnd" placeholder="dd/mm/yyyy" dateFormat="Y-m-d"
                                        label="Fecha final del período" date={sessionForm.periodEnd}
                                        onChange={(value) => setSessionForm((f) => ({ ...f, periodEnd: value }))}
                                    />
                                </div>
                                {/* QA BNK (2026-06-03 / IEEE BNK-RF-37): la casilla "Saldo extracto (opc.)"
                                    se quito del formulario de crear sesion. Las entradas de RF-37 son
                                    solo cuenta + fecha inicial + fecha final; el saldo del extracto no
                                    es una entrada al crear la sesion. */}
                                <div className="col-md-4">
                                    <button type="button" className="btn btn-success btn-sm w-100" onClick={createSession}>
                                        Crear sesión
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {!hasSession ? (
                        <div className="alert alert-info d-flex align-items-center gap-2">
                            <i className="ri-information-line" />
                            <span>Cree una nueva sesión o seleccione una existente para iniciar la conciliación de esta cuenta.</span>
                        </div>
                    ) : (
                        <>
                            {/* ===== Stepper ===== */}
                            <ul className="nav nav-pills flex-wrap gap-1 mb-4">
                                {STEPS.map((st) => (
                                    <li className="nav-item" key={st.id}>
                                        <button
                                            type="button"
                                            className={`nav-link ${activeStep === st.id ? 'active' : ''}`}
                                            onClick={() => setActiveStep(st.id)}
                                        >
                                            <span className="badge bg-white text-dark me-1">{st.id}</span>{st.label}
                                        </button>
                                    </li>
                                ))}
                            </ul>

                            {/* ===== Paso 1: Sesión y período ===== */}
                            {activeStep === 1 && (
                                <div className="row g-3">
                                    <div className="col-md-6">
                                        <div className="border rounded p-3 h-100">
                                            <h6 className="fw-semibold mb-3">Sesión #{selectedSession.id}</h6>
                                            <table className="table table-sm table-borderless mb-0">
                                                <tbody>
                                                    <tr><td className="text-muted">Período</td><td className="text-end">{selectedSession.periodStart} → {selectedSession.periodEnd}</td></tr>
                                                    <tr><td className="text-muted">Estado</td><td className="text-end"><span className={`badge ${estadoBadge(selectedSession.estado).cls}`}>{estadoBadge(selectedSession.estado).label}</span></td></tr>
                                                    <tr><td className="text-muted">Versión</td><td className="text-end">v{selectedSession.version}</td></tr>
                                                    <tr className="border-top"><td className="text-muted">Saldo extracto</td><td className="text-end">{fmtMoney(selectedSession.saldoExtracto)}</td></tr>
                                                    <tr><td className="text-muted">Saldo libros</td><td className="text-end">{fmtMoney(selectedSession.saldoLibros)}</td></tr>
                                                    <tr><td className="text-muted">Diferencia</td><td className="text-end fw-semibold">{fmtMoney(selectedSession.diferencia)}</td></tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                    <div className="col-md-6">
                                        <div className="alert alert-info h-100 mb-0">
                                            <i className="ri-information-line me-1" />
                                            La cuenta está fijada por la URL; toda la conciliación opera sobre esta sesión y su período.
                                            Continúe al <strong>Paso 2</strong> para revisar los libros del período, luego importe el extracto (Paso 3).
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ===== Paso 2: Libros del período ===== */}
                            {activeStep === 2 && (
                                <div>
                                    <div className="d-flex justify-content-between align-items-center mb-3">
                                        <h6 className="fw-semibold mb-0">Libros contables del período ({selectedSession.periodStart} → {selectedSession.periodEnd})</h6>
                                        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => loadLibros(selectedSessionId)}>
                                            <i className="ri-refresh-line me-1" /> Actualizar
                                        </button>
                                    </div>
                                    <div className="table-responsive">
                                        <table className="table table-sm table-hover">
                                            <thead>
                                                <tr><th>Fecha</th><th className="text-end">Importe</th><th>Descripción</th><th>Ref.</th><th>Estado</th></tr>
                                            </thead>
                                            <tbody>
                                                {libros.map((m) => (
                                                    <tr key={m.id} className={m.bloqueado ? 'text-muted bg-light' : ''}>
                                                        <td>{m.fecha}</td>
                                                        <td className="text-end text-nowrap">{fmtImporte(m.importe)}</td>
                                                        <td>{m.descripcion || '—'}</td>
                                                        <td><small>{m.referencia || '—'}</small></td>
                                                        <td>
                                                            <span className={`badge ${estadoMovBadge(m.estadoVista || m.estadoConciliacion).cls}`}>{estadoMovBadge(m.estadoVista || m.estadoConciliacion).label}</span>
                                                            {m.bloqueado && <i className="ri-lock-2-line ms-1" title="Conciliado previamente; solo lectura"></i>}
                                                        </td>
                                                    </tr>
                                                ))}
                                                {!libros.length && !librosLoading && (
                                                    <tr><td colSpan={5} className="text-center text-muted py-3">No hay movimientos de libro en el período de la sesión.</td></tr>
                                                )}
                                                {librosLoading && (
                                                    <tr><td colSpan={5} className="text-center text-muted py-3">Cargando…</td></tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* ===== Paso 3: Extracto bancario (import CSV + movimientos, preservado) ===== */}
                            <div style={{ display: activeStep === 3 ? 'block' : 'none' }}>
                                <h6 className="fw-semibold mb-3">Importar extracto bancario (CSV)</h6>
                                <div className="alert alert-info py-2 mb-3 small">
                                    <i className="ri-information-line me-1" />
                                    Cargue las líneas del extracto desde un CSV (<code>fecha;importe;descripcion;referencia</code>).
                                    Solo se importan las filas dentro del período de la sesión (<strong>{selectedSession.periodStart} → {selectedSession.periodEnd}</strong>);
                                    las filas fuera de rango se descartan y se reportan.
                                </div>
                                <label className="form-label small">Archivo CSV</label>
                                <input type="file" accept=".csv,text/csv" className="form-control mb-4" onChange={importCsv} />

                                <div className="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-2">
                                    <h6 className="fw-semibold mb-0">Extracto del período (importado)</h6>
                                    <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => loadExtracto(selectedSessionId)}>
                                        <i className="ri-refresh-line me-1" /> Actualizar
                                    </button>
                                </div>
                                <div className="alert alert-light border py-2 mb-2 small">
                                    <i className="ri-magic-line me-1" />
                                    Al importar, cada línea se <strong>clasifica automáticamente</strong> (tipo + cuenta PUC sugerida) por las reglas de clasificación. Si una quedó mal clasificada, corríjala con el botón de la columna Acción (queda con confianza 100).
                                </div>
                                <div className="table-responsive mb-4">
                                    <table className="table table-sm table-hover">
                                        <thead><tr><th>Fecha</th><th className="text-end">Importe</th><th>Descripción</th><th>Tipo</th><th className="text-center">Conf.</th><th>PUC</th><th>Estado</th><th className="text-end">Acción</th></tr></thead>
                                        <tbody>
                                            {extracto.map((m) => (
                                                <tr key={m.id} className={m.bloqueado ? 'text-muted bg-light' : ''}>
                                                    <td>{m.fecha}</td>
                                                    <td className="text-end text-nowrap">{fmtImporte(m.importe)}</td>
                                                    <td>{m.descripcion || '—'}{m.referencia ? <small className="text-muted d-block">Ref: {m.referencia}</small> : null}</td>
                                                    <td><small>{m.tipoMovimiento || '—'}</small></td>
                                                    <td className="text-center"><span className={`badge ${confBadge(m.clasificacionConfianza)}`}>{m.clasificacionConfianza ?? '—'}</span></td>
                                                    <td><small>{m.cuentaPucSugerida || '—'}</small></td>
                                                    <td>
                                                        <span className={`badge ${estadoMovBadge(m.estadoVista || m.estadoConciliacion).cls}`}>{estadoMovBadge(m.estadoVista || m.estadoConciliacion).label}</span>
                                                        {m.bloqueado && <i className="ri-lock-2-line ms-1" title="Conciliado; solo lectura"></i>}
                                                    </td>
                                                    <td className="text-end">
                                                        {!m.bloqueado && (
                                                            <button type="button" className="btn btn-sm btn-icon btn-text-secondary" title="Corregir clasificación" onClick={() => corregirClasificacion(m)}>
                                                                <i className="ri-edit-line" />
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                            {!extracto.length && !extractoLoading && (
                                                <tr><td colSpan={8} className="text-center text-muted py-3">Aún no se ha importado extracto para esta sesión.</td></tr>
                                            )}
                                            {extractoLoading && <tr><td colSpan={8} className="text-center text-muted py-3">Cargando…</td></tr>}
                                        </tbody>
                                    </table>
                                </div>

                                {/* CONC-1: la antigua tabla "Movimientos de la cuenta" (con
                                    Emparejar/Quitar y el menu Opciones) se RETIRO del Paso 3.
                                    Era redundante con el extracto importado de arriba y con los
                                    Pasos 4-6 de matching de la sesion, y confundia al usuario
                                    (no cumplia ninguna funcion propia del flujo guiado). */}
                            </div>

                            {/* ===== Paso 4: Matching automático ===== */}
                            {activeStep === 4 && (
                                <div>
                                    <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                                        <h6 className="fw-semibold mb-0">Matching automático (5 pistas)</h6>
                                        <button type="button" className="btn btn-primary btn-sm" onClick={runMatching} disabled={running}>
                                            <i className="ri-flashlight-line me-1" />{running ? 'Ejecutando…' : 'Ejecutar matching de la sesión'}
                                        </button>
                                    </div>
                                    <div className="alert alert-info py-2 small">
                                        <i className="ri-information-line me-1" />
                                        Compara el extracto importado contra los libros del período (exacto, casi exacto, por puntaje y sumas N:1 / 1:N). Lo seguro se concilia solo; el resto queda como propuesta para el Paso 5.
                                    </div>
                                    {matchSummary && (
                                        <div className="row g-2 mb-2">
                                            {[
                                                ['Extracto', matchSummary.totalExtracto, 'secondary'],
                                                ['Libros', matchSummary.totalLibros, 'secondary'],
                                                ['Conciliados', matchSummary.conciliadosAutomaticamente, 'success'],
                                                ['Sugeridos', matchSummary.sugeridos, 'warning'],
                                                ['Ambiguos', matchSummary.ambiguos, 'danger'],
                                                ['Extracto sin pareja', matchSummary.sinMatchExtracto, 'info'],
                                                ['Libros sin pareja', matchSummary.librosSinPareja, 'info'],
                                            ].map(([lbl, val, color]) => (
                                                <div className="col-6 col-md-3" key={lbl}>
                                                    <div className={`border rounded p-2 text-center bg-label-${color}`}>
                                                        <div className="h5 mb-0">{val ?? 0}</div>
                                                        <small>{lbl}</small>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {/* CONC-2: antes mostraba "aún no ejecutado" aunque ya se hubiera
                                        corrido en una visita previa (matchSummary solo vive en memoria de
                                        esta carga). Ahora se detecta también por los emparejamientos ya
                                        persistidos de la sesión. */}
                                    {!matchSummary && emparejamientos.length > 0 && (
                                        <div className="alert alert-success py-2 small mb-0">
                                            <i className="ri-check-line me-1" />
                                            El matching ya se ejecutó para esta sesión: hay <strong>{emparejamientos.length}</strong> emparejamiento(s). Revíselos en el <strong>Paso 5</strong>, o vuelva a ejecutar para recalcular.
                                        </div>
                                    )}
                                    {!matchSummary && emparejamientos.length === 0 && (
                                        <p className="text-muted small">Aún no se ha ejecutado el matching de esta sesión.</p>
                                    )}
                                </div>
                            )}

                            {/* ===== Paso 5: Aceptar / Rechazar ===== */}
                            {activeStep === 5 && (
                                <div>
                                    <h6 className="fw-semibold mb-3">Emparejamientos propuestos</h6>
                                    <div className="table-responsive">
                                        <table className="table table-sm">
                                            <thead><tr><th>#</th><th>Tipo</th><th>Método</th><th className="text-end">Score</th><th className="text-end">Σ Extracto</th><th className="text-end">Σ Libros</th><th>Estado</th><th className="text-end">Acciones</th></tr></thead>
                                            <tbody>
                                                {emparejamientos.map((e) => {
                                                    const badge = { CONFIRMADO: 'bg-label-success', PROPUESTO: 'bg-label-warning', AMBIGUO: 'bg-label-danger' }[e.estado] || 'bg-label-secondary';
                                                    const decidible = e.estado === 'PROPUESTO' || e.estado === 'AMBIGUO';
                                                    return (
                                                        <tr key={e.id}>
                                                            <td>{e.id}</td><td><small>{traducir(e.tipo)}</small></td><td><small>{traducir(e.metodo)}</small></td>
                                                            <td className="text-end">{e.score}</td>
                                                            <td className="text-end text-nowrap">{formatPrice(e.sumaExtracto)}</td>
                                                            <td className="text-end text-nowrap">{formatPrice(e.sumaLibros)}</td>
                                                            <td><span className={`badge ${badge}`}>{traducir(e.estado)}</span></td>
                                                            <td className="text-end text-nowrap">
                                                                {decidible ? (
                                                                    <>
                                                                        <button type="button" className="btn btn-sm btn-success me-1" onClick={() => acceptEmp(e.id)}>Aceptar</button>
                                                                        <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => rejectEmp(e.id)}>Rechazar</button>
                                                                    </>
                                                                ) : e.estado === 'CONFIRMADO' ? (
                                                                    /* BNK-RF-36: deshacer el cruce de un emparejamiento ya confirmado. */
                                                                    <button type="button" className="btn btn-sm btn-outline-danger" title="Deshacer cruce" onClick={() => desvincularEmp(e.id)}>
                                                                        <i className="ri-link-unlink me-1"></i> Desvincular
                                                                    </button>
                                                                ) : <span className="text-muted small">—</span>}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                                {!emparejamientos.length && <tr><td colSpan={8} className="text-center text-muted py-3">No hay emparejamientos. Ejecute el matching en el Paso 4.</td></tr>}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* ===== Paso 6: Emparejamiento manual + M2 (sin contraparte) ===== */}
                            {activeStep === 6 && (
                                <div>
                                    <div className="alert alert-info py-2 small">
                                        <i className="ri-information-line me-1" />
                                        Seleccione movimientos del extracto y de libros para emparejarlos manualmente (1:1, 1:N, N:1, N:M); la fecha no restringe la selección. Cada emparejamiento exige su propio motivo.
                                        Para un movimiento del extracto sin contraparte en libros, use <i className="ri-link"></i> <strong>Emparejar con asiento contable</strong> existente, o <i className="ri-external-link-line"></i> <strong>Crear asiento en Contabilidad General</strong> y luego emparejarlo.
                                    </div>
                                    <div className="row g-3">
                                        <div className="col-md-6">
                                            <h6 className="small fw-semibold">Extracto libre <span className="text-muted">(Σ sel. {formatPrice(sumSel(selExt, wsExtracto))})</span></h6>
                                            <div className="table-responsive" style={{ maxHeight: 320, overflowY: 'auto' }}>
                                                <table className="table table-sm">
                                                    <tbody>
                                                        {wsExtracto.map((m) => (
                                                            <tr key={m.id}>
                                                                <td style={{ width: 30 }}><input type="checkbox" className="form-check-input" checked={selExt.includes(m.id)} onChange={() => toggleSel(selExt, setSelExt, m.id)} /></td>
                                                                <td className="small">{m.fecha}</td>
                                                                <td className="text-end small text-nowrap">{formatPrice(m.monto ?? m.importe)}</td>
                                                                <td className="small">{m.descripcion}</td>
                                                                <td className="text-end text-nowrap">
                                                                    {/* CONC-3b: emparejar el movimiento del extracto con un asiento contable existente. */}
                                                                    <button type="button" className="btn btn-sm btn-icon btn-text-primary" title="Emparejar con un asiento contable existente" onClick={() => openMatchModal({ id: m.id, movementDate: m.fecha, amount: (m.monto ?? m.importe) })}><i className="ri-link"></i></button>
                                                                    {/* CONC-3c: crear el asiento en Contabilidad General (comprobantes) y luego volver a emparejarlo. */}
                                                                    <button type="button" className="btn btn-sm btn-icon btn-text-secondary" title="Crear asiento en Contabilidad General" onClick={() => navigate('/contabilidad/comprobantes')}><i className="ri-external-link-line"></i></button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                        {!wsExtracto.length && <tr><td colSpan={5} className="text-center text-muted small py-2">Sin extracto libre.</td></tr>}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                        <div className="col-md-6">
                                            <h6 className="small fw-semibold">Libros libres <span className="text-muted">(Σ sel. {formatPrice(sumSel(selLib, wsLibros))})</span></h6>
                                            <div className="table-responsive" style={{ maxHeight: 320, overflowY: 'auto' }}>
                                                <table className="table table-sm">
                                                    <tbody>
                                                        {wsLibros.map((m) => (
                                                            <tr key={m.id}>
                                                                <td style={{ width: 30 }}><input type="checkbox" className="form-check-input" checked={selLib.includes(m.id)} onChange={() => toggleSel(selLib, setSelLib, m.id)} /></td>
                                                                <td className="small">{m.fecha}</td>
                                                                <td className="text-end small text-nowrap">{formatPrice(m.monto ?? m.importe)}</td>
                                                                <td className="small">{m.descripcion}</td>
                                                            </tr>
                                                        ))}
                                                        {!wsLibros.length && <tr><td colSpan={4} className="text-center text-muted small py-2">Sin libros libres.</td></tr>}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-2">
                                        <label className="form-label small">Motivo de la conciliación manual <span className="text-danger">*</span> <span className="text-muted">(obligatorio, mínimo 10 caracteres — uno por cada emparejamiento)</span></label>
                                        <textarea className="form-control form-control-sm" rows={2} value={manualMotivo} onChange={(e) => setManualMotivo(e.target.value)} placeholder="Explique por qué estos movimientos corresponden entre sí…" />
                                    </div>
                                    <button type="button" className="btn btn-primary btn-sm mt-2" onClick={manualMatch} disabled={(!selExt.length && !selLib.length) || manualMotivo.trim().length < 10}>
                                        <i className="ri-links-line me-1" />Emparejar seleccionados
                                    </button>
                                </div>
                            )}

                            {/* ===== Paso 7: Cierre y firma ===== */}
                            {activeStep === 7 && (
                                <div>
                                    <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                                        <h6 className="fw-semibold mb-0">Cierre y firma de la conciliación</h6>
                                        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => loadCierre(selectedSessionId)}>
                                            <i className="ri-refresh-line me-1" />Actualizar
                                        </button>
                                    </div>

                                    {/* C1: estado de conciliación en cero */}
                                    <div className={`alert d-flex align-items-start gap-2 ${cierre?.enCero ? 'alert-success' : 'alert-warning'}`}>
                                        <i className={`mt-1 ${cierre?.enCero ? 'ri-checkbox-circle-line' : 'ri-error-warning-line'}`} />
                                        <div>
                                            {cierre?.enCero
                                                ? <span><strong>Conciliación en cero.</strong> Puede iniciar el cierre con firma del responsable.</span>
                                                : <span><strong>Faltan {cierre?.pendientes ?? '…'} movimiento(s) por conciliar.</strong> El cierre solo procede con la conciliación en cero: concílielos o genere los asientos de ajuste en los Pasos 4–6.</span>}
                                        </div>
                                    </div>

                                    {/* progreso */}
                                    <div className="row g-2 mb-3">
                                        {[
                                            ['Extracto conciliado', `${cierre?.extractoConciliado ?? 0}/${cierre?.totalExtracto ?? 0}`, 'secondary'],
                                            ['Libros conciliados', `${cierre?.librosConciliado ?? 0}/${cierre?.totalLibros ?? 0}`, 'secondary'],
                                            ['Pendientes', cierre?.pendientes ?? 0, (cierre?.pendientes ? 'warning' : 'success')],
                                        ].map(([lbl, val, color]) => (
                                            <div className="col-12 col-md-4" key={lbl}>
                                                <div className={`border rounded p-2 text-center bg-label-${color}`}>
                                                    <div className="h5 mb-0">{val}</div><small>{lbl}</small>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* QA Conciliación (2026-05-25) Bug 2/5: flujo de firma ÚNICA de
                                        responsable. Sin segregación (la misma persona firma y cierra),
                                        sin estados intermedios EN_REVISION/APROBADA. */}
                                    <div className="border rounded p-3">
                                        <div className="d-flex align-items-center flex-wrap gap-2 mb-3">
                                            <span className="text-muted small">Estado:</span>
                                            <span className={`badge ${estadoBadge(selectedSession.estado).cls}`}>{estadoBadge(selectedSession.estado).label}</span>
                                            <span className="text-muted small ms-2">Firma:</span>
                                            <span className={`badge ${selectedSession.firmaElaboradorId ? 'bg-label-success' : 'bg-label-secondary'}`}>Responsable {selectedSession.firmaElaboradorId ? '✓' : '—'}</span>
                                        </div>

                                        {selectedSession.estado !== 'CERRADA' && (
                                            <div className="d-flex flex-wrap gap-2">
                                                <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => firmarSesion(selectedSession.id, 'RESPONSABLE')}>
                                                    <i className="ri-quill-pen-line me-1" />Firmar como responsable
                                                </button>
                                                <button type="button" className="btn btn-sm btn-success"
                                                    disabled={!cierre?.enCero || !selectedSession.firmaElaboradorId}
                                                    title={!cierre?.enCero ? 'La conciliación debe estar en cero' : (!selectedSession.firmaElaboradorId ? 'Firme primero como responsable' : '')}
                                                    onClick={() => accionSesion(selectedSession.id, 'cerrar-responsable', 'Conciliación cerrada')}>
                                                    <i className="ri-lock-2-line me-1" />Cerrar y generar informe
                                                </button>
                                            </div>
                                        )}
                                        {selectedSession.estado === 'CERRADA' && (
                                            <div className="d-flex flex-wrap gap-2">
                                                <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => descargarPdf(selectedSession.id)}><i className="ri-download-line me-1" />Descargar informe PDF</button>
                                                <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => verificarFirmas(selectedSession.id)}><i className="ri-shield-check-line me-1" />Verificar firmas</button>
                                                <button type="button" className="btn btn-sm btn-outline-warning" onClick={() => solicitarReapertura(selectedSession.id)}><i className="ri-folder-open-line me-1" />Reabrir conciliación</button>
                                                {/* QA 2026-05-28: boton "Solicitudes" ocultado a peticion del usuario.
                                                    La logica `verSolicitudes` y el endpoint backend `/sesiones/{sid}/solicitudes`
                                                    siguen intactos; para reactivar el boton, descomentar la siguiente linea. */}
                                                {/* <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => verSolicitudes(selectedSession.id)}><i className="ri-list-check-2 me-1" />Solicitudes</button> */}
                                                <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => verHistorial(selectedSession.id)}><i className="ri-history-line me-1" />Historial</button>
                                            </div>
                                        )}
                                        <div className="mt-3 small text-muted">
                                            <i className="ri-information-line me-1" />El responsable firma y cierra la conciliación en un solo paso. El cierre genera el informe PDF firmado y exige conciliación en cero.
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                    </>
                    )}

                    {/* ===== Vista: Conciliaciones cerradas (Sec 12) ===== */}
                    {viewMode === 'cerradas' && (
                        <div>
                            <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                                <h6 className="fw-semibold mb-0">Conciliaciones cerradas de la cuenta</h6>
                                <div className="d-flex align-items-center gap-3">
                                    <div className="form-check form-switch mb-0">
                                        <input className="form-check-input" type="checkbox" id="showArch" checked={showArchivadas} onChange={(e) => setShowArchivadas(e.target.checked)} />
                                        <label className="form-check-label small" htmlFor="showArch">Ver archivadas</label>
                                    </div>
                                    <button type="button" className="btn btn-sm btn-outline-secondary" onClick={loadCerradas}><i className="ri-refresh-line me-1" />Actualizar</button>
                                </div>
                            </div>
                            <div className="table-responsive">
                                <table className="table table-sm table-hover">
                                    <thead><tr><th>#</th><th>Período</th><th>Versión</th><th>Cerrada</th><th>Estado</th><th className="text-end">Acciones</th></tr></thead>
                                    <tbody>
                                        {cerradas.map((s) => (
                                            <tr key={s.id}>
                                                <td>{s.id}</td>
                                                <td className="small">{s.periodStart} → {s.periodEnd}</td>
                                                <td>v{s.version}</td>
                                                <td className="small">{s.cerradaAt ? String(s.cerradaAt).slice(0, 10) : '—'}</td>
                                                <td><span className="badge bg-label-success">Cerrada</span></td>
                                                <td className="text-end text-nowrap">
                                                    <button type="button" className="btn btn-sm btn-icon btn-text-secondary" title="Descargar informe PDF" onClick={() => descargarPdf(s.id)}><i className="ri-download-line" /></button>
                                                    <button type="button" className="btn btn-sm btn-icon btn-text-secondary" title="Verificar firmas" onClick={() => verificarFirmas(s.id)}><i className="ri-shield-check-line" /></button>
                                                    <button type="button" className="btn btn-sm btn-icon btn-text-warning" title="Reabrir conciliación" onClick={() => solicitarReapertura(s.id)}><i className="ri-folder-open-line" /></button>
                                                    <button type="button" className="btn btn-sm btn-icon btn-text-secondary" title="Historial de versiones" onClick={() => verHistorial(s.id)}><i className="ri-history-line" /></button>
                                                    <button type="button" className="btn btn-sm btn-icon btn-text-danger" title={s.archivable ? 'Archivar (cerrada hace +1 año)' : 'Archivable tras 1 año del cierre'} disabled={!s.archivable} onClick={() => archivarSesion(s.id)}><i className="ri-archive-line" /></button>
                                                </td>
                                            </tr>
                                        ))}
                                        {!cerradas.length && <tr><td colSpan={6} className="text-center text-muted py-3">No hay conciliaciones cerradas para esta cuenta.</td></tr>}
                                    </tbody>
                                </table>
                            </div>

                            {showArchivadas && (
                                <>
                                    <h6 className="fw-semibold mb-2 mt-4">Archivadas <small className="text-muted">(solo lectura · informe conservado 10 años en Soportes)</small></h6>
                                    <div className="table-responsive">
                                        <table className="table table-sm">
                                            <thead><tr><th>#</th><th>Período</th><th>Versión</th><th>Archivada</th><th className="text-end">Acciones</th></tr></thead>
                                            <tbody>
                                                {archivadas.map((s) => (
                                                    <tr key={s.id} className="text-muted">
                                                        <td>{s.id}</td>
                                                        <td className="small">{s.periodStart} → {s.periodEnd}</td>
                                                        <td>v{s.version}</td>
                                                        <td className="small">{s.archivadaAt ? String(s.archivadaAt).slice(0, 10) : '—'}</td>
                                                        <td className="text-end text-nowrap">
                                                            <button type="button" className="btn btn-sm btn-icon btn-text-secondary" title="Descargar informe PDF" onClick={() => descargarPdf(s.id)}><i className="ri-download-line" /></button>
                                                            <button type="button" className="btn btn-sm btn-icon btn-text-secondary" title="Historial de versiones" onClick={() => verHistorial(s.id)}><i className="ri-history-line" /></button>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {!archivadas.length && <tr><td colSpan={5} className="text-center text-muted py-3">No hay conciliaciones archivadas.</td></tr>}
                                            </tbody>
                                        </table>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* ===== Vista: Herramientas de conciliación por-cuenta (F4.7) ===== */}
                    {viewMode === 'herramientas' && (
                        <div>
                            {/* CONC-5: la pestaña Herramientas ya no expone los apartados sueltos
                                (partidas, GMF, antigüedad, cruce FE, diferencia en cambio): ahora
                                contiene los reportes de la sesión, la conservación de soportes, la
                                reapertura y el versionado. */}
                            <div className="alert alert-info py-2 small d-flex align-items-start gap-2">
                                <i className="ri-information-line mt-1" />
                                <div>Herramientas de la conciliación de <strong>esta cuenta</strong> ({accountLabel}): reportes de la sesión, conservación de soportes, reapertura y versionado.</div>
                            </div>

                            {/* Reportes / reapertura / versionado de la sesión seleccionada.
                                QA BNK (2026-06-04) Caso 3: el VERSIONADO (badge de versión, "Reabrir
                                conciliación" e "Historial de versiones") corresponde a las
                                conciliaciones CERRADAS/REABIERTAS, no a las que están en BORRADOR /
                                revisión / aprobadas. Por eso esos elementos solo se muestran cuando la
                                sesión está cerrada; para el resto se muestran solo los reportes. */}
                            <div className="border rounded p-3 mb-4">
                                <h6 className="fw-semibold mb-3"><i className="ri-file-chart-line me-1" />{['CERRADA', 'REABIERTA'].includes(selectedSession?.estado) ? 'Reportes y versionado de la sesión' : 'Reportes de la sesión'}</h6>
                                {selectedSession ? (
                                    <>
                                        <div className="mb-2 small text-muted">
                                            Sesión #{selectedSession.id} · {selectedSession.periodStart} → {selectedSession.periodEnd} ·
                                            <span className={`badge ms-1 ${estadoBadge(selectedSession.estado).cls}`}>{estadoBadge(selectedSession.estado).label}</span>
                                            {['CERRADA', 'REABIERTA'].includes(selectedSession.estado) ? ` · v${selectedSession.version}` : ''}
                                        </div>
                                        <div className="d-flex flex-wrap gap-2">
                                            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => descargarPdf(selectedSession.id)}><i className="ri-download-line me-1" />Informe PDF</button>
                                            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => verificarFirmas(selectedSession.id)}><i className="ri-shield-check-line me-1" />Verificar firmas</button>
                                            {['CERRADA', 'REABIERTA'].includes(selectedSession.estado) && (
                                                <>
                                                    <button type="button" className="btn btn-sm btn-outline-warning" onClick={() => solicitarReapertura(selectedSession.id)}><i className="ri-folder-open-line me-1" />Reabrir conciliación</button>
                                                    {/* QA 2026-05-28: boton "Solicitudes" ocultado a peticion del usuario (ambas instancias del archivo).
                                                        Para reactivar, descomentar la siguiente linea. */}
                                                    {/* <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => verSolicitudes(selectedSession.id)}><i className="ri-list-check-2 me-1" />Solicitudes</button> */}
                                                    <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => verHistorial(selectedSession.id)}><i className="ri-history-line me-1" />Historial de versiones</button>
                                                </>
                                            )}
                                        </div>
                                    </>
                                ) : (
                                    <div className="alert alert-secondary mb-0 small">Seleccione una sesión en la pestaña <strong>Conciliación guiada</strong> para ver sus reportes y versiones.</div>
                                )}
                            </div>

                            {/* Conservación de soportes (extractos + hash SHA-256 + retención 10 años) */}
                            <h6 className="fw-semibold mb-2"><i className="ri-folder-shield-2-line me-1" />Conservación de soportes</h6>
                            <SoportesConciliacion embeddedAccountId={id} />
                        </div>
                    )}
                </div>
            </div>

            {/* ===== Modal emparejar (preservado) ===== */}
            {matchModal.open && (
                <div className="modal fade show d-block" tabIndex={-1} style={{ background: 'rgba(0,0,0,0.4)' }}>
                    <div className="modal-dialog modal-dialog-centered modal-lg">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Emparejar con comprobante</h5>
                                <button type="button" className="btn-close" onClick={closeMatchModal} aria-label="Cerrar" />
                            </div>
                            <div className="modal-body">
                                <AlertPage type={message.type} message={message.message} show={message.show} onChange={clearMsg} />
                                <p className="small text-muted mb-2">
                                    Movimiento {matchModal.movement?.movementDate} — {formatPrice(matchModal.movement?.amount)}
                                </p>
                                {matchModal.loadingSug ? <p>Cargando sugerencias…</p> : null}

                                {!matchModal.loadingSug && matchModal.suggestions.length > 0 && (
                                    <>
                                        <h6 className="mt-2">Vouchers (comprobantes de pago)</h6>
                                        <div className="table-responsive mb-3">
                                            <table className="table table-sm">
                                                <thead><tr><th>#</th><th>Fecha</th><th>Importe</th><th>Descripción</th><th /></tr></thead>
                                                <tbody>
                                                    {matchModal.suggestions.map((s) => (
                                                        <tr key={`v-${s.id}`}>
                                                            <td>{s.number}</td><td>{s.date}</td><td>{formatPrice(s.amount)}</td>
                                                            <td><small>{s.description}</small></td>
                                                            <td><button type="button" className="btn btn-sm btn-success" onClick={() => submitMatch(s.id, 'voucher')}>Usar</button></td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </>
                                )}

                                {!matchModal.loadingSug && matchModal.journalEntries.length > 0 && (
                                    <>
                                        <h6 className="mt-2">Asientos contables disponibles</h6>
                                        <div className="table-responsive mb-3">
                                            <table className="table table-sm">
                                                <thead><tr><th>Asiento</th><th>Fecha</th><th>Total</th><th>Relevancia</th><th>Descripción</th><th /></tr></thead>
                                                <tbody>
                                                    {matchModal.journalEntries.map((j) => (
                                                        <tr key={`j-${j.id}`}>
                                                            <td><span className="badge bg-label-primary">{j.number}</span></td>
                                                            <td>{j.date}</td><td>{formatPrice(j.amount)}</td>
                                                            <td>{j.affectsAccount ? <span className="badge bg-label-success">✓ Afecta cuenta</span> : <span className="badge bg-label-secondary">No afecta</span>}</td>
                                                            <td><small>{j.description}</small></td>
                                                            <td><button type="button" className="btn btn-sm btn-primary" onClick={() => submitMatch(j.id, 'journalEntry')}>Usar</button></td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </>
                                )}

                                {!matchModal.loadingSug && !matchModal.suggestions.length && !matchModal.journalEntries.length && (
                                    <div className="alert alert-warning" role="alert">
                                        <strong>No hay comprobantes ni asientos disponibles.</strong> Registre pagos, cobros o asientos que afecten esta cuenta (ventana ±7 días).
                                    </div>
                                )}

                                {vouchers.length > 0 && (
                                    <>
                                        <InputSelectModal
                                            id="voucherId" label="Voucher manual (lista completa)" placeholder="Selecciona un voucher"
                                            options={vouchers.map((v) => ({ id: v.id, label: `${v.number} - ${formatPrice(v.amount)} - ${v.date}` }))}
                                            value={matchModal.voucherId} clearable={true}
                                            emptyMessage="No hay vouchers asociados a esta cuenta bancaria"
                                            onChange={(value) => setMatchModal((x) => ({ ...x, voucherId: value }))}
                                        />
                                        <button type="button" className="btn btn-primary mt-2" onClick={() => submitMatch(matchModal.voucherId, 'voucher')}>Emparejar voucher manual</button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default BankReconciliation;
