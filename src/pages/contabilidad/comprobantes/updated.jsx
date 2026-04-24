import { useState, useEffect } from 'react';
import InputModal from '../../../components/molecules/InputModal';
import InputSelectModal from '../../../components/molecules/inputSelectModal';
import { base_url } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';

/**
 * Modal de edicion de Comprobante Contable (HU-CG-07A).
 *
 * Permite modificar la cabecera y las lineas de un asiento que esta en estado
 * BORRADOR. Usa el endpoint PUT /api/v1/journal-entries/{id} ya implementado en
 * backend (JournalEntryService.updateEntry — re-valida partida doble, periodo
 * abierto y cuentas activas, y solo permite editar DRAFT).
 *
 * No se reutiliza create.jsx porque la operacion es PUT (no POST), recibe un
 * payload UpdateJournalEntryRequest distinto, y tiene logica propia de prefill
 * desde GET /api/v1/journal-entries/{id}.
 */

const SOURCE_OPTIONS = [
    { id: 'CG',  label: 'Contabilidad General' },
    { id: 'AP',  label: 'Cuentas por Pagar' },
    { id: 'AR',  label: 'Cuentas por Cobrar' },
    { id: 'BNK', label: 'Bancos y Cajas' },
    { id: 'ACT', label: 'Activos Fijos' },
    { id: 'NOM', label: 'Nomina' },
];

const emptyLine = () => ({
    accountingAccountId: '',
    debitAmount: '',
    creditAmount: '',
    description: '',
    thirdPartyNit: '',
});

const fmt = (n) => Number(n || 0).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

