import { useEffect, useRef, useState } from 'react';
import { base_url } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';
import AlertPage from '../../../components/molecules/AlertPage';

/**
 * HU-NOM-03 / HU-NOM-04 / HU-NOM-06: Gestion de recibos de nomina.
 *
 * <p>Permite:
 * <ul>
 *   <li>Liquidar la nomina del periodo para todos los empleados ACTIVE o un filtro</li>
 *   <li>Listar recibos por periodo (filtrado por año/mes)</li>
 *   <li>Ver detalle con todas las lineas de concepto</li>
 *   <li>Aprobar recibos en DRAFT (HU-NOM-04 E1)</li>
 *   <li>Cerrar recibos en APPROVED (HU-NOM-04 E3 - inmutable)</li>
 *   <li>Descargar comprobante PDF de recibos APPROVED/CLOSED (HU-NOM-06 E1)</li>
 * </ul>
 */
const fmt = (n) => new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', maximumFractionDigits: 0
}).format(Number(n) || 0);

// NOM-3 (2026-06-04): nombres de mes en el filtro (antes era un input numerico
// que mostraba "6" en vez de "Junio").
const MONTHS = [
    { v: 1, l: '01 - Enero' }, { v: 2, l: '02 - Febrero' }, { v: 3, l: '03 - Marzo' },
    { v: 4, l: '04 - Abril' }, { v: 5, l: '05 - Mayo' }, { v: 6, l: '06 - Junio' },
    { v: 7, l: '07 - Julio' }, { v: 8, l: '08 - Agosto' }, { v: 9, l: '09 - Septiembre' },
    { v: 10, l: '10 - Octubre' }, { v: 11, l: '11 - Noviembre' }, { v: 12, l: '12 - Diciembre' },
];

