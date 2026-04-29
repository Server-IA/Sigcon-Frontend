import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import AlertPage from '@/components/molecules/AlertPage';
import { base_url, formatPrice } from '@/utils/functions';
import { fetchHelper } from '@/utils/fetch';
import InputDate from '@/components/molecules/InputDate';
import InputSelectModal from '@/components/molecules/inputSelectModal';
import InputModal from '@/components/molecules/InputModal';

import DataTableReference from '@/components/organism/DataTable';

const parseOptionalMoney = (raw) => {
    if (raw == null || String(raw).trim() === '') return undefined;
    const n = Number(String(raw).replace(/\s/g, '').replace(',', '.'));
    if (Number.isNaN(n)) return undefined;
    return n;
};

const fmtMoney = (v) => (v == null || v === '' ? '—' : formatPrice(Number(v), 'COP', 'es-CO', 2));

const sessionHasStatementBalances = (s) =>
    s && s.statementOpeningBalance != null && s.statementClosingBalance != null;

const BankReconciliation = () => {

    const tableRef = useRef(null);
    const dataTableRef = useRef(null);

    const { bankAccountId } = useParams();
    const id = Number(bankAccountId);

    const [accountLabel, setAccountLabel] = useState('');
    const [sessions,       setSessions]       = useState([]);
    const [movements,      setMovements]      = useState([]);
    const [unmatchedOnly,  setUnmatchedOnly]  = useState(false);
    const [loading,        setLoading]        = useState(true);
    const [message,        setMessage]        = useState({ message: '', type: '', show: false });

    const [vouchers, setVouchers] = useState([]);

    const [sessionForm, setSessionForm] = useState({
        periodStart: '', periodEnd: '', notes: '',
        statementOpeningBalance: '', statementClosingBalance: '',
    });
    const [balanceForm, setBalanceForm] = useState({ opening: '', closing: '' });
    const [reconciliationSummary, setReconciliationSummary] = useState(null);
    const [summaryLoading, setSummaryLoading] = useState(false);
    const [movForm, setMovForm] = useState({
        movementDate: new Date().toISOString().split('T')[0],
        amount:       '',
        description:  '',
        reference:    '',
    });
    const [selectedSessionId, setSelectedSessionId] = useState('');

    const draftSession = useMemo(
        () => sessions.find((s) => s.status === 'DRAFT'),
        [sessions],
    );

    const refresh = useCallback(async () => {
        if (!id || Number.isNaN(id)) return;
        setLoading(true);
        try {
            const [accRes, sessRes, movRes, vouRes] = await Promise.all([
                fetchHelper.get(base_url(['api', 'v1', 'bank-accounts', id]), {}, 1, false, true),
                fetchHelper.get(base_url(['api', 'v1', 'bank-accounts', id, 'reconciliation-sessions']), {}, 1, false, true),
                fetchHelper.get(
                    base_url(['api', 'v1', 'bank-accounts', id, 'financial-movements'], { unmatchedOnly: String(unmatchedOnly) }),
                    {}, 1, false, true,
                ),
                fetchHelper.post(base_url(['api', 'v1', 'vouchers', 'search']), {
                    length: -1
                    }, {}, 0, false),
            ]);
            const acc = accRes?.data ?? accRes;
            setAccountLabel(`${acc?.code || ''} — ${acc?.accountName || ''}`.trim() || `Cuenta #${id}`);
            setSessions(Array.isArray(sessRes?.data) ? sessRes.data : []);
            setMovements(Array.isArray(movRes?.data) ? movRes.data : []);
            setVouchers(Array.isArray(vouRes?.data) ? vouRes.data.filter(
                (v) =>
                  v.bankAccount.id == id &&
                  !movements.some((m) => m.matchedVoucherId == v.id)
            ) : []);
        } catch (e) {
            console.error(e);
            setMessage({ message: e?.msg || 'Error al cargar datos', type: 'danger', show: true });
        } finally {
            setLoading(false);
        }
    }, [id, unmatchedOnly]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    useEffect(() => {
        if (draftSession?.id) {
            setSelectedSessionId(String(draftSession.id));
        }
    }, [draftSession?.id]);

    useEffect(() => {
        const s = sessions.find((x) => String(x.id) === selectedSessionId);
        if (s) {
            setBalanceForm({
                opening: s.statementOpeningBalance != null ? String(s.statementOpeningBalance) : '',
                closing: s.statementClosingBalance != null ? String(s.statementClosingBalance) : '',
            });
        } else {
            setBalanceForm({ opening: '', closing: '' });
        }
    }, [selectedSessionId, sessions]);

    const loadSummary = useCallback(async () => {
        if (!id || Number.isNaN(id) || !selectedSessionId) {
            setReconciliationSummary(null);
            return;
        }
        setSummaryLoading(true);
        try {
            const url = base_url([
                'api', 'v1', 'bank-accounts', id,
                'reconciliation-sessions', selectedSessionId, 'summary',
            ]);
            const res = await fetchHelper.get(url, {}, 1, false, true);
            setReconciliationSummary(res?.data ?? null);
        } catch {
            setReconciliationSummary(null);
        } finally {
            setSummaryLoading(false);
        }
    }, [id, selectedSessionId]);

    useEffect(() => {
        if (loading || !selectedSessionId) return;
        loadSummary();
    }, [loading, movements, selectedSessionId, loadSummary]);

    useEffect(() => {
        if (dataTableRef.current) {
            dataTableRef.current.clear();
            dataTableRef?.current?.rows.add(movements);
            dataTableRef?.current?.draw(true);
        }
        
        if (dataTableRef.current) {
            const handler = function () {
                const action = $(this).data('action');
                const id = Number($(this).data('id'));

                const movement = movements.find((m) => m.id == id);
                if (!movement) {
                    console.warn("Movimiento no encontrado", id);
                    return;
                }

                if (action === 'match') {
                    openMatchModal(movement);
                } else if (action === 'unmatch') {
                    submitUnmatch(movement);
                }
            };
            dataTableRef.current.on('click', 'button.btn-label-primary', handler);
            dataTableRef.current.on('click', 'button.btn-label-secondary', handler);
            return () => {
                dataTableRef.current.off('click', 'button.btn-label-primary', handler);
                dataTableRef.current.off('click', 'button.btn-label-secondary', handler);
            };
        }
    }, [movements, dataTableRef.current]);

    const [matchModal, setMatchModal] = useState({ open: false, movement: null, suggestions: [], voucherId: '', loadingSug: false });

    const openMatchModal = async (mov) => {
        setMatchModal({ open: true, movement: mov, suggestions: [], voucherId: '', loadingSug: true });
        try {
            const url = base_url(['api', 'v1', 'bank-accounts', id, 'financial-movements', mov.id, 'voucher-suggestions']);
            const res = await fetchHelper.get(url, {}, 1, false, true);
            setMatchModal((m) => ({
                ...m,
                suggestions: Array.isArray(res?.data) ? res.data : [],
                loadingSug: false,
            }));
        } catch {
            setMatchModal((m) => ({ ...m, suggestions: [], loadingSug: false }));
        }
    };

    const closeMatchModal = () => setMatchModal({ open: false, movement: null, suggestions: [], voucherId: '', loadingSug: false });

    const submitMatch = async (voucherId) => {
        // const vid = Number(voucherId || matchModal.voucherId);
        // if (!vid) {
        //     setMessage({ message: 'Indique un comprobante válido', type: 'warning', show: true });
        //     return;
        // }
        try {
            const url = base_url(['api', 'v1', 'bank-accounts', id, 'financial-movements', matchModal.movement.id, 'match-voucher']);
            await fetchHelper.put(url, { voucherId: matchModal.voucherId, bankAccountId: id }, {}, 1000);
            setMessage({ message: 'Movimiento emparejado con comprobante', type: 'success', show: true });
            closeMatchModal();
            refresh();
        } catch (e) {
            setMessage({ message: e?.msg || 'Error al emparejar', type: 'danger', show: true });
        }
    };

    const submitUnmatch = async (mov) => {
        try {
            const url = base_url(['api', 'v1', 'bank-accounts', id, 'financial-movements', mov.id, 'unmatch']);
            await fetchHelper.put(url, {}, {}, 1000);
            setMessage({ message: 'Emparejamiento eliminado', type: 'success', show: true });
            refresh();
        } catch (e) {
            setMessage({ message: e?.msg || 'Error', type: 'danger', show: true });
        }
    };

    const createSession = async () => {
        if (!sessionForm.periodStart || !sessionForm.periodEnd) {
            setMessage({ message: 'Complete fechas del periodo', type: 'warning', show: true });
            return;
        }
        try {
            const url = base_url(['api', 'v1', 'bank-accounts', id, 'reconciliation-sessions']);
            const body = {
                periodStart: sessionForm.periodStart,
                periodEnd:   sessionForm.periodEnd,
                notes:       sessionForm.notes || undefined,
            };
            const o = parseOptionalMoney(sessionForm.statementOpeningBalance);
            const c = parseOptionalMoney(sessionForm.statementClosingBalance);
            if (o !== undefined) body.statementOpeningBalance = o;
            if (c !== undefined) body.statementClosingBalance = c;
            await fetchHelper.post(url, body, {}, 1000);
            setMessage({ message: 'Sesión creada', type: 'success', show: true });
            setSessionForm((f) => ({
                ...f, notes: '', statementOpeningBalance: '', statementClosingBalance: '',
            }));
            refresh();
        } catch (e) {
            setMessage({ message: e?.msg || 'No se pudo crear la sesión', type: 'danger', show: true });
        }
    };

    const closeSession = async (sessionId) => {
        const s = sessions.find((x) => x.id === sessionId);
        if (!sessionHasStatementBalances(s)) {
            setMessage({
                message: 'Registre el saldo inicial y el saldo final del extracto (sección de borrador) antes de cerrar la sesión.',
                type: 'warning',
                show: true,
            });
            return;
        }
        try {
            const url = base_url(['api', 'v1', 'bank-accounts', id, 'reconciliation-sessions', sessionId, 'close']);
            await fetchHelper.put(url, {}, {}, 1000);
            setMessage({ message: 'Sesión cerrada y última conciliación actualizada', type: 'success', show: true });
            refresh();
        } catch (e) {
            setMessage({ message: e?.msg || 'No se pudo cerrar', type: 'danger', show: true });
        }
    };

    const saveStatementBalances = async () => {
        const sel = sessions.find((s) => String(s.id) === selectedSessionId);
        if (!sel || sel.status !== 'DRAFT') {
            setMessage({ message: 'Seleccione una sesión en borrador', type: 'warning', show: true });
            return;
        }
        const o = parseOptionalMoney(balanceForm.opening);
        const c = parseOptionalMoney(balanceForm.closing);
        const body = {};
        if (o !== undefined) body.statementOpeningBalance = o;
        if (c !== undefined) body.statementClosingBalance = c;
        if (!Object.keys(body).length) {
            setMessage({ message: 'Indique al menos un saldo del extracto', type: 'warning', show: true });
            return;
        }
        try {
            const url = base_url([
                'api', 'v1', 'bank-accounts', id,
                'reconciliation-sessions', selectedSessionId, 'statement-balances',
            ]);
            await fetchHelper.put(url, body, {}, 1000);
            setMessage({ message: 'Saldos del extracto guardados', type: 'success', show: true });
            refresh();
        } catch (e) {
            setMessage({ message: e?.msg || 'No se pudieron guardar los saldos', type: 'danger', show: true });
        }
    };

    // QA HU-050 E1: guard contra doble-click. Antes el POST OK + GET refresh
    // fallido se mostraba como error, el usuario reintentaba y se generaban
    // duplicados.
    const [savingMovement, setSavingMovement] = useState(false);

    const addMovement = async () => {
        if (savingMovement) return; // Evitar doble-click

        const amt = Number(String(movForm.amount).replace(',', '.'));
        if (!movForm.movementDate || Number.isNaN(amt) || amt === 0) {
            setMessage({ message: 'Fecha e importe válidos requeridos', type: 'warning', show: true });
            return;
        }
        setSavingMovement(true);
        try {
            const url = base_url(['api', 'v1', 'bank-accounts', id, 'financial-movements']);
            const body = {
                movementDate:      movForm.movementDate,
                amount:            amt,
                description:       movForm.description || undefined,
                externalReference: movForm.reference || undefined,
            };
            const sel = sessions.find((s) => String(s.id) === selectedSessionId);
            if (sel?.status === 'DRAFT' && selectedSessionId) {
                body.reconciliationSessionId = Number(selectedSessionId);
            }
            await fetchHelper.post(url, body, {}, 1000);
            setMessage({ message: 'Movimiento registrado', type: 'success', show: true });
            // Limpiar form para no reenviar el mismo movimiento
            setMovForm(prev => ({
                ...prev,
                amount: '',
                description: '',
                reference: '',
            }));
            try {
                await refresh();
            } catch (refreshErr) {
                // QA HU-050 E1: el refresh fallido NO es error de la operacion.
                // El POST ya fue exitoso. Mostramos warning pero no permitimos reintento.
                setMessage({
                    message: 'Movimiento registrado. No se pudo refrescar la lista; recargue la pagina.',
                    type: 'warning',
                    show: true,
                });
            }
        } catch (e) {
            setMessage({ message: e?.msg || 'Error al registrar', type: 'danger', show: true });
        } finally {
            setSavingMovement(false);
        }
    };

    const importCsv = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const fd = new FormData();
        fd.append('file', file);
        const sel = sessions.find((s) => String(s.id) === selectedSessionId);
        if (sel?.status === 'DRAFT' && selectedSessionId) {
            fd.append('reconciliationSessionId', selectedSessionId);
        }
        try {
            const url = base_url(['api', 'v1', 'bank-accounts', id, 'financial-movements', 'import-csv']);
            const res = await fetchHelper.postForm(url, fd, {}, 1000);
            const info = res?.data;
            const errs = info?.errors?.length ? ` (${info.errors.length} avisos)` : '';
            setMessage({
                message: `Importados ${info?.imported ?? 0} movimientos${errs}`,
                type: 'success',
                show: true,
            });
            e.target.value = '';
            refresh();
        } catch (err) {
            setMessage({ message: err?.msg || 'Error en importación', type: 'danger', show: true });
        }
    };

    const matchLabel = (m) => {
        if (m.matchedCheckId) return `Cheque #${m.matchedCheckId}`;
        if (m.matchedVoucherId) return `Comprobante #${m.matchedVoucherId}`;
        return '—';
    };

    if (!id || Number.isNaN(id)) {
        return <div className="alert alert-warning">Cuenta bancaria no válida.</div>;
    }

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
                    <AlertPage type={message.type} message={message.message} show={message.show} onChange={() => setMessage({ message: '', type: '', show: false })} />

                    {loading ? <p className="text-muted">Cargando…</p> : null}

                    <div className="row g-4">
                        <div className="col-lg-5">
                            <h6 className="fw-semibold mb-3">Sesión de conciliación</h6>
                            <p className="small text-muted">
                                Solo una sesión en borrador por cuenta. Para cerrar debe tener registrados el saldo inicial y final del extracto.
                                Cerrar actualiza la fecha de última conciliación.
                            </p>
                            <ul className="list-group list-group-flush mb-3">
                                {sessions.map((s) => (
                                    <li key={s.id} className="list-group-item d-flex justify-content-between align-items-center flex-wrap gap-2">
                                        <span>
                                            {s.periodStart} → {s.periodEnd}
                                            <span className={`badge ms-2 ${s.status === 'DRAFT' ? 'bg-label-warning' : 'bg-label-success'}`}>
                                                {s.status === 'DRAFT' ? 'Borrador' : 'Cerrada'}
                                            </span>
                                        </span>
                                        {s.status === 'DRAFT' && (
                                            <button
                                                type="button"
                                                className="btn btn-sm btn-success"
                                                disabled={!sessionHasStatementBalances(s)}
                                                title={
                                                    sessionHasStatementBalances(s)
                                                        ? 'Cerrar sesión de conciliación'
                                                        : 'Indique saldo inicial y final del extracto antes de cerrar'
                                                }
                                                onClick={() => closeSession(s.id)}
                                            >
                                                Cerrar sesión
                                            </button>
                                        )}
                                    </li>
                                ))}
                                {!sessions.length && <li className="list-group-item text-muted">Sin sesiones</li>}
                            </ul>
                            <div className="border rounded p-3 bg-label-secondary bg-opacity-10">
                                <div className="row g-2">
                                    <div className="col-md-6">
                                        <InputDate
                                            id="periodStart"
                                            placeholder="dd/mm/yyyy"
                                            dateFormat="Y-m-d"
                                            label="Periodo desde"
                                            date={sessionForm.periodStart}
                                            onChange={(value) => setSessionForm((f) => ({ ...f, periodStart: value }))}
                                        />
                                    </div>
                                    <div className="col-md-6">
                                        <InputDate
                                            id="periodEnd"
                                            placeholder="dd/mm/yyyy"
                                            dateFormat="Y-m-d"
                                            label="Periodo hasta"
                                            date={sessionForm.periodEnd}
                                            onChange={(value) => setSessionForm((f) => ({ ...f, periodEnd: value }))}
                                        />
                                    </div>
                                    <div className="col-md-6">
                                        <InputModal
                                            id="stmtOpen"
                                            label="Saldo inicial extracto"
                                            placeholder="0"
                                            value={sessionForm.statementOpeningBalance}
                                            onChange={(e) => setSessionForm((f) => ({ ...f,
                                                statementOpeningBalance: e.target.value.replace(',', '.').replace(' ', '').replace(/[a-zA-Z]/g, "") }))}
                                        />
                                    </div>
                                    <div className="col-md-6">
                                        <InputModal
                                            id="stmtClose"
                                            label="Saldo final extracto"
                                            placeholder="0"
                                            value={sessionForm.statementClosingBalance}
                                            onChange={(e) => setSessionForm((f) => ({ ...f, statementClosingBalance: e.target.value }))}
                                        />
                                    </div>
                                    <div className="col-12">
                                        <InputModal
                                            id="notes"
                                            label="Notas"
                                            placeholder="Notas"
                                            value={sessionForm.notes}
                                            // QA HU-054 E2: InputModal entrega el evento (no el value directo).
                                            // Antes se guardaba el event como objeto y al re-renderizar mostraba "[object Object]".
                                            onChange={(e) => setSessionForm((f) => ({ ...f, notes: e?.target?.value ?? '' }))}
                                        />
                                        {/* <label className="form-label small">Notas</label>
                                        <input type="text" className="form-control form-control-sm" value={sessionForm.notes} onChange={(e) => setSessionForm((f) => ({ ...f, notes: e.target.value }))} /> */}
                                    </div>
                                    <div className="col-12">
                                        <p className="small text-muted mb-0">
                                            Los saldos del extracto son obligatorios para cerrar la sesión; puede ingresarlos al crear la sesión o más tarde con Guardar en el borrador.
                                        </p>
                                    </div>
                                    <div className="col-12 mt-2">
                                        <button type="button" className="btn btn-primary btn-sm" onClick={createSession}>Nueva sesión</button>
                                    </div>
                                </div>
                            </div>

                            <h6 className="fw-semibold mt-4 mb-2">Sesión para resumen y asociación de movimientos</h6>
                            <p className="small text-muted mb-2">
                                Solo las sesiones en borrador reciben movimientos nuevos por alta o CSV. Puede ver el cuadre de cualquier sesión.
                            </p>
                            <InputSelectModal
                                id="selectedSessionId"
                                label="Sesión"
                                placeholder="Selecciona una sesión"
                                options={sessions.map((s) => ({
                                    id: s.id,
                                    label: `${s.periodStart} → ${s.periodEnd} (${s.status === 'DRAFT' ? 'Borrador' : 'Cerrada'})`,
                                }))}
                                value={selectedSessionId}
                                clearable={true}
                                onChange={(value) => setSelectedSessionId(value)}
                            />
                            {sessions.find((s) => String(s.id) === selectedSessionId)?.status === 'DRAFT' && (
                                <div className="border rounded p-3 mt-3 bg-body-secondary bg-opacity-25">
                                    <h6 className="small fw-semibold mb-2">Saldos del extracto (borrador)</h6>
                                    <div className="row g-2 align-items-end">
                                        <div className="col-md-5">
                                            <InputModal
                                                id="balOpen"
                                                label="Saldo inicial"
                                                placeholder="0"
                                                value={balanceForm.opening}
                                                onChange={(e) => setBalanceForm((f) => ({ ...f, opening: e.target.value.replace(',', '.').replace(' ', '').replace(/[a-zA-Z]/g, "") }))}
                                            />
                                        </div>
                                        <div className="col-md-5">
                                            <InputModal
                                                id="balClose"
                                                label="Saldo final"
                                                placeholder="0"
                                                value={balanceForm.closing}
                                                onChange={(e) => setBalanceForm((f) => ({ ...f, closing: e.target.value.replace(',', '.').replace(' ', '').replace(/[a-zA-Z]/g, "") }))}
                                            />
                                        </div>
                                        <div className="col-md-2">
                                            <button type="button" className="btn btn-sm btn-outline-primary w-100" onClick={saveStatementBalances}>
                                                Guardar
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {selectedSessionId ? (
                                <div className="border rounded p-3 mt-3">
                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                        <h6 className="small fw-semibold mb-0">Cuadre numérico</h6>
                                        {summaryLoading ? <span className="small text-muted">Calculando…</span> : null}
                                    </div>
                                    {!reconciliationSummary && !summaryLoading ? (
                                        <p className="small text-muted mb-0">No se pudo cargar el resumen.</p>
                                    ) : null}
                                    {reconciliationSummary ? (
                                        <div className="small">
                                            <p className="text-muted mb-2">
                                                Periodo {reconciliationSummary.periodStart} → {reconciliationSummary.periodEnd}
                                            </p>
                                            <table className="table table-sm table-borderless mb-0">
                                                <tbody>
                                                    <tr>
                                                        <td className="text-muted">Suma movimientos banco (periodo)</td>
                                                        <td className="text-end">{fmtMoney(reconciliationSummary.movementsInPeriodNetSum)}</td>
                                                    </tr>
                                                    <tr>
                                                        <td className="text-muted">Movimientos en periodo (cant.)</td>
                                                        <td className="text-end">{reconciliationSummary.movementsInPeriodCount}</td>
                                                    </tr>
                                                    <tr>
                                                        <td className="text-muted">Suma vinculada a esta sesión</td>
                                                        <td className="text-end">{fmtMoney(reconciliationSummary.movementsLinkedToSessionNetSum)}</td>
                                                    </tr>
                                                    <tr>
                                                        <td className="text-muted">Pendientes en periodo (suma)</td>
                                                        <td className="text-end">{fmtMoney(reconciliationSummary.unmatchedMovementsInPeriodNetSum)}</td>
                                                    </tr>
                                                    <tr>
                                                        <td className="text-muted">Pendientes en periodo (cant.)</td>
                                                        <td className="text-end">{reconciliationSummary.unmatchedMovementsInPeriodCount}</td>
                                                    </tr>
                                                    <tr className="border-top">
                                                        <td className="text-muted">Saldo inicial extracto</td>
                                                        <td className="text-end">{fmtMoney(reconciliationSummary.statementOpeningBalance)}</td>
                                                    </tr>
                                                    <tr>
                                                        <td className="text-muted">Saldo calculado (inicial + mov. periodo)</td>
                                                        <td className="text-end">{fmtMoney(reconciliationSummary.computedClosingFromExtractOpening)}</td>
                                                    </tr>
                                                    <tr>
                                                        <td className="text-muted">Saldo final extracto</td>
                                                        <td className="text-end">{fmtMoney(reconciliationSummary.statementClosingBalance)}</td>
                                                    </tr>
                                                    <tr>
                                                        <td>
                                                            <strong>Aritmética extracto</strong>
                                                            {reconciliationSummary.extractArithmeticOk === true && (
                                                                <span className="badge bg-label-success ms-2">Cuadra</span>
                                                            )}
                                                            {reconciliationSummary.extractArithmeticOk === false && (
                                                                <span className="badge bg-label-danger ms-2">Descuadre</span>
                                                            )}
                                                        </td>
                                                        <td className="text-end">
                                                            {reconciliationSummary.extractArithmeticDifference != null
                                                                ? fmtMoney(reconciliationSummary.extractArithmeticDifference)
                                                                : '—'}
                                                            <div className="text-muted" style={{ fontSize: '0.75rem' }}>Diferencia (calc. − final)</div>
                                                        </td>
                                                    </tr>
                                                    <tr className="border-top">
                                                        <td className="text-muted">Saldo inicial cuenta bancaria</td>
                                                        <td className="text-end">{fmtMoney(reconciliationSummary.bankAccountInitialBalance)}</td>
                                                    </tr>
                                                    <tr>
                                                        <td className="text-muted">Suma comprobantes hasta fin periodo</td>
                                                        <td className="text-end">{fmtMoney(reconciliationSummary.voucherMovementsUpToPeriodEndSum)}</td>
                                                    </tr>
                                                    <tr>
                                                        <td className="text-muted">Saldo libro aprox. (fin periodo)</td>
                                                        <td className="text-end">{fmtMoney(reconciliationSummary.bookBalanceAtPeriodEnd)}</td>
                                                    </tr>
                                                    <tr>
                                                        <td>
                                                            <strong>Extracto vs libro</strong>
                                                            {reconciliationSummary.statementClosingMatchesBook === true && (
                                                                <span className="badge bg-label-success ms-2">Coincide</span>
                                                            )}
                                                            {reconciliationSummary.statementClosingMatchesBook === false && (
                                                                <span className="badge bg-label-warning ms-2">Revisar</span>
                                                            )}
                                                        </td>
                                                        <td className="text-end">
                                                            {reconciliationSummary.statementClosingVsBookDifference != null
                                                                ? fmtMoney(reconciliationSummary.statementClosingVsBookDifference)
                                                                : '—'}
                                                            <div className="text-muted" style={{ fontSize: '0.75rem' }}>Diferencia (final extracto − libro)</div>
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                            <p className="text-muted mt-2 mb-0" style={{ fontSize: '0.75rem' }}>
                                                El saldo libro suma el saldo inicial de la cuenta más los comprobantes con esta cuenta bancaria hasta la fecha fin del periodo.
                                                Si hay operaciones sin comprobante o fechas distintas al extracto, puede haber diferencia legítima.
                                            </p>
                                        </div>
                                    ) : null}
                                </div>
                            ) : null}
                            {/* <select className="form-select form-select-sm" value={selectedSessionId} onChange={(e) => setSelectedSessionId(e.target.value)}>
                                <option value="">— Sin sesión —</option>
                                {sessions.filter((s) => s.status === 'DRAFT').map((s) => (
                                    <option key={s.id} value={s.id}>Borrador {s.periodStart} → {s.periodEnd}</option>
                                ))}
                            </select> */}
                        </div>

                        <div className="col-lg-7">
                            <h6 className="fw-semibold mb-3">Alta e importación</h6>
                            <div className="row g-2 align-items-end mb-3">
                                <div className="col-md-6">
                                    <InputDate
                                        id="movementDate"
                                        placeholder="dd/mm/yyyy"
                                        label="Fecha"
                                        date={movForm.movementDate}
                                        onChange={(value) => setMovForm((f) => ({ ...f, movementDate: value }))}
                                    />
                                </div>
                                <div className="col-md-6">
                                    <InputModal
                                        id="amount"
                                        label="Importe (− egreso)"
                                        placeholder="Importe"
                                        value={movForm.amount}
                                        onChange={(e) => setMovForm((f) => ({ ...f, amount: e.target.value.replace(',', '.').replace(' ', '').replace(/[a-zA-Z]/g, "") }))}
                                    />
                                    {/* <label className="form-label small">Importe (− egreso)</label>
                                    <input type="text" className="form-control form-control-sm" placeholder="-500000" value={movForm.amount} onChange={(e) => setMovForm((f) => ({ ...f, amount: e.target.value }))} /> */}
                                </div>
                                <div className="col-md-12">
                                    <InputModal
                                        id="description"
                                        label="Descripción"
                                        placeholder="Descripción"
                                        value={movForm.description}
                                        onChange={(e) => setMovForm((f) => ({ ...f, description: e.target.value }))}
                                    />
                                    {/* <label className="form-label small">Descripción</label>
                                    <input type="text" className="form-control form-control-sm" value={movForm.description} onChange={(e) => setMovForm((f) => ({ ...f, description: e.target.value }))} /> */}
                                </div>
                                <div className="col-md-6">
                                    <InputModal
                                        id="reference"
                                        label="Referencia"
                                        placeholder="Referencia"
                                        value={movForm.reference}
                                        onChange={(e) => setMovForm((f) => ({ ...f, reference: e.target.value }))}
                                    />
                                    {/* <label className="form-label small">Referencia</label>
                                    <input type="text" className="form-control form-control-sm" value={movForm.reference} onChange={(e) => setMovForm((f) => ({ ...f, reference: e.target.value }))} /> */}
                                </div>
                                <div className="col-md-6">
                                    <button
                                        type="button"
                                        className="btn btn-lg btn-primary mt-4"
                                        onClick={addMovement}
                                        disabled={savingMovement}
                                    >
                                        {savingMovement ? 'Registrando...' : 'Registrar movimiento'}
                                    </button>
                                </div>
                            </div>
                            <div className="mb-2">
                                <label className="form-label small">Importar CSV (fecha;importe;descripcion;referencia)</label>
                                <input type="file" accept=".csv,text/csv" className="form-control form-control-sm" onChange={importCsv} />
                            </div>
                        </div>
                    </div>

                    <hr className="my-4" />

                    <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                        <h6 className="fw-semibold mb-0">Movimientos</h6>
                        <div className="form-check">
                            <input className="form-check-input" type="checkbox" id="unmatched" checked={unmatchedOnly} onChange={(e) => setUnmatchedOnly(e.target.checked)} />
                            <label className="form-check-label small" htmlFor="unmatched">Solo pendientes</label>
                        </div>
                    </div>

                    <DataTableReference
                        data={movements}
                        columns={[
                            { data: 'movementDate', title: 'Fecha' },
                            { data: 'amount', title: 'Importe', render: (a) => {
                                return formatPrice(a);
                            } },
                            { data: 'description', title: 'Descripción' },
                            { data: 'externalReference', title: 'Ref.' },
                            { data: 'sourceType', title: 'Origen' },
                            { data: 'matchedCheckId', title: 'Emparejado', render: (data, type, row) => matchLabel(row) },
                            { data: 'actions', title: 'Acciones', render: (data, type, m) => {
                                return `
                                    ${!m.matchedCheckId && !m.matchedVoucherId ? `
                                        <button type="button" class="btn btn-sm btn-label-primary" data-action="match" data-id="${m.id}">Emparejar</button>
                                    ` : ''}
                                    ${m.matchedVoucherId && !m.matchedCheckId ? `
                                        <button type="button" class="btn btn-sm btn-label-secondary ms-1" data-action="unmatch" data-id="${m.id}">Quitar</button>
                                    ` : ''}
                                `;
                            } }
                        ]}
                        filtered={false}
                        tableRef={tableRef}
                        dataTableRef={dataTableRef}
                        method="POST"
                        buttons={[]}
                        title="Movimientos"
                        setData={setMovements}
                        lengthMenu={[10, 25, 50, 100, 200]}
                    />

                    {/* <div className="table-responsive">
                        <table className="table table-sm table-hover">
                            <thead>
                                <tr>
                                    <th>Fecha</th>
                                    <th>Importe</th>
                                    <th>Descripción</th>
                                    <th>Ref.</th>
                                    <th>Origen</th>
                                    <th>Emparejado</th>
                                    <th />
                                </tr>
                            </thead>
                            <tbody>
                                {movements.map((m) => (
                                    <tr key={m.id}>
                                        <td>{m.movementDate}</td>
                                        <td className="text-nowrap">{formatPrice(m.amount)}</td>
                                        <td>{m.description || '—'}</td>
                                        <td><small>{m.externalReference || '—'}</small></td>
                                        <td><small>{m.sourceType}</small></td>
                                        <td><small>{matchLabel(m)}</small></td>
                                        <td className="text-nowrap">
                                            {!m.matchedCheckId && !m.matchedVoucherId && (
                                                <button type="button" className="btn btn-sm btn-label-primary" onClick={() => openMatchModal(m)}>Emparejar</button>
                                            )}
                                            {m.matchedVoucherId && !m.matchedCheckId && (
                                                <button type="button" className="btn btn-sm btn-label-secondary ms-1" onClick={() => submitUnmatch(m)}>Quitar</button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {!movements.length && !loading && <p className="text-muted small">No hay movimientos.</p>}
                    </div> */}
                </div>
            </div>

            {matchModal.open && (
                <div className="modal fade show d-block" tabIndex={-1} style={{ background: 'rgba(0,0,0,0.4)' }}>
                    <div className="modal-dialog modal-dialog-centered modal-lg">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Emparejar con comprobante</h5>
                                <button type="button" className="btn-close" onClick={closeMatchModal} aria-label="Cerrar" />
                            </div>
                            <div className="modal-body">

                            <AlertPage type={message.type} message={message.message} show={message.show} onChange={() => setMessage({ message: '', type: '', show: false })} />

                                
                                <p className="small text-muted mb-2">
                                    Movimiento {matchModal.movement?.movementDate} — {formatPrice(matchModal.movement?.amount)}
                                </p>
                                {matchModal.loadingSug ? <p>Cargando sugerencias…</p> : null}
                                {!matchModal.loadingSug && matchModal.suggestions.length > 0 && (
                                    <div className="table-responsive mb-3">
                                        <table className="table table-sm">
                                            <thead><tr><th>#</th><th>Fecha</th><th>Importe</th><th>Descripción</th><th /></tr></thead>
                                            <tbody>
                                                {matchModal.suggestions.map((s) => (
                                                    <tr key={s.id}>
                                                        <td>{s.number}</td>
                                                        <td>{s.date}</td>
                                                        <td>{formatPrice(s.amount)}</td>
                                                        <td><small>{s.description}</small></td>
                                                        <td>
                                                            <button type="button" className="btn btn-sm btn-success" onClick={() => submitMatch(s.id)}>Usar</button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                                {!matchModal.loadingSug && !matchModal.suggestions.length && (
                                    <p className="small text-muted">No hay sugerencias automáticas (mismo importe absoluto ±7 días).</p>
                                )}

                                <InputSelectModal
                                    id="voucherId"
                                    label="Comprobante manual"
                                    placeholder="Selecciona un comprobante"
                                    options={vouchers.map((v) => ({ id: v.id, label: `${v.number} - ${formatPrice(v.amount)} - ${v.date}` }))}
                                    value={matchModal.voucherId}
                                    clearable={true}
                                    onChange={(value) => setMatchModal((x) => ({ ...x, voucherId: value }))}
                                />

                                <button type="button" className="btn btn-primary mt-2" onClick={() => submitMatch()}>Emparejar</button>


                                {/* <label className="form-label small">ID comprobante manual</label>
                                <div className="input-group input-group-sm">
                                    <input type="number" className="form-control" value={matchModal.voucherId} onChange={(e) => setMatchModal((x) => ({ ...x, voucherId: e.target.value }))} placeholder="Ej. 42" />
                                </div> */}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default BankReconciliation;