const UpdateComprobante = ({ modalRef, modalInstance, dataTableRef, setMessage, entryId }) => {
    const [form, setForm]                 = useState({ entryDate: '', description: '', sourceModule: 'CG' });
    const [lines, setLines]               = useState([emptyLine(), emptyLine()]);
    const [accounts, setAccounts]         = useState([]);
    const [errors, setErrors]             = useState({});
    const [errorMessage, setErrorMessage] = useState('');
    const [submitting, setSubmitting]     = useState(false);
    const [loading, setLoading]           = useState(false);

    /** Carga catalogo de cuentas (una vez). */
    useEffect(() => {
        (async () => {
            try {
                const resp = await fetchHelper.post(
                    base_url(['api', 'v1', 'accounting-accounts']),
                    { start: 0, length: -1, draw: 1 },
                    {}, 1000, true
                );
                const data = resp?.data || resp;
                const list = (data?.data || data || []).map(a => {
                    const pucCode = a.pucAccount?.code || a.pucCode || a.code || '';
                    const label   = a.customName || a.pucAccount?.name || a.name || 'Sin nombre';
                    return {
                        id: a.id,
                        name: pucCode ? `${label} (${pucCode})` : label,
                    };
                });
                setAccounts(list);
            } catch (e) {
                setAccounts([]);
            }
        })();
    }, []);

    /** Cuando llega un entryId nuevo, recarga el detalle del comprobante. */
    useEffect(() => {
        if (!entryId) return;
        (async () => {
            setLoading(true);
            setErrorMessage('');
            try {
                const resp = await fetchHelper.get(
                    base_url(['api', 'v1', 'journal-entries', entryId]),
                    {}, 0
                );
                const data = resp?.data || resp;
                if (data?.status && data.status !== 'DRAFT') {
                    setErrorMessage('Este comprobante ya fue contabilizado y no puede modificarse. '
                        + 'Use la opcion Reversar para crear un asiento de correccion.');
                    return;
                }
                setForm({
                    entryDate:    data?.entryDate || '',
                    description:  data?.description || '',
                    sourceModule: data?.sourceModule || 'CG',
                });
                const ls = (data?.lines || []).map(l => ({
                    accountingAccountId: l.accountingAccountId || '',
                    debitAmount:  l.debitAmount  || '',
                    creditAmount: l.creditAmount || '',
                    description:  l.description  || '',
                    thirdPartyNit: l.thirdPartyNit || '',
                }));
                setLines(ls.length >= 2 ? ls : [...ls, emptyLine()]);
            } catch (err) {
                setErrorMessage(err?.msg || 'Error al cargar el comprobante.');
            } finally {
                setLoading(false);
            }
        })();
    }, [entryId]);

    const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));
    const setLine = (idx, field, value) => {
        setLines(prev => prev.map((l, i) => (i === idx ? { ...l, [field]: value } : l)));
    };
    const addLine = () => setLines(prev => [...prev, emptyLine()]);
    const removeLine = (idx) => {
        setLines(prev => prev.length <= 2 ? prev : prev.filter((_, i) => i !== idx));
    };

    const totalDebit  = lines.reduce((s, l) => s + Number(l.debitAmount || 0), 0);
    const totalCredit = lines.reduce((s, l) => s + Number(l.creditAmount || 0), 0);
    const balanced    = totalDebit === totalCredit && totalDebit > 0;

    const handleSubmit = async () => {
        setErrors({});
        setErrorMessage('');

        if (!form.entryDate) {
            setErrorMessage('La fecha es obligatoria.');
            return;
        }
        const cleanLines = lines
            .filter(l => l.accountingAccountId && (Number(l.debitAmount) > 0 || Number(l.creditAmount) > 0))
            .map(l => ({
                accountingAccountId: Number(l.accountingAccountId),
                debitAmount:  Number(l.debitAmount || 0),
                creditAmount: Number(l.creditAmount || 0),
                description:  l.description || null,
                thirdPartyNit: l.thirdPartyNit || null,
            }));

        if (cleanLines.length < 2) {
            setErrorMessage('El asiento debe tener al menos 2 lineas con cuenta y valor.');
            return;
        }
        const td = cleanLines.reduce((s, l) => s + l.debitAmount, 0);
        const tc = cleanLines.reduce((s, l) => s + l.creditAmount, 0);
        if (td !== tc || td === 0) {
            setErrorMessage(`Partida doble no cuadra: Debito $${fmt(td)} != Credito $${fmt(tc)}.`);
            return;
        }

        const payload = {
            entryDate:    form.entryDate,
            description:  form.description || null,
            sourceModule: form.sourceModule || 'CG',
            lines: cleanLines,
        };

        setSubmitting(true);
        try {
            await fetchHelper.put(
                base_url(['api', 'v1', 'journal-entries', entryId]),
                payload, {}, 1000, true
            );
            modalInstance?.current?.hide();
            dataTableRef?.current?.ajax?.reload?.();
            setMessage?.({ type: 'success', show: true, message: 'Comprobante actualizado exitosamente.' });
        } catch (err) {
            if (err?.errors) {
                const fe = {};
                err.errors.forEach(e => { fe[e.field] = e.message; });
                setErrors(fe);
            }
            setErrorMessage(err?.msg || err?.message || 'Error al actualizar el comprobante.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="modal fade" ref={modalRef} tabIndex="-1" aria-hidden="true">
            <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">
                            <i className="ri-edit-line me-2" />Editar Comprobante Contable (BORRADOR)
                        </h5>
                        <button type="button" className="btn-close" data-bs-dismiss="modal" />
                    </div>
                    <div className="modal-body">
                        {loading && <div className="text-center py-3"><span className="spinner-border spinner-border-sm me-2" />Cargando comprobante...</div>}
                        {errorMessage && <div className="alert alert-danger py-2 mb-3">{errorMessage}</div>}

                        {!loading && (
                        <>
                            <div className="row">
                                <div className="col-md-4 mb-3">
                                    <InputModal
                                        id="je_date_edit" label="Fecha" type="date"
                                        value={form.entryDate}
                                        onChange={e => set('entryDate', e.target.value)}
                                        error={errors.entryDate} required={true}
                                    />
                                </div>
                                <div className="col-md-4 mb-3">
                                    <InputSelectModal
                                        id="je_src_edit" label="Modulo Origen"
                                        options={SOURCE_OPTIONS.map(o => ({ id: o.id, name: o.label }))}
                                        value={form.sourceModule}
                                        onChange={(val) => set('sourceModule', val)}
                                        error={errors.sourceModule}
                                    />
                                </div>
                                <div className="col-md-4 mb-3">
                                    <InputModal
                                        id="je_desc_edit" label="Descripcion"
                                        type="text"
                                        value={form.description}
                                        onChange={e => set('description', e.target.value)}
                                        error={errors.description}
                                    />
                                </div>
                            </div>

                            <h6 className="mt-2 mb-2"><i className="ri-list-check me-1" />Lineas del asiento</h6>
                            <div className="table-responsive">
                                <table className="table table-sm align-middle">
                                    <thead className="table-light">
                                        <tr>
                                            <th style={{ width: '32%' }}>Cuenta *</th>
                                            <th style={{ width: '12%' }}>Tercero (NIT)</th>
                                            <th style={{ width: '15%' }} className="text-end">Debito</th>
                                            <th style={{ width: '15%' }} className="text-end">Credito</th>
                                            <th>Descripcion</th>
                                            <th style={{ width: '4%' }}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {lines.map((l, i) => {
                                            const hasDebit  = Number(l.debitAmount)  > 0;
                                            const hasCredit = Number(l.creditAmount) > 0;
                                            return (
                                                <tr key={i}>
                                                    <td>
                                                        <select
                                                            className="form-select form-select-sm"
                                                            value={l.accountingAccountId}
                                                            onChange={e => setLine(i, 'accountingAccountId', e.target.value)}
                                                        >
                                                            <option value="">--seleccione--</option>
                                                            {accounts.map(a => (
                                                                <option key={a.id} value={a.id}>{a.name}</option>
                                                            ))}
                                                        </select>
                                                    </td>
                                                    <td>
                                                        <input type="text" className="form-control form-control-sm"
                                                            value={l.thirdPartyNit}
                                                            onChange={e => setLine(i, 'thirdPartyNit', e.target.value)}
                                                            placeholder="Opcional" />
                                                    </td>
                                                    <td>
                                                        <input type="number" min="0" step="0.01"
                                                            className="form-control form-control-sm text-end"
                                                            value={l.debitAmount}
                                                            disabled={hasCredit}
                                                            onChange={e => setLine(i, 'debitAmount', e.target.value)} />
                                                    </td>
                                                    <td>
                                                        <input type="number" min="0" step="0.01"
                                                            className="form-control form-control-sm text-end"
                                                            value={l.creditAmount}
                                                            disabled={hasDebit}
                                                            onChange={e => setLine(i, 'creditAmount', e.target.value)} />
                                                    </td>
                                                    <td>
                                                        <input type="text" className="form-control form-control-sm"
                                                            value={l.description}
                                                            onChange={e => setLine(i, 'description', e.target.value)}
                                                            placeholder="Opcional" />
                                                    </td>
                                                    <td>
                                                        <button type="button" className="btn btn-sm btn-label-danger"
                                                            onClick={() => removeLine(i)}
                                                            disabled={lines.length <= 2}
                                                            title="Eliminar linea">
                                                            <i className="ri-delete-bin-5-line" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                    <tfoot className="table-light fw-bold">
                                        <tr>
                                            <td colSpan="2" className="text-end">TOTALES</td>
                                            <td className="text-end">${fmt(totalDebit)}</td>
                                            <td className="text-end">${fmt(totalCredit)}</td>
                                            <td>
                                                <span className={`badge ${balanced ? 'bg-label-success' : 'bg-label-danger'}`}>
                                                    {balanced ? 'PARTIDA DOBLE CUADRA' : 'NO CUADRA'}
                                                </span>
                                            </td>
                                            <td></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                            <div className="text-end">
                                <button type="button" className="btn btn-sm btn-label-primary" onClick={addLine}>
                                    <i className="ri-add-line me-1" />Agregar linea
                                </button>
                            </div>
                        </>
                        )}
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-label-secondary" data-bs-dismiss="modal">Cancelar</button>
                        <button type="button" className="btn btn-primary"
                                onClick={handleSubmit}
                                disabled={submitting || loading || !balanced}>
                            {submitting ? <><span className="spinner-border spinner-border-sm me-2" />Guardando...</> : 'Guardar cambios'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UpdateComprobante;
