import { useState, useEffect, useRef, useMemo } from 'react';
import DataTableReference from '../../../components/organism/DataTable';
import GenericFilterModal from '../../../components/organism/GenericFilterModal';
import { fetchHelper } from '../../../utils/fetch';
import { base_url } from '../../../utils/functions';
import AlertPage from '../../../components/molecules/AlertPage';
import CreateComprobante from './create';
import UpdateComprobante from './updated';
import SupportsModal from './supports';

/**
 * Pagina principal de Comprobantes Contables (CG).
 * Muestra un listado paginado con DataTable y permite crear, contabilizar,
 * reversar y eliminar comprobantes (journal entries).
 */

/** Colores de badge por estado de comprobante. */
const STATUS_BADGE = {
    DRAFT:    'bg-label-warning',
    POSTED:   'bg-label-success',
    REVERSED: 'bg-label-danger',
};

/** Etiquetas en espanol por estado. */
const STATUS_LABEL = {
    DRAFT:    'Borrador',
    POSTED:   'Contabilizado',
    REVERSED: 'Reversado',
};

/** Etiquetas de modulo origen. */
const SOURCE_LABEL = {
    CG:  'Contabilidad',
    AP:  'Cuentas por Pagar',
    AR:  'Cuentas por Cobrar',
    BNK: 'Bancos y Cajas',
    ACT: 'Activos Fijos',
    NOM: 'Nomina',
};

/** Formatea valores monetarios en formato colombiano. */
const formatCurrency = (val) => {
    if (val === null || val === undefined) return '-';
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 2,
    }).format(Number(val));
};