const IndexRecibos = () => {
    const now = new Date();
    const [recibos, setRecibos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [alert, setAlert] = useState({ show: false, type: '', message: '' });
    const [filters, setFilters] = useState({
        year: now.getFullYear(),
        month: now.getMonth() + 1,
    });
    const [liquidating, setLiquidating] = useState(false);
    const [liqResult, setLiqResult] = useState(null);
    const [detail, setDetail] = useState(null);
    // HU-NOM-04 DEF#1 (2026-04-28): selector de tipo de nomina
    const [liqForm, setLiqForm] = useState({
        periodType: 'MONTHLY',
        daysWorked: 30,
        showModal: false,
        isComplementary: false,
        complementaryParentId: null,
        complementaryEmployeeId: null,
        extraConcept: '',
        extraAmount: '',
    });
    // HU-NOM-03 DEF#2 (2026-04-28): editar/eliminar lineas en DRAFT
    const [lineEdit, setLineEdit] = useState(null);
    // HAL-07 + HAL-01: añadir concepto activo a un recibo en BORRADOR
    const [allConcepts, setAllConcepts] = useState([]);
    const [addForm, setAddForm] = useState({ conceptCode: '', amount: '' });
    // ERR-NOM-002 Defecto B (2026-05-25): conceptos EARNING para el valor
    // monetario adicional opcional de la complementaria (bono/ajuste no
    // proporcional a dias trabajados).
    const [earningConcepts, setEarningConcepts] = useState([]);

    const PERIOD_LABELS = {
        MONTHLY: 'Mensual (30 días)',
        BIWEEKLY: 'Quincenal (15 días)',
        WEEKLY: 'Semanal (7 días)',
    };
    const periodTypeBadge = (t) => {
        const map = { MONTHLY: 'bg-label-primary', BIWEEKLY: 'bg-label-info', WEEKLY: 'bg-label-warning' };
        const lbl = { MONTHLY: 'Mensual', BIWEEKLY: 'Quincenal', WEEKLY: 'Semanal' };
        return <span className={`badge ${map[t] || 'bg-label-secondary'}`}>{lbl[t] || t || '-'}</span>;
    };

    const load = async () => {
        setLoading(true);
        try {
            const data = await fetchHelper.get(
                    base_url(['api', 'nomina', 'recibos'], { year: filters.year, month: filters.month }),
                    {}, 0);
            setRecibos(Array.isArray(data) ? data : []);
        } catch (err) {
            setAlert({ show: true, type: 'danger', message: 'Error al cargar recibos' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

    // ERR-NOM-002 Defecto B: cargar conceptos EARNING (devengados) activos para
    // el dropdown del valor adicional de la complementaria.
    useEffect(() => {
        fetchHelper.get(base_url(['api', 'nomina', 'conceptos'], { type: 'EARNING', status: 'ACTIVE' }), {}, 0)
            .then(d => setEarningConcepts(Array.isArray(d) ? d : []))
            .catch(() => {});
    }, []);

    // HAL-07 + HAL-01: TODOS los conceptos activos (cualquier tipo) para "añadir concepto"
    useEffect(() => {
        fetchHelper.get(base_url(['api', 'nomina', 'conceptos'], { status: 'ACTIVE' }), {}, 0)
            .then(d => setAllConcepts(Array.isArray(d) ? d : []))
            .catch(() => {});
    }, []);

    // HAL-07 + HAL-01: añade un concepto activo como línea al recibo en BORRADOR.
    const addConceptLine = async () => {
        if (!detail || detail.status !== 'DRAFT') return;
        if (!addForm.conceptCode) {
            setAlert({ show: true, type: 'danger', message: 'Seleccione un concepto.' });
            return;
        }
        if (addForm.amount === '' || Number(addForm.amount) <= 0) {
            setAlert({ show: true, type: 'danger', message: 'El monto debe ser mayor a cero.' });
            return;
        }
        try {
            await fetchHelper.post(
                    base_url(['api', 'nomina', 'recibos', detail.id, 'lineas']),
                    { conceptCode: addForm.conceptCode, amount: Number(addForm.amount) }, {}, 0);
            const fresh = await fetchHelper.get(base_url(['api', 'nomina', 'recibos', detail.id]), {}, 0);
            setDetail(fresh);
            setAddForm({ conceptCode: '', amount: '' });
            setAlert({ show: true, type: 'success', message: 'Concepto agregado al recibo.' });
            load();
        } catch (err) {
            setAlert({ show: true, type: 'danger', message: err?.msg || err?.message || 'No se pudo agregar el concepto.' });
        }
    };

    const openLiquidateModal = () => {
        setLiqForm({
            periodType: 'MONTHLY', daysWorked: 30,
            showModal: true, isComplementary: false, complementaryParentId: null,
            complementaryEmployeeId: null, extraConcept: '', extraAmount: '',
        });
    };

    // HU-NOM-04 DEF#2 (2026-04-28): nomina complementaria a partir de un recibo CLOSED
    const openComplementaryModal = (parent) => {
        setLiqForm({
            periodType: parent.periodType || 'MONTHLY',
            daysWorked: 30,
            showModal: true,
            isComplementary: true,
            complementaryParentId: parent.id,
            complementaryEmployeeId: parent.employeeId,
            extraConcept: '',
            extraAmount: '',
            complementaryParentInfo: `${parent.employeeName} - ${parent.periodYear}-${String(parent.periodMonth).padStart(2,'0')}`,
        });
    };

    const liquidate = async () => {
        setLiquidating(true);
        setLiqResult(null);
        try {
            // HU-NOM-04 DEF#2: complementaria = liquida solo el empleado padre
            // y marca el recibo como complementario del original.
            const body = {
                year: filters.year,
                month: filters.month,
                periodType: liqForm.periodType,
                daysWorked: Number(liqForm.daysWorked) || 30,
            };
            if (liqForm.isComplementary && liqForm.complementaryParentId) {
                body.complementaryOfReceiptId = liqForm.complementaryParentId;
            }
            // ERR-NOM-002 Defecto B: valor monetario adicional opcional (bono/ajuste
            // no proporcional a dias). Se envia como linea EARNING extra del empleado
            // del recibo padre. El backend (PayrollService.liquidateEmployee) ya
            // soporta `extras` y solo las agrega si el concepto es de tipo EARNING.
            if (liqForm.isComplementary && liqForm.complementaryEmployeeId
                    && liqForm.extraAmount !== '' && Number(liqForm.extraAmount) > 0) {
                body.extras = [{
                    employeeId: liqForm.complementaryEmployeeId,
                    conceptCode: (liqForm.extraConcept || 'BONIFICACION').toUpperCase().trim(),
                    amount: Number(liqForm.extraAmount),
                }];
            }
            const resp = await fetchHelper.post(
                    base_url(['api', 'nomina', 'recibos', 'liquidar']), body, {}, 0);
            setLiqResult(resp);
            setLiqForm(prev => ({ ...prev, showModal: false }));
            setAlert({ show: true, type: 'success',
                message: `Liquidación ${liqForm.isComplementary ? 'COMPLEMENTARIA ' : ''}completa: ${resp.totalReceipts} recibos + JE #${resp.journalEntryId || '-'}${resp.excluded?.length ? ` (${resp.excluded.length} empleados excluidos)` : ''}` });
            load();
        } catch (err) {
            setAlert({ show: true, type: 'danger', message: err?.msg || err?.message || 'No se pudo liquidar.' });
        } finally {
            setLiquidating(false);
        }
    };

    // HU-NOM-03 DEF#2 (2026-04-28): editar/eliminar linea SOLO en DRAFT
    const editLine = (l, receiptStatus) => {
        if (receiptStatus !== 'DRAFT') {
            setAlert({ show: true, type: 'warning',
                message: 'Solo se pueden editar líneas de recibos en BORRADOR (HU-NOM-04 E2).' });
            return;
        }
        setLineEdit({ ...l, _newAmount: l.amount });
    };

    const saveLine = async () => {
        try {
            await fetchHelper.put(
                    base_url(['api', 'nomina', 'recibos', detail.id, 'lineas', lineEdit.id]),
                    { amount: Number(lineEdit._newAmount) }, {}, 0);
            setAlert({ show: true, type: 'success', message: 'Línea actualizada y totales recalculados.' });
            const fresh = await fetchHelper.get(base_url(['api', 'nomina', 'recibos', detail.id]), {}, 0);
            setDetail(fresh);
            setLineEdit(null);
            load();
        } catch (err) {
            setAlert({ show: true, type: 'danger',
                message: err?.msg || err?.message || 'No se pudo actualizar la línea.' });
        }
    };

    const deleteLine = async (l) => {
        if (detail?.status !== 'DRAFT') {
            setAlert({ show: true, type: 'warning',
                message: 'Solo se pueden eliminar líneas de recibos en BORRADOR.' });
            return;
        }
        const ok = await window.Swal.fire({
            title: '¿Eliminar línea?',
            text: `Concepto: ${l.conceptName}. Los totales del recibo se recalculan.`,
            icon: 'warning', showCancelButton: true,
            confirmButtonText: 'Sí, eliminar', cancelButtonText: 'Cancelar',
            customClass: { confirmButton: 'btn btn-danger' },
        });
        if (!ok.isConfirmed) return;
        try {
            await fetchHelper.delete(
                    base_url(['api', 'nomina', 'recibos', detail.id, 'lineas', l.id]), {}, {}, 0);
            setAlert({ show: true, type: 'success', message: 'Línea eliminada.' });
            const fresh = await fetchHelper.get(base_url(['api', 'nomina', 'recibos', detail.id]), {}, 0);
            setDetail(fresh);
            load();
        } catch (err) {
            setAlert({ show: true, type: 'danger',
                message: err?.msg || err?.message || 'No se pudo eliminar la línea.' });
        }
    };

    const approve = async (r) => {
        const ok = await window.Swal.fire({
            title: '¿Aprobar recibo?', text: `Empleado: ${r.employeeName}.`,
            icon: 'question', showCancelButton: true,
            confirmButtonText: 'Aprobar', cancelButtonText: 'Cancelar',
        });
        if (!ok.isConfirmed) return;
        try {
            await fetchHelper.post(base_url(['api', 'nomina', 'recibos', r.id, 'approve']), {}, {}, 0);
            setAlert({ show: true, type: 'success', message: 'Recibo aprobado y JE contabilizado.' });
            load();
        } catch (err) {
            setAlert({ show: true, type: 'danger', message: err?.msg || 'No se pudo aprobar.' });
        }
    };

    const close = async (r) => {
        const ok = await window.Swal.fire({
            title: '¿Cerrar recibo definitivamente?',
            text: 'Una vez cerrado es INMUTABLE (HU-NOM-04 E3). Para corregir, crear nómina complementaria.',
            icon: 'warning', showCancelButton: true,
            confirmButtonText: 'Sí, cerrar', cancelButtonText: 'Cancelar',
        });
        if (!ok.isConfirmed) return;
        try {
            await fetchHelper.post(base_url(['api', 'nomina', 'recibos', r.id, 'close']), {}, {}, 0);
            setAlert({ show: true, type: 'success', message: 'Recibo cerrado definitivamente.' });
            load();
        } catch (err) {
            setAlert({ show: true, type: 'danger', message: err?.msg || 'No se pudo cerrar.' });
        }
    };

    const openDetail = async (r) => {
        try {
            const full = await fetchHelper.get(base_url(['api', 'nomina', 'recibos', r.id]), {}, 0);
            setDetail(full);
        } catch (err) {
            setAlert({ show: true, type: 'danger', message: 'No se pudo cargar el detalle.' });
        }
    };

    const downloadPdf = async (r) => {
        try {
            const token = localStorage.getItem('token');
            const url = base_url(['api', 'nomina', 'reportes', 'comprobante', r.id]);
            const resp = await fetch(url, {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {},
            });
            if (!resp.ok) throw new Error('No se pudo generar el PDF');
            const blob = await resp.blob();
            const dlUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = dlUrl;
            a.download = `comprobante-nomina-${r.id}.pdf`;
            a.click();
            URL.revokeObjectURL(dlUrl);
        } catch (err) {
            setAlert({ show: true, type: 'danger', message: err.message || 'No se pudo descargar el PDF.' });
        }
    };

    const statusBadge = (s) => {
        const map = { DRAFT: 'bg-label-secondary', APPROVED: 'bg-label-info', CLOSED: 'bg-label-success' };
        const lbl = { DRAFT: 'Borrador', APPROVED: 'Aprobado', CLOSED: 'Cerrado' };
        return <span className={`badge ${map[s] || 'bg-label-secondary'}`}>{lbl[s] || s}</span>;
    };

    return (
        <>
            <div className="card">
                <h5 className="card-header d-flex justify-content-between align-items-center">
                    <span><i className="ri-file-list-3-line me-2"></i>Liquidación de nómina</span>
                    <button className="btn btn-primary btn-sm" onClick={openLiquidateModal} disabled={liquidating}>
                        {liquidating && <span className="spinner-border spinner-border-sm me-2"></span>}
                        <i className="ri-calculator-line me-1"></i> Liquidar periodo
                    </button>
                </h5>
                <div className="card-body">
                    <AlertPage message={alert.message} type={alert.type} show={alert.show}
                            onChange={() => setAlert({ show: false, type: '', message: '' })} />

                    <div className="row g-3 mb-3">
                        <div className="col-md-3">
                            <label className="form-label">Año</label>
                            <input type="number" className="form-control" value={filters.year}
                                    onChange={e => setFilters({ ...filters, year: Number(e.target.value) })} />
                        </div>
                        <div className="col-md-3">
                            <label className="form-label">Mes</label>
                            <select className="form-select" value={filters.month}
                                    onChange={e => setFilters({ ...filters, month: Number(e.target.value) })}>
                                {MONTHS.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
                            </select>
                        </div>
                        <div className="col-md-3 d-flex align-items-end">
                            <button className="btn btn-outline-primary w-100" onClick={load}>
                                <i className="ri-filter-line me-1"></i> Consultar periodo
                            </button>
                        </div>
                    </div>

                    {liqResult?.excluded?.length > 0 && (
                        <div className="alert alert-warning">
                            <strong>Empleados excluidos ({liqResult.excluded.length}):</strong>
                            <ul className="mb-0 small">
                                {liqResult.excluded.map((x, i) => (
                                    <li key={i}>{x.fullName} ({x.documentNumber}): {x.error}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* ERR-NOM-002 Defecto C: tras liquidar/crear complementaria, navegar
                        directamente al recibo nuevo y al recibo original cerrado, sin
                        tener que buscarlos manualmente en el listado. */}
                    {liqResult?.receipts?.length > 0 && (() => {
                        const parentId = liqResult.receipts.map(r => r.complementaryOfReceiptId).find(Boolean);
                        return (
                            <div className="alert alert-success">
                                <div className="mb-2">
                                    <i className="ri-checkbox-circle-line me-1"></i>
                                    {parentId
                                        ? 'Nómina complementaria creada. Consulte el nuevo recibo o el original cerrado:'
                                        : `Liquidación creada (${liqResult.receipts.length} recibo(s)). Consulte el detalle:`}
                                </div>
                                <div className="d-flex flex-wrap gap-2">
                                    {liqResult.receipts.map(r => (
                                        <button key={r.id} type="button" className="btn btn-sm btn-label-primary"
                                                onClick={() => openDetail({ id: r.id })}>
                                            <i className="ri-eye-line me-1"></i>
                                            Recibo #{r.id}{r.employeeName ? ` · ${r.employeeName}` : ''}
                                        </button>
                                    ))}
                                    {parentId && (
                                        <button type="button" className="btn btn-sm btn-label-secondary"
                                                onClick={() => openDetail({ id: parentId })}>
                                            <i className="ri-file-history-line me-1"></i>
                                            Recibo original #{parentId}
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })()}

                    <div className="table-responsive">
                        <table className="table table-hover">
                            <thead>
                                <tr>
                                    <th>Empleado</th>
                                    <th>Periodo</th>
                                    <th>Tipo</th>
                                    <th className="text-end">Devengados</th>
                                    <th className="text-end">Deducciones</th>
                                    <th className="text-end">Neto</th>
                                    <th>Estado</th>
                                    <th>JE</th>
                                    <th className="text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading && <tr><td colSpan="9" className="text-center py-4">
                                    <div className="spinner-border text-primary"></div>
                                </td></tr>}
                                {!loading && recibos.length === 0 && (
                                    <tr><td colSpan="9" className="text-center text-muted py-4">
                                        Sin recibos para este periodo
                                    </td></tr>
                                )}
                                {!loading && recibos.map(r => (
                                    <tr key={r.id}>
                                        <td>
                                            <div>{r.employeeName}
                                                {r.complementaryOfReceiptId && (
                                                    <span className="badge bg-label-warning ms-2"
                                                          title={`Complementaria del recibo #${r.complementaryOfReceiptId}`}>
                                                        Compl. #{r.complementaryOfReceiptId}
                                                    </span>
                                                )}
                                            </div>
                                            <small className="text-muted">{r.employeeDocument}</small>
                                        </td>
                                        <td>{r.periodYear}-{String(r.periodMonth).padStart(2, '0')}</td>
                                        <td>{periodTypeBadge(r.periodType)}</td>
                                        <td className="text-end">{fmt(r.totalEarnings)}</td>
                                        <td className="text-end">{fmt(r.totalDeductions)}</td>
                                        <td className="text-end fw-bold">{fmt(r.netPay)}</td>
                                        <td>{statusBadge(r.status)}</td>
                                        <td>
                                            {r.journalEntryId
                                                ? <span className="badge bg-label-success">JE #{r.journalEntryId}</span>
                                                : <span className="text-muted">-</span>}
                                        </td>
                                        <td className="text-center">
                                          {/* NOM-3: botones de accion en fila horizontal (flex + gap) */}
                                          <div className="d-flex justify-content-center align-items-center gap-1 flex-wrap">
                                            <button className="btn btn-sm btn-label-info"
                                                    onClick={() => openDetail(r)} title="Ver detalle">
                                                <i className="ri-eye-line"></i>
                                            </button>
                                            {r.status === 'DRAFT' && (
                                                <button className="btn btn-sm btn-label-primary me-1"
                                                        onClick={() => openDetail(r)} title="Editar (líneas y conceptos)">
                                                    <i className="ri-edit-line"></i>
                                                </button>
                                            )}
                                            {r.status === 'DRAFT' && (
                                                <button className="btn btn-sm btn-label-success me-1"
                                                        onClick={() => approve(r)} title="Aprobar (HU-NOM-04 E1)">
                                                    <i className="ri-check-line"></i>
                                                </button>
                                            )}
                                            {r.status === 'APPROVED' && (
                                                <button className="btn btn-sm btn-label-warning me-1"
                                                        onClick={() => close(r)} title="Cerrar (HU-NOM-04 E3)">
                                                    <i className="ri-lock-line"></i>
                                                </button>
                                            )}
                                            {(r.status === 'APPROVED' || r.status === 'CLOSED') && (
                                                <button className="btn btn-sm btn-label-primary me-1"
                                                        onClick={() => downloadPdf(r)} title="Comprobante PDF (HU-NOM-06 E1)">
                                                    <i className="ri-file-pdf-line"></i>
                                                </button>
                                            )}
                                            {r.status === 'CLOSED' && !r.complementaryOfReceiptId && (
                                                <button className="btn btn-sm btn-label-danger"
                                                        onClick={() => openComplementaryModal(r)}
                                                        title="Crear nómina complementaria (HU-NOM-04 E3)">
                                                    <i className="ri-add-circle-line"></i>
                                                </button>
                                            )}
                                          </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* HU-NOM-04 DEF#1: modal Liquidar con periodType + DEF#2 modo complementaria */}
            {liqForm.showModal && (
                <div className="modal show fade d-block" tabIndex="-1"
                        style={{ background: 'rgba(0,0,0,.5)' }}>
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">
                                    {liqForm.isComplementary
                                        ? <><i className="ri-add-circle-line me-2"></i>Crear nómina complementaria</>
                                        : <><i className="ri-calculator-line me-2"></i>Liquidar nómina del periodo</>}
                                </h5>
                                <button type="button" className="btn-close"
                                        onClick={() => setLiqForm(prev => ({ ...prev, showModal: false }))}></button>
                            </div>
                            <div className="modal-body">
                                {liqForm.isComplementary ? (
                                    <div className="alert alert-warning py-2 small">
                                        <i className="ri-information-line me-1"></i>
                                        <b>Nómina complementaria</b> sobre {liqForm.complementaryParentInfo}.
                                        Genera un recibo adicional que conserva el original CERRADO. Aplica
                                        para corrección post-cierre (HU-NOM-04 E3).
                                    </div>
                                ) : (
                                    <div className="alert alert-info py-2 small">
                                        Se liquidarán <b>TODOS los empleados activos</b> para
                                        <b> {filters.year}-{String(filters.month).padStart(2,'0')}</b>.
                                        Los empleados sin EPS o fondo de pensión serán excluidos (HU-NOM-03 E3).
                                    </div>
                                )}
                                <div className="row g-3">
                                    <div className="col-md-7">
                                        <label className="form-label">Tipo de nómina *</label>
                                        <select className="form-select" value={liqForm.periodType}
                                                onChange={e => setLiqForm({ ...liqForm, periodType: e.target.value })}>
                                            <option value="MONTHLY">Mensual (30 días)</option>
                                            <option value="BIWEEKLY">Quincenal (15 días)</option>
                                            <option value="WEEKLY">Semanal (7 días)</option>
                                        </select>
                                        <small className="text-muted">Determina el divisor de liquidación.</small>
                                    </div>
                                    <div className="col-md-5">
                                        <label className="form-label">Días trabajados</label>
                                        <input type="number" min="1" max="31" className="form-control"
                                                value={liqForm.daysWorked}
                                                onChange={e => setLiqForm({ ...liqForm, daysWorked: e.target.value })} />
                                    </div>
                                </div>

                                {/* ERR-NOM-002 Defecto B: valor monetario adicional para la
                                    complementaria (bonos/ajustes no proporcionales a días). */}
                                {liqForm.isComplementary && (
                                    <div className="row g-3 mt-1">
                                        <div className="col-12">
                                            <hr className="my-1" />
                                            <label className="form-label mb-1 fw-semibold">
                                                Valor monetario adicional <span className="text-muted fw-normal">(opcional)</span>
                                            </label>
                                            <div className="alert alert-light border py-2 small mb-2">
                                                <i className="ri-information-line me-1"></i>
                                                Para bonos, ajustes o correcciones que <b>no</b> son proporcionales a
                                                días, indique un concepto devengado y su valor. Se agrega como línea
                                                adicional del recibo complementario.
                                            </div>
                                        </div>
                                        <div className="col-md-7">
                                            <label className="form-label">Concepto (devengado)</label>
                                            <select className="form-select" value={liqForm.extraConcept}
                                                    onChange={e => setLiqForm({ ...liqForm, extraConcept: e.target.value })}>
                                                <option value="">— Bonificación (genérico) —</option>
                                                {earningConcepts.map(c => (
                                                    <option key={c.id} value={c.code}>{c.code} — {c.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="col-md-5">
                                            <label className="form-label">Valor (COP)</label>
                                            <input type="number" min="0" step="1000" className="form-control"
                                                    placeholder="Ej. 200000"
                                                    value={liqForm.extraAmount}
                                                    onChange={e => setLiqForm({ ...liqForm, extraAmount: e.target.value })} />
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-label-secondary"
                                        onClick={() => setLiqForm(prev => ({ ...prev, showModal: false }))}>Cancelar</button>
                                <button type="button" className="btn btn-primary" onClick={liquidate}
                                        disabled={liquidating}>
                                    {liquidating && <span className="spinner-border spinner-border-sm me-2"></span>}
                                    <i className="ri-calculator-line me-1"></i>
                                    {liqForm.isComplementary ? 'Crear complementaria' : 'Liquidar'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* HU-NOM-03 DEF#2: editar amount de una linea (solo DRAFT) */}
            {lineEdit && (
                <div className="modal show fade d-block" tabIndex="-1"
                        style={{ background: 'rgba(0,0,0,.5)' }}>
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Editar línea: {lineEdit.conceptName}</h5>
                                <button type="button" className="btn-close" onClick={() => setLineEdit(null)}></button>
                            </div>
                            <div className="modal-body">
                                <div className="mb-2">
                                    <label className="form-label small">Concepto</label>
                                    <div><code>{lineEdit.conceptCode}</code> — {lineEdit.conceptName}</div>
                                </div>
                                <div className="mb-2">
                                    <label className="form-label small">Valor original</label>
                                    <div className="text-muted">{fmt(lineEdit.amount)}</div>
                                </div>
                                <div className="mb-2">
                                    <label className="form-label">Nuevo valor *</label>
                                    <input type="number" step="0.01" className="form-control"
                                            value={lineEdit._newAmount}
                                            onChange={e => setLineEdit({ ...lineEdit, _newAmount: e.target.value })} />
                                </div>
                                <div className="alert alert-info py-2 small">
                                    Al guardar, los totales (devengados/deducciones/aportes/neto) del recibo
                                    se recalculan automáticamente.
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-label-secondary"
                                        onClick={() => setLineEdit(null)}>Cancelar</button>
                                <button type="button" className="btn btn-primary" onClick={saveLine}>
                                    <i className="ri-save-line me-1"></i> Guardar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {detail && (
                <div className="modal show fade d-block" tabIndex="-1"
                        style={{ background: 'rgba(0,0,0,.5)' }}>
                    <div className="modal-dialog modal-xl modal-dialog-scrollable">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">
                                    Recibo #{detail.id} - {detail.employeeName}
                                </h5>
                                <button type="button" className="btn-close" onClick={() => setDetail(null)}></button>
                            </div>
                            <div className="modal-body">
                                <div className="row mb-3">
                                    <div className="col-md-6">
                                        <div><strong>Documento:</strong> {detail.employeeDocument}</div>
                                        <div><strong>Período:</strong> {detail.periodYear}-{String(detail.periodMonth).padStart(2, '0')}</div>
                                        <div><strong>Días trabajados:</strong> {detail.daysWorked}</div>
                                    </div>
                                    <div className="col-md-6 text-md-end">
                                        <div>Estado: {statusBadge(detail.status)}</div>
                                        <div>JE: {detail.journalEntryId ? `#${detail.journalEntryId}` : '-'}</div>
                                    </div>
                                </div>

                                <div className="row g-3 mb-3">
                                    <div className="col-md-3"><div className="card bg-label-success"><div className="card-body text-center">
                                        <div className="small">Devengados</div><h5 className="mb-0">{fmt(detail.totalEarnings)}</h5>
                                    </div></div></div>
                                    <div className="col-md-3"><div className="card bg-label-warning"><div className="card-body text-center">
                                        <div className="small">Deducciones</div><h5 className="mb-0">{fmt(detail.totalDeductions)}</h5>
                                    </div></div></div>
                                    <div className="col-md-3"><div className="card bg-label-info"><div className="card-body text-center">
                                        <div className="small">Aportes empresa</div><h5 className="mb-0">{fmt(detail.totalEmployerContributions)}</h5>
                                    </div></div></div>
                                    <div className="col-md-3"><div className="card bg-label-primary"><div className="card-body text-center">
                                        <div className="small">Neto a pagar</div><h5 className="mb-0">{fmt(detail.netPay)}</h5>
                                    </div></div></div>
                                </div>

                                {detail.status === 'DRAFT' && (
                                    <div className="alert alert-info py-2 small">
                                        <i className="ri-information-line me-1"></i>
                                        El recibo está en <b>BORRADOR</b>. Puede editar/eliminar líneas y
                                        añadir conceptos para sanear el recibo antes de aprobar (HU-NOM-03 E2).
                                    </div>
                                )}

                                {/* HAL-07 + HAL-01: añadir cualquier concepto activo como línea (solo BORRADOR) */}
                                {detail.status === 'DRAFT' && (
                                    <div className="card bg-light border-0 mb-3">
                                        <div className="card-body py-2">
                                            <label className="form-label small fw-semibold mb-1">
                                                <i className="ri-add-circle-line me-1"></i>Añadir concepto
                                            </label>
                                            <div className="row g-2 align-items-end">
                                                <div className="col-md-6">
                                                    <select className="form-select form-select-sm"
                                                            value={addForm.conceptCode}
                                                            onChange={e => setAddForm({ ...addForm, conceptCode: e.target.value })}>
                                                        <option value="">— Seleccione un concepto activo —</option>
                                                        {allConcepts
                                                            .filter(c => !(detail.lines || []).some(l => l.conceptCode === c.code))
                                                            .map(c => (
                                                                <option key={c.id} value={c.code}>
                                                                    {c.code} — {c.name} ({c.conceptType === 'EARNING' ? 'Devengado' : c.conceptType === 'DEDUCTION' ? 'Deducción' : 'Aporte'})
                                                                </option>
                                                            ))}
                                                    </select>
                                                </div>
                                                <div className="col-md-4">
                                                    <input type="number" step="0.01" min="0"
                                                            className="form-control form-control-sm"
                                                            placeholder="Monto"
                                                            value={addForm.amount}
                                                            onChange={e => setAddForm({ ...addForm, amount: e.target.value })} />
                                                </div>
                                                <div className="col-md-2">
                                                    <button className="btn btn-sm btn-primary w-100"
                                                            onClick={addConceptLine}>
                                                        <i className="ri-add-line"></i> Agregar
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {['EARNING', 'DEDUCTION', 'EMPLOYER_CONTRIBUTION'].map(tipo => {
                                    const lns = (detail.lines || []).filter(l => l.lineType === tipo);
                                    if (lns.length === 0) return null;
                                    const lbl = {
                                        EARNING: 'Devengados',
                                        DEDUCTION: 'Deducciones',
                                        EMPLOYER_CONTRIBUTION: 'Aportes patronales',
                                    }[tipo];
                                    return (
                                        <div key={tipo} className="mb-3">
                                            <h6 className="text-uppercase text-muted small">{lbl}</h6>
                                            <table className="table table-sm">
                                                <tbody>
                                                    {lns.map(l => (
                                                        <tr key={l.id}>
                                                            <td><code>{l.conceptCode}</code></td>
                                                            <td>{l.conceptName}</td>
                                                            <td className="text-end">{fmt(l.amount)}</td>
                                                            {detail.status === 'DRAFT' && (
                                                                <td className="text-end" style={{ width: 90 }}>
                                                                    <button className="btn btn-xs btn-label-primary me-1 p-1"
                                                                            onClick={() => editLine(l, detail.status)}
                                                                            title="Editar valor">
                                                                        <i className="ri-edit-line ri-14px"></i>
                                                                    </button>
                                                                    <button className="btn btn-xs btn-label-danger p-1"
                                                                            onClick={() => deleteLine(l)}
                                                                            title="Eliminar línea">
                                                                        <i className="ri-delete-bin-line ri-14px"></i>
                                                                    </button>
                                                                </td>
                                                            )}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-label-secondary" onClick={() => setDetail(null)}>Cerrar</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default IndexRecibos;