const IndexCgComprobantes = () => {
    const tableRef            = useRef(null);
    const dataTableRef        = useRef(null);
    const modalCreateRef      = useRef(null);
    const modalCreateInstance = useRef(null);
    const modalUpdateRef      = useRef(null);
    const modalUpdateInstance = useRef(null);
    const filterRef           = useRef(null);
    const filterInstance      = useRef(null);
    // HU-CG-05A/B/C: modal de soportes documentales
    const supportsModalRef      = useRef(null);
    const supportsModalInstance = useRef(null);

    const [data, setData]     = useState([]);
    const [search, setSearch] = useState({ value: '', checked: true });
    const [message, setMessage] = useState({ message: '', type: '', show: false });
    const [editEntryId, setEditEntryId] = useState(null);
    // HU-CG-05A/B/C: estado del modal de soportes (id + voucherCode legible)
    const [supportContext, setSupportContext] = useState({ id: null, voucherCode: '' });

    /** Endpoint de busqueda paginada de comprobantes. */
    const url = ['api', 'v1', 'journal-entries', 'search'];

    /** Columnas del DataTable. */
    const columns = [
        { title: 'Id', data: 'id', name: 'id' },
        {
            title: '# Comprobante', data: 'voucherCode', name: 'entryNumber',
            // HU-CG-08B E3 / HU-CG-08C E2: muestra el voucherCode (REV-/COR-/JE-)
            // y, cuando es una reversion, hipervinculo al asiento original.
            render: (val, _type, row) => {
                const code = val || ('JE-' + (row.fiscalYear || '') + '-' + (row.entryNumber || row.id));
                if (row.reversalOfId) {
                    const origLink = row.reversalOfVoucherCode || ('JE-' + (row.fiscalYear || '') + '-' + (row.reversalOfNumber || ''));
                    return `<span class="badge bg-label-warning">${code}</span>
                            <small class="text-muted d-block">↩ <a href="#" class="rev-link" data-related-id="${row.reversalOfId}">${origLink}</a></small>`;
                }
                if (row.correctionOfId) {
                    return `<span class="badge bg-label-info">${code}</span>`;
                }
                return `<code>${code}</code>`;
            },
        },
        { title: 'Fecha', data: 'entryDate', name: 'entryDate' },
        {
            title: 'Descripcion', data: 'description', name: 'description',
            render: (val) => val || '-',
        },
        {
            title: 'Modulo Origen', data: 'sourceModule', name: 'sourceModule',
            render: (val) => SOURCE_LABEL[val] || val || '-',
        },
        {
            title: 'Estado', data: 'status', name: 'status',
            render: (val) => {
                const badge = STATUS_BADGE[val] || 'bg-label-secondary';
                const label = STATUS_LABEL[val] || val || '-';
                return `<span class="badge ${badge}">${label}</span>`;
            },
        },
        {
            title: 'Total Debito', data: 'totalDebit', searchable: false,
            render: (val) => formatCurrency(val),
        },
        {
            title: 'Total Credito', data: 'totalCredit', searchable: false,
            render: (val) => formatCurrency(val),
        },
        {
            title: 'Acciones', data: 'id', searchable: false,
            render: (id, _type, row) => {
                const isDraft  = row?.status === 'DRAFT';
                const isPosted = row?.status === 'POSTED';

                let btns = `
                    <button class="btn btn-sm btn-label-info action-btn"
                        data-action="view" data-id="${id}" title="Ver detalle">
                        <i class="ri-eye-line"></i>
                    </button>
                    <button class="btn btn-sm btn-label-secondary action-btn"
                        data-action="supports" data-id="${id}" title="Soportes documentales (HU-CG-05A/B/C)">
                        <i class="ri-attachment-2"></i>
                    </button>
                    <button class="btn btn-sm btn-label-secondary action-btn"
                        data-action="export-pdf" data-id="${id}" title="Exportar PDF">
                        <i class="ri-file-pdf-line"></i>
                    </button>
                    <button class="btn btn-sm btn-label-secondary action-btn"
                        data-action="export-xlsx" data-id="${id}" title="Exportar Excel">
                        <i class="ri-file-excel-2-line"></i>
                    </button>
                    <button class="btn btn-sm btn-label-info action-btn"
                        data-action="versions" data-id="${id}" title="Historial de versiones">
                        <i class="ri-git-branch-line"></i>
                    </button>`;

                if (isDraft) {
                    btns += `
                        <button class="btn btn-sm btn-label-primary action-btn"
                            data-action="edit" data-id="${id}" title="Editar">
                            <i class="ri-edit-line"></i>
                        </button>
                        <button class="btn btn-sm btn-label-success action-btn"
                            data-action="post" data-id="${id}" title="Contabilizar">
                            <i class="ri-check-double-line"></i>
                        </button>
                        <button class="btn btn-sm btn-label-danger action-btn"
                            data-action="delete" data-id="${id}" title="Eliminar">
                            <i class="ri-delete-bin-5-line"></i>
                        </button>`;
                }
                if (isPosted) {
                    btns += `
                        <button class="btn btn-sm btn-label-warning action-btn"
                            data-action="reverse" data-id="${id}" title="Reversar">
                            <i class="ri-arrow-go-back-line"></i>
                        </button>`;
                }

                return `<div class="d-flex gap-1 flex-wrap">${btns}</div>`;
            },
        },
    ];

    /** Abre modal de creacion de comprobante. */
    const openModalCreate = () => {
        if (!modalCreateInstance.current) {
            modalCreateInstance.current = new window.bootstrap.Modal(modalCreateRef.current);
        }
        modalCreateInstance.current.show();
    };

    /**
     * QA HU-CG-02B E3 (2026-05-19): exporta el listado completo de
     * comprobantes filtrados a XLSX o CSV. Reusa el state actual del
     * DataTable (filtros + ordenamiento) construyendo un DataTableRequest
     * equivalente al que envia el listado.
     */
    const exportListing = async (format) => {
        try {
            const token = localStorage.getItem('token');
            const dt = dataTableRef?.current;
            // Construir payload similar al DataTableRequest del listado actual.
            const colsPayload = (columns || []).map((c, idx) => ({
                data: c.data, name: c.name || c.data,
                searchable: c.searchable !== false,
                orderable: c.orderable !== false,
                search: {
                    value: dt && c.name ? (dt.column(`${c.name}:name`).search() || '') : '',
                    regex: false
                }
            }));
            const payload = {
                draw: 1, start: 0, length: 100000, // hasta 100k filas
                search: { value: dt ? (dt.search() || '') : '', regex: false },
                order: [{ column: 0, dir: 'desc' }],
                columns: colsPayload,
            };
            const url = base_url(['api', 'v1', 'journal-entries', 'export', format]);
            const resp = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });
            if (!resp.ok) {
                const text = await resp.text();
                throw new Error(text || 'Error descargando archivo');
            }
            const blob = await resp.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = `Comprobantes.${format}`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(blobUrl);
        } catch (err) {
            setMessage({
                type: 'danger', show: true,
                message: err?.message || 'No se pudo exportar el listado.',
            });
        }
    };

    /** Botones de cabecera del DataTable. */
    const buttons = [
        {
            text: '<i class="ri-filter-line ri-16px me-sm-2"></i><span class="d-none d-sm-inline-block">Filtrar</span>',
            className: 'btn rounded-pill btn-secondary waves-effect mx-1 my-2',
            action: () => {
                if (!filterInstance.current) filterInstance.current = new window.bootstrap.Modal(filterRef.current);
                filterInstance.current.show();
            },
        },
        {
            text: '<i class="ri-file-excel-2-line ri-16px me-sm-2"></i><span class="d-none d-sm-inline-block">Exportar Excel</span>',
            className: 'btn rounded-pill btn-outline-success waves-effect mx-1 my-2',
            action: () => exportListing('xlsx'),
        },
        {
            text: '<i class="ri-file-text-line ri-16px me-sm-2"></i><span class="d-none d-sm-inline-block">Exportar CSV</span>',
            className: 'btn rounded-pill btn-outline-secondary waves-effect mx-1 my-2',
            action: () => exportListing('csv'),
        },
        {
            text: '<i class="ri-add-line ri-16px me-sm-2"></i><span class="d-none d-sm-inline-block">Nuevo Comprobante</span>',
            className: 'btn rounded-pill btn-primary waves-effect mx-2 my-2',
            action: () => openModalCreate(),
        },
    ];

    /** Rows normalizadas para el listener de acciones. */
    const rows = useMemo(() => {
        if (Array.isArray(data)) return data;
        if (Array.isArray(data?.data)) return data.data;
        return [];
    }, [data]);

    /**
     * CG-06B E4 / adic#3: abre el detalle de un comprobante por id (usado cuando
     * el Libro Diario navega aqui con ?view=ID). Muestra encabezado, lineas,
     * aviso de tercero inactivo (HU-CG-05C) y documentos relacionados.
     */
    const openEntryViewById = async (id) => {
        try {
            const [relResp, detResp] = await Promise.all([
                fetchHelper.get(base_url(['api', 'v1', 'journal-entries', id, 'related-docs']), {}, 0).catch(() => ({ data: [] })),
                fetchHelper.get(base_url(['api', 'v1', 'journal-entries', id]), {}, 0).catch(() => null),
            ]);
            const related = relResp?.data || [];
            const d = detResp?.data || detResp || {};
            const lines = Array.isArray(d.lines) ? d.lines : [];
            const inactiveNits = [...new Set(lines.filter(l => l.thirdPartyInactive && l.thirdPartyNit).map(l => l.thirdPartyNit))];
            const avisoInactivoHtml = inactiveNits.length > 0
                ? `<div class="alert alert-warning py-2 mt-2 mb-0"><i class="ri-alert-line me-1"></i>El tercero asociado a este comprobante esta actualmente inactivo en el sistema <span class="text-muted">(NIT ${inactiveNits.join(', ')})</span>.</div>` : '';
            const linesHtml = lines.length > 0
                ? `<div class="mt-3 pt-2 border-top"><strong class="d-block mb-2">Detalle del comprobante</strong>
                    <div class="table-responsive" style="max-height:260px;overflow-y:auto;">
                      <table class="table table-sm table-bordered mb-0" style="font-size:0.78rem;">
                        <thead class="table-light"><tr><th>Cuenta</th><th>Descripcion</th><th>Tercero</th><th>CC</th><th class="text-end">Debito</th><th class="text-end">Credito</th></tr></thead>
                        <tbody>${lines.map(l => `<tr><td><code>${l.accountCode || '-'}</code><br/><small class="text-muted">${l.accountName || ''}</small></td><td>${l.description || '-'}</td><td>${l.thirdPartyNit || '-'}</td><td>${l.costCenterName || '-'}</td><td class="text-end">${l.debitAmount && Number(l.debitAmount) > 0 ? formatCurrency(l.debitAmount) : '-'}</td><td class="text-end">${l.creditAmount && Number(l.creditAmount) > 0 ? formatCurrency(l.creditAmount) : '-'}</td></tr>`).join('')}</tbody>
                      </table></div></div>` : '';
            window.Swal.fire({
                title: `Comprobante ${d.voucherCode || ('#' + (d.entryNumber || id))}`,
                html: `<div class="text-start">
                        <p class="mb-1"><strong>Fecha:</strong> ${d.entryDate || '-'}</p>
                        <p class="mb-1"><strong>Descripcion:</strong> ${d.description || '-'}</p>
                        <p class="mb-1"><strong>Modulo Origen:</strong> ${SOURCE_LABEL[d.sourceModule] || d.sourceModule || '-'}</p>
                        <p class="mb-1"><strong>Estado:</strong> ${STATUS_LABEL[d.status] || d.status}</p>
                        <p class="mb-1"><strong>Total Debito:</strong> ${formatCurrency(d.totalDebit)}</p>
                        <p class="mb-1"><strong>Total Credito:</strong> ${formatCurrency(d.totalCredit)}</p>
                        ${avisoInactivoHtml}${linesHtml}</div>`,
                width: 880, confirmButtonText: 'Cerrar',
            });
        } catch (e) {
            setMessage({ type: 'danger', show: true, message: 'No se pudo cargar el comprobante solicitado.' });
        }
    };

    /** Si llega ?view=ID (desde el Libro Diario), abre ese comprobante. */
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const viewId = params.get('view');
        if (viewId) {
            const u = new URL(window.location.href);
            u.searchParams.delete('view');
            window.history.replaceState({}, '', u);
            // Delay para no competir con los SweetAlert de carga inicial
            // (menu/permisos/DataTable) que cerrarian el modal de detalle.
            setTimeout(() => openEntryViewById(viewId), 1300);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /** Listener de acciones por fila (view, post, reverse, delete). */
    useEffect(() => {
        const table = dataTableRef?.current;
        if (!table) return;

        const handler = function () {
            const action = $(this).data('action');
            const id     = Number($(this).data('id'));
            const row    = rows.find(m => m.id === id);
            if (!row) return;

            switch (action) {
                case 'export-pdf':
                case 'export-xlsx': {
                    // HU-CG-01C: descarga directa del comprobante en el formato pedido.
                    // Usa fetch nativo (no fetchHelper) porque la respuesta es un Blob,
                    // no JSON, y necesitamos la cabecera Content-Disposition para el nombre.
                    const isPdf = action === 'export-pdf';
                    const ext   = isPdf ? 'pdf' : 'xlsx';
                    const url   = base_url(['api', 'v1', 'journal-entries', row.id, ext]);
                    fetch(url, { headers: { Authorization: 'Bearer ' + (localStorage.getItem('token') || '') } })
                        .then(async (resp) => {
                            if (!resp.ok) {
                                const err = await resp.json().catch(() => ({}));
                                throw new Error(err.message || err.error || 'Error al exportar el comprobante.');
                            }
                            const blob = await resp.blob();
                            const a = document.createElement('a');
                            a.href = URL.createObjectURL(blob);
                            a.download = `comprobante-${row.entryNumber || row.id}.${ext}`;
                            document.body.appendChild(a);
                            a.click();
                            a.remove();
                            URL.revokeObjectURL(a.href);
                        })
                        .catch((err) => {
                            setMessage({ type: 'danger', show: true, message: err?.message || 'Error al exportar.' });
                        });
                    break;
                }
                case 'edit': {
                    // HU-CG-07A: editar comprobante en BORRADOR.
                    setEditEntryId(row.id);
                    if (!modalUpdateInstance.current) {
                        modalUpdateInstance.current = new window.bootstrap.Modal(modalUpdateRef.current);
                    }
                    modalUpdateInstance.current.show();
                    break;
                }
                case 'supports': {
                    // HU-CG-05A/B/C: gestion de soportes documentales del JE.
                    setSupportContext({
                        id: row.id,
                        voucherCode: row.voucherCode || `#${row.entryNumber || row.id}`,
                    });
                    if (!supportsModalInstance.current) {
                        supportsModalInstance.current = new window.bootstrap.Modal(supportsModalRef.current);
                    }
                    supportsModalInstance.current.show();
                    break;
                }
                case 'versions': {
                    // HU-CG-07C: historial completo de versiones del comprobante (arbol
                    // recursivo original -> reversiones -> correcciones). El backend
                    // /versions devuelve cada nodo con depth, relation y parentId y
                    // registra la consulta en auditoria (HU-CG-07C E4).
                    fetchHelper.get(
                        base_url(['api', 'v1', 'journal-entries', row.id, 'versions']),
                        {}, 0
                    ).then((resp) => {
                        const nodes = Array.isArray(resp?.data) ? resp.data : (resp?.data?.data || []);
                        const relationLabel = {
                            ORIGINAL:   '<span class="badge bg-label-primary">Original</span>',
                            REVERSAL:   '<span class="badge bg-label-warning">Reversion</span>',
                            CORRECTION: '<span class="badge bg-label-info">Correccion</span>',
                        };
                        const statusLabel = {
                            DRAFT:    '<span class="badge bg-label-secondary">Borrador</span>',
                            POSTED:   '<span class="badge bg-label-success">Contabilizado</span>',
                            REVERSED: '<span class="badge bg-label-danger">Reversado</span>',
                        };
                        // HU-CG-07C E2: comprobante sin versiones previas (solo el original).
                        if (nodes.length <= 1) {
                            window.Swal.fire({
                                icon: 'info',
                                title: `Historial de ${row.voucherCode || ('#' + (row.entryNumber || row.id))}`,
                                html: '<p class="text-muted mb-0">Este comprobante no tiene versiones previas. No ha sido reversado ni corregido.</p>',
                                confirmButtonText: 'Cerrar',
                            });
                            return;
                        }
                        const rowsHtml = nodes.map((n) => `
                            <tr>
                                <td style="padding-left:${(n.depth || 0) * 18 + 8}px;">
                                    ${(n.depth || 0) > 0 ? '↳ ' : ''}<code>${n.voucherCode || ('#' + n.entryNumber)}</code>
                                </td>
                                <td>${relationLabel[n.relation] || n.relation || '-'}</td>
                                <td>${statusLabel[n.status] || n.status || '-'}</td>
                                <td>${n.entryDate || '-'}</td>
                                <td class="text-end">${formatCurrency(n.totalDebit)}</td>
                                <td class="small text-muted">${n.createdBy || '-'}</td>
                            </tr>`).join('');
                        // HU-CG-07C E3: selector de 2 versiones para comparar el diff.
                        const optsHtml = nodes.map(n =>
                            `<option value="${n.id}">${n.voucherCode || ('#' + n.entryNumber)} (${n.relation})</option>`).join('');
                        window.Swal.fire({
                            title: `Historial de versiones — ${row.voucherCode || ('#' + (row.entryNumber || row.id))}`,
                            html: `<div class="text-start">
                                <p class="small text-muted mb-2">Trazabilidad completa: comprobante original, reversiones y correcciones (${nodes.length} versiones).</p>
                                <div class="table-responsive" style="max-height:280px;overflow-y:auto;">
                                  <table class="table table-sm table-bordered mb-0" style="font-size:0.8rem;">
                                    <thead class="table-light"><tr>
                                      <th>Comprobante</th><th>Relacion</th><th>Estado</th><th>Fecha</th>
                                      <th class="text-end">Total</th><th>Usuario</th>
                                    </tr></thead>
                                    <tbody>${rowsHtml}</tbody>
                                  </table>
                                </div>
                                <hr/>
                                <p class="small fw-bold mb-1"><i class="ri-git-compare-line me-1"></i>Comparar dos versiones (HU-CG-07C E3)</p>
                                <div class="d-flex gap-2 align-items-end flex-wrap">
                                  <div><label class="form-label small mb-0">Versión A</label>
                                    <select id="cmp-a" class="form-select form-select-sm">${optsHtml}</select></div>
                                  <div><label class="form-label small mb-0">Versión B</label>
                                    <select id="cmp-b" class="form-select form-select-sm">${optsHtml}</select></div>
                                  <button id="cmp-btn" class="btn btn-sm btn-primary"><i class="ri-git-compare-line me-1"></i>Comparar</button>
                                </div>
                                <div id="cmp-result" class="mt-2"></div>
                              </div>`,
                            width: 860,
                            showCancelButton: false,
                            confirmButtonText: 'Cerrar',
                            didOpen: () => {
                                // preseleccionar A=primera, B=segunda
                                const selB = document.getElementById('cmp-b');
                                if (selB && selB.options.length > 1) selB.selectedIndex = 1;
                                document.getElementById('cmp-btn')?.addEventListener('click', async () => {
                                    const idA = document.getElementById('cmp-a')?.value;
                                    const idB = document.getElementById('cmp-b')?.value;
                                    const box = document.getElementById('cmp-result');
                                    if (!idA || !idB || idA === idB) {
                                        box.innerHTML = '<div class="alert alert-warning py-2 mb-0 small">Seleccione dos versiones distintas.</div>';
                                        return;
                                    }
                                    box.innerHTML = '<div class="text-muted small">Comparando...</div>';
                                    try {
                                        const cmp = await fetchHelper.get(
                                            base_url(['api', 'v1', 'journal-entries', idA, 'versions', 'compare', idB]), {}, 0);
                                        const d = cmp?.data || cmp;
                                        const hdr = (d.headerDiffs || []).map(h => `
                                            <tr class="${h.changed ? 'table-warning' : ''}">
                                              <td>${h.field}</td><td>${h.valueA ?? '-'}</td><td>${h.valueB ?? '-'}</td>
                                              <td>${h.changed ? '<span class="badge bg-label-warning">Cambió</span>' : ''}</td>
                                            </tr>`).join('');
                                        const ctBadge = { ADDED:'bg-label-success', REMOVED:'bg-label-danger', MODIFIED:'bg-label-warning', UNCHANGED:'bg-label-secondary' };
                                        const lns = (d.lineDiffs || []).map(l => `
                                            <tr>
                                              <td>${l.account}</td>
                                              <td><span class="badge ${ctBadge[l.changeType] || ''}">${l.changeType}</span></td>
                                              <td class="text-end">${formatCurrency(l.debitA)}/${formatCurrency(l.creditA)}</td>
                                              <td class="text-end">${formatCurrency(l.debitB)}/${formatCurrency(l.creditB)}</td>
                                            </tr>`).join('');
                                        box.innerHTML = `
                                            <div class="small fw-bold mt-1">Cabecera</div>
                                            <table class="table table-sm table-bordered mb-2" style="font-size:0.75rem;">
                                              <thead class="table-light"><tr><th>Campo</th><th>Versión A</th><th>Versión B</th><th></th></tr></thead>
                                              <tbody>${hdr}</tbody></table>
                                            <div class="small fw-bold">Líneas (Débito/Crédito A vs B)</div>
                                            <table class="table table-sm table-bordered mb-0" style="font-size:0.75rem;">
                                              <thead class="table-light"><tr><th>Cuenta</th><th>Cambio</th><th class="text-end">A (D/C)</th><th class="text-end">B (D/C)</th></tr></thead>
                                              <tbody>${lns}</tbody></table>`;
                                    } catch (e) {
                                        box.innerHTML = '<div class="alert alert-danger py-2 mb-0 small">No se pudo comparar.</div>';
                                    }
                                });
                            },
                        });
                    }).catch((err) => {
                        setMessage({ type: 'danger', show: true,
                            message: err?.msg || 'No se pudo cargar el historial de versiones.' });
                    });
                    break;
                }
                case 'view': {
                    // HU-CG-08C E2: documentos relacionados (REV original/reverso, CORR).
                    // HU-AR-04 E3: desglose de lineas del comprobante (D/C por cuenta,
                    //               tercero, centro de costo). Sin esto solo se ven los
                    //               totales y no se puede auditar el calculo de IVA/retenciones.
                    Promise.all([
                        fetchHelper.get(
                            base_url(['api', 'v1', 'journal-entries', row.id, 'related-docs']),
                            {}, 0
                        ).catch(() => ({ data: [] })),
                        fetchHelper.get(
                            base_url(['api', 'v1', 'journal-entries', row.id]),
                            {}, 0
                        ).catch(() => null),
                    ]).then(([relResp, detailResp]) => {
                        const related = (relResp?.data || []);
                        const detail = detailResp?.data || detailResp || {};
                        const lines = Array.isArray(detail.lines) ? detail.lines : [];
                        // HU-CG-05C E3: aviso si algun tercero asociado quedo inactivo.
                        const inactiveNits = [...new Set(lines
                            .filter(l => l.thirdPartyInactive && l.thirdPartyNit)
                            .map(l => l.thirdPartyNit))];
                        const avisoInactivoHtml = inactiveNits.length > 0
                            ? `<div class="alert alert-warning py-2 mt-2 mb-0">
                                 <i class="ri-alert-line me-1"></i>
                                 El tercero asociado a este comprobante esta actualmente inactivo en el sistema
                                 <span class="text-muted">(NIT ${inactiveNits.join(', ')})</span>.
                               </div>`
                            : '';
                        const relationLabel = {
                            REVERSA_A:     'Reversa al',
                            CORRIGE_A:     'Corrige al',
                            REVERSADO_POR: 'Reversado por',
                            CORREGIDO_POR: 'Corregido por',
                        };
                        const relatedHtml = related.length > 0
                            ? `<div class="mt-3 pt-2 border-top">
                                <strong class="d-block mb-2">📎 Documentos Relacionados</strong>
                                <ul class="list-unstyled small mb-0">
                                  ${related.map(r => `
                                    <li class="mb-1">
                                      <span class="badge bg-label-secondary me-1">${relationLabel[r.relation] || r.relation}</span>
                                      <code>${r.voucherCode}</code>
                                      <span class="text-muted">— ${r.description || ''} (${r.entryDate || ''})</span>
                                    </li>`).join('')}
                                </ul>
                              </div>`
                            : '';
                        const linesHtml = lines.length > 0
                            ? `<div class="mt-3 pt-2 border-top">
                                <strong class="d-block mb-2">Detalle del comprobante</strong>
                                <div class="table-responsive" style="max-height:260px;overflow-y:auto;">
                                  <table class="table table-sm table-bordered mb-0" style="font-size:0.78rem;">
                                    <thead class="table-light">
                                      <tr>
                                        <th>Cuenta</th>
                                        <th>Descripcion</th>
                                        <th>Tercero</th>
                                        <th>CC</th>
                                        <th class="text-end">Debito</th>
                                        <th class="text-end">Credito</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      ${lines.map(l => `
                                        <tr>
                                          <td><code>${l.accountCode || '-'}</code><br/><small class="text-muted">${l.accountName || ''}</small></td>
                                          <td>${l.description || '-'}</td>
                                          <td>${l.thirdPartyNit || '-'}</td>
                                          <td>${l.costCenterName || '-'}</td>
                                          <td class="text-end">${l.debitAmount && Number(l.debitAmount) > 0 ? formatCurrency(l.debitAmount) : '-'}</td>
                                          <td class="text-end">${l.creditAmount && Number(l.creditAmount) > 0 ? formatCurrency(l.creditAmount) : '-'}</td>
                                        </tr>`).join('')}
                                    </tbody>
                                  </table>
                                </div>
                              </div>`
                            : '<p class="text-muted small fst-italic mt-2">Sin lineas en el detalle.</p>';

                        const codeShown = row.voucherCode || `#${row.entryNumber || row.id}`;
                        window.Swal.fire({
                            title: `Comprobante ${codeShown}`,
                            html: `
                                <div class="text-start">
                                    <p class="mb-1"><strong>Fecha:</strong> ${row.entryDate || '-'}</p>
                                    <p class="mb-1"><strong>Descripcion:</strong> ${row.description || '-'}</p>
                                    <p class="mb-1"><strong>Modulo Origen:</strong> ${SOURCE_LABEL[row.sourceModule] || row.sourceModule || '-'}</p>
                                    <p class="mb-1"><strong>Estado:</strong> ${STATUS_LABEL[row.status] || row.status}</p>
                                    <p class="mb-1"><strong>Total Debito:</strong> ${formatCurrency(row.totalDebit)}</p>
                                    <p class="mb-1"><strong>Total Credito:</strong> ${formatCurrency(row.totalCredit)}</p>
                                    ${avisoInactivoHtml}
                                    ${linesHtml}
                                    ${relatedHtml}
                                </div>`,
                            width: 880,
                            showCancelButton: false,
                            showDenyButton: false,
                            confirmButtonText: 'Cerrar',
                        });
                    }).catch(() => {
                        // Si el endpoint relacional falla, fallback al modal simple
                        window.Swal.fire({
                            title: `Comprobante #${row.entryNumber || row.id}`,
                            html: `<div class="text-start">
                                    <p><strong>Fecha:</strong> ${row.entryDate || '-'}</p>
                                    <p><strong>Descripcion:</strong> ${row.description || '-'}</p>
                                    <p><strong>Estado:</strong> ${STATUS_LABEL[row.status] || row.status}</p>
                                  </div>`,
                            confirmButtonText: 'Cerrar',
                        });
                    });
                    break;
                }
                case 'post': {
                    window.Swal.fire({
                        title: 'Contabilizar comprobante',
                        html: `¿Esta seguro de contabilizar el comprobante <strong>#${row.entryNumber || row.id}</strong>?`,
                        icon: 'question',
                        showCancelButton: true,
                        confirmButtonText: 'Si, contabilizar',
                        cancelButtonText: 'Cancelar',
                        confirmButtonColor: '#28a745',
                    }).then(async (result) => {
                        if (!result.isConfirmed) return;
                        try {
                            await fetchHelper.post(
                                base_url(['api', 'v1', 'journal-entries', row.id, 'post']),
                                {}, {}, 1000, true
                            );
                            dataTableRef?.current?.ajax?.reload?.();
                            setMessage({ type: 'success', show: true, message: 'Comprobante contabilizado exitosamente.' });
                        } catch (error) {
                            setMessage({
                                type: 'danger', show: true,
                                message: error?.msg || 'Error al contabilizar el comprobante.',
                            });
                        }
                    });
                    break;
                }
                case 'reverse': {
                    // El backend exige 'description' obligatorio (@NotBlank en
                    // ReverseEntryRequest). Pedimos el motivo + opcion de generar
                    // borrador correctivo (HU-CG-07B E1): al reversar se crea el
                    // comprobante REV-XXXXX (asientos espejo) y, si se marca la
                    // casilla, ademas un nuevo BORRADOR correctivo vinculado por
                    // correction_of para re-capturar el asiento corregido.
                    window.Swal.fire({
                        title: 'Reversar comprobante',
                        html: `
                            <p class="mb-2">Reversar comprobante <strong>#${row.entryNumber || row.id}</strong>.
                            Se creará un comprobante de reversión <strong>REV-XXXXX</strong> con asientos espejo.</p>
                            <textarea id="rev-motivo" class="form-control" rows="2"
                                placeholder="Motivo de la reversión (mínimo 10 caracteres)" maxlength="500"></textarea>
                            <div class="form-check mt-3 text-start">
                                <input class="form-check-input" type="checkbox" id="rev-draft">
                                <label class="form-check-label" for="rev-draft">
                                    Crear además un <strong>BORRADOR correctivo</strong> (copia del original para corregir y re-contabilizar)
                                </label>
                            </div>`,
                        showCancelButton: true,
                        confirmButtonText: 'Sí, reversar',
                        cancelButtonText: 'Cancelar',
                        confirmButtonColor: '#d33',
                        icon: 'warning',
                        preConfirm: () => {
                            const motivo = (document.getElementById('rev-motivo')?.value || '').trim();
                            const draft = document.getElementById('rev-draft')?.checked || false;
                            if (!motivo) { window.Swal.showValidationMessage('El motivo es obligatorio.'); return false; }
                            if (motivo.length < 10) { window.Swal.showValidationMessage('El motivo debe tener al menos 10 caracteres.'); return false; }
                            return { motivo, draft };
                        },
                    }).then(async (result) => {
                        if (!result.isConfirmed) return;
                        try {
                            await fetchHelper.post(
                                base_url(['api', 'v1', 'journal-entries', row.id, 'reverse']),
                                { description: result.value.motivo, createCorrectionDraft: result.value.draft },
                                {}, 1000, true
                            );
                            dataTableRef?.current?.ajax?.reload?.();
                            setMessage({ type: 'success', show: true,
                                message: result.value.draft
                                    ? 'Comprobante reversado (REV) y borrador correctivo generado.'
                                    : 'Comprobante reversado exitosamente (REV creado).' });
                        } catch (error) {
                            setMessage({
                                type: 'danger', show: true,
                                message: error?.msg || 'Error al reversar el comprobante.',
                            });
                        }
                    });
                    break;
                }
                case 'delete': {
                    if (row.status !== 'DRAFT') {
                        setMessage({
                            type: 'warning', show: true,
                            message: 'Solo se pueden eliminar comprobantes en estado BORRADOR.',
                        });
                        return;
                    }
                    window.Swal.fire({
                        title: 'Eliminar comprobante',
                        html: `¿Esta seguro de eliminar el comprobante <strong>#${row.entryNumber || row.id}</strong>?`,
                        icon: 'warning',
                        showCancelButton: true,
                        confirmButtonText: 'Si, eliminar',
                        cancelButtonText: 'Cancelar',
                        confirmButtonColor: '#d33',
                    }).then(async (result) => {
                        if (!result.isConfirmed) return;
                        try {
                            // QA-BLOQUE-AO (2026-04-29): firma del helper es
                            // delete(url, data, headers, time). Antes se pasaba
                            // 1000 en posicion de headers -> headers=1000 ->
                            // spread sobre primitivo da {} -> NO se setea
                            // Authorization -> 401 -> "Error al eliminar".
                            await fetchHelper.delete(
                                base_url(['api', 'v1', 'journal-entries', row.id]),
                                null, {}, 1000
                            );
                            dataTableRef?.current?.ajax?.reload?.();
                            setMessage({ type: 'success', show: true, message: 'Comprobante eliminado exitosamente.' });
                        } catch (error) {
                            setMessage({
                                type: 'danger', show: true,
                                message: error?.msg || 'Error al eliminar el comprobante.',
                            });
                        }
                    });
                    break;
                }
                default:
                    break;
            }
        };

        table.on('click', '.action-btn', handler);
        return () => table.off('click', '.action-btn', handler);
    }, [rows]);

    return (
        <>
            <div className="card">
                <h5 className="card-header text-md-start text-center">Comprobantes Contables</h5>

                <AlertPage
                    type={message.type}
                    message={message.message}
                    show={message.show}
                    onChange={() => setMessage({ message: '', type: '', show: false })}
                />

                <div className="card-datatable text-nowrap">
                    <DataTableReference
                        url_api={url}
                        columns={columns}
                        tableRef={tableRef}
                        dataTableRef={dataTableRef}
                        method="POST"
                        buttons={buttons}
                        title="Comprobantes Contables"
                        setData={setData}
                        search={search}
                        setSearch={setSearch}
                        filtered={true}
                        lengthMenu={[10, 25, 50, 100]}
                    />
                </div>
            </div>

            <CreateComprobante
                modalRef={modalCreateRef}
                modalInstance={modalCreateInstance}
                dataTableRef={dataTableRef}
                setMessage={setMessage}
            />

            <UpdateComprobante
                modalRef={modalUpdateRef}
                modalInstance={modalUpdateInstance}
                dataTableRef={dataTableRef}
                setMessage={setMessage}
                entryId={editEntryId}
            />

            <GenericFilterModal
                filterRef={filterRef}
                filterInstance={filterInstance}
                dataTableRef={dataTableRef}
                title="Filtrar Comprobantes Contables"
                columns={[
                    // QA HU-CG-02B / HU-CG-03C: busqueda por ID unico del comprobante.
                    { column: 'id:name',           label: 'ID del comprobante', type: 'number' },
                    { column: 'entryNumber:name',  label: '# Comprobante', type: 'number' },
                    { column: 'entryDate:name',    label: 'Fecha',         type: 'date' },
                    { column: 'description:name',  label: 'Descripción' },
                    { column: 'sourceModule:name', label: 'Módulo Origen', type: 'select', options: [
                        { id: 'AP',     label: 'Cuentas por Pagar' },
                        { id: 'AR',     label: 'Cuentas por Cobrar' },
                        { id: 'BNK',    label: 'Bancos y Cajas' },
                        { id: 'ACT',    label: 'Activos' },
                        { id: 'NOM',    label: 'Nómina' },
                        { id: 'CG',     label: 'Contabilidad General' },
                        { id: 'MANUAL', label: 'Manual' },
                    ]},
                    { column: 'status:name',       label: 'Estado', type: 'select', options: [
                        { id: 'DRAFT',    label: 'Borrador' },
                        { id: 'POSTED',   label: 'Contabilizado' },
                        { id: 'REVERSED', label: 'Reversado' },
                    ]},
                ]}
            />

            {/* HU-CG-05A/B/C: Modal de soportes documentales del comprobante */}
            <SupportsModal
                modalRef={supportsModalRef}
                journalEntryId={supportContext.id}
                voucherCode={supportContext.voucherCode}
                onChange={() => dataTableRef?.current?.ajax?.reload?.(null, false)}
            />
        </>
    );
};

export default IndexCgComprobantes;
