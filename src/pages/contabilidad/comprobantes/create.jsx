import { useState, useEffect } from 'react';
import InputModal from '../../../components/molecules/InputModal';
import InputSelectModal from '../../../components/molecules/inputSelectModal';
import { base_url } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';

/**
 * Modal para crear un nuevo Comprobante Contable (Journal Entry).
 * POST a /api/v1/journal-entries/store con partida doble.
 */

/** Opciones del modulo origen del comprobante. */
const SOURCE_OPTIONS = [
    { id: 'CG',  label: 'Contabilidad General' },
    { id: 'AP',  label: 'Cuentas por Pagar' },
    { id: 'AR',  label: 'Cuentas por Cobrar' },
    { id: 'BNK', label: 'Bancos y Cajas' },
    { id: 'ACT', label: 'Activos Fijos' },
    { id: 'NOM', label: 'Nomina' },
];

/** Linea vacia inicial. */
const emptyLine = () => ({
    accountingAccountId: '',
    debitAmount: '',
    creditAmount: '',
    description: '',
    thirdPartyNit: '',
});

/** Formatea moneda COP. */
const fmt = (n) => Number(n || 0).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

const CreateComprobante = ({ modalRef, modalInstance, dataTableRef, setMessage }) => {
    const [form, setForm]                 = useState({ entryDate: '', description: '', sourceModule: 'CG' });
    const [lines, setLines]               = useState([emptyLine(), emptyLine()]);
    const [accounts, setAccounts]         = useState([]);
    const [errors, setErrors]             = useState({});
    const [errorMessage, setErrorMessage] = useState('');
    const [submitting, setSubmitting]     = useState(false);

    /** Carga el catalogo de cuentas contables una sola vez. */
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
                // Silenciar; el usuario vera select vacio y podra reintentar
                setAccounts([]);
            }
        })();
    }, []);

    /** Actualiza un campo del formulario. */
    const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

    /** Actualiza un campo de una linea por indice. */
    const setLine = (idx, field, value) => {
        setLines(prev => prev.map((l, i) => (i === idx ? { ...l, [field]: value } : l)));
    };

    /** Agrega una linea vacia al final. */
    const addLine = () => setLines(prev => [...prev, emptyLine()]);

    /** Elimina una linea por indice. */
    const removeLine = (idx) => {
        setLines(prev => prev.length <= 2 ? prev : prev.filter((_, i) => i !== idx));
    };

    /** Totales y validacion de partida doble. */
    const totalDebit  = lines.reduce((s, l) => s + Number(l.debitAmount || 0), 0);
    const totalCredit = lines.reduce((s, l) => s + Number(l.creditAmount || 0), 0);
    const balanced    = totalDebit === totalCredit && totalDebit > 0;

    /** Envia el formulario al backend. */
    const handleSubmit = async () => {
        setErrors({});
        setErrorMessage('');

        // Validaciones cliente
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
            await fetchHelper.post(
                base_url(['api', 'v1', 'journal-entries', 'store']),
                payload, {}, 1000, true
            );
            modalInstance?.current?.hide();
            setForm({ entryDate: '', description: '', sourceModule: 'CG' });
            setLines([emptyLine(), emptyLine()]);
            dataTableRef?.current?.ajax?.reload?.();
            setMessage?.({ type: 'success', show: true, message: 'Comprobante registrado exitosamente.' });
        } catch (err) {
            if (err?.errors) {
                const fieldErrors = {};
                err.errors.forEach(e => { fieldErrors[e.field] = e.message; });
                setErrors(fieldErrors);
            }
            setErrorMessage(err?.msg || err?.message || 'Error al registrar el comprobante.');
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
                            <i className="ri-file-list-3-line me-2" />Nuevo Comprobante Contable
                        </h5>
                        <button type="button" className="btn-close" data-bs-dismiss="modal" />
                    </div>
                    <div className="modal-body">
                        {errorMessage && <div className="alert alert-danger py-2 mb-3">{errorMessage}</div>}

                        {/* Cabecera */}
                        <div className="row">
                            <div className="col-md-4 mb-3">
                                <InputModal
                                    id="je_date" label="Fecha" type="date"
                                    value={form.entryDate}
                                    onChange={e => set('entryDate', e.target.value)}
                                    error={errors.entryDate} required={true}
                                />
                            </div>
                            <div className="col-md-4 mb-3">
                                <InputSelectModal
                                    id="je_source" label="Modulo Origen"
                                    value={form.sourceModule}
                                    onChange={v => set('sourceModule', v)}
                                    error={errors.sourceModule}
                                    options={SOURCE_OPTIONS}
                                    placeholder="Seleccione modulo"
                                    required={true}
                                />
                            </div>
                            <div className="col-md-4 mb-3">
                                <InputModal
                                    id="je_desc" label="Descripcion"
                                    value={form.description}
                                    onChange={e => set('description', e.target.value)}
                                    error={errors.description}
                                />
                            </div>
                        </div>

                        {/* Lineas */}
                        <div className="d-flex justify-content-between align-items-center mb-2">
                            <h6 className="mb-0"><i className="ri-list-check me-1" />Lineas del asiento</h6>
                            <button type="button" className="btn btn-sm btn-outline-primary" onClick={addLine}>
                                <i className="ri-add-line me-1" />Agregar linea
                            </button>
                        </div>

                        <div className="table-responsive">
                            <table className="table table-sm align-middle">
                                <thead className="table-light">
                                    <tr>
                                        <th style={{minWidth: 220}}>Cuenta *</th>
                                        <th style={{minWidth: 130}} className="text-end">Debito</th>
                                        <th style={{minWidth: 130}} className="text-end">Credito</th>
                                        <th style={{minWidth: 120}}>NIT Tercero</th>
                                        <th>Descripcion</th>
                                        <th style={{width: 50}}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {lines.map((l, idx) => (
                                        <tr key={idx}>
                                            <td>
                                                <select
                                                    className="form-select form-select-sm"
                                                    value={l.accountingAccountId}
                                                    onChange={e => setLine(idx, 'accountingAccountId', e.target.value)}
                                                >
                                                    <option value="">-- Seleccionar --</option>
                                                    {accounts.map(a => (
                                                        <option key={a.id} value={a.id}>{a.name}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td>
                                                <input
                                                    type="number" min="0" step="0.01"
                                                    className="form-control form-control-sm text-end"
                                                    value={l.debitAmount}
                                                    onChange={e => setLine(idx, 'debitAmount', e.target.value)}
                                                    placeholder="0"
                                                />
                                            </td>
                                            <td>
                                                <input
                                                    type="number" min="0" step="0.01"
                                                    className="form-control form-control-sm text-end"
                                                    value={l.creditAmount}
                                                    onChange={e => setLine(idx, 'creditAmount', e.target.value)}
                                                    placeholder="0"
                                                />
                                            </td>
                                            <td>
                                                <input
                                                    type="text" maxLength="20"
                                                    className="form-control form-control-sm"
                                                    value={l.thirdPartyNit}
                                                    onChange={e => setLine(idx, 'thirdPartyNit', e.target.value)}
                                                    placeholder="Opcional"
                                                />
                                            </td>
                                            <td>
                                                <input
                                                    type="text" maxLength="500"
                                                    className="form-control form-control-sm"
                                                    value={l.description}
                                                    onChange={e => setLine(idx, 'description', e.target.value)}
                                                    placeholder="Opcional"
                                                />
                                            </td>
                                            <td className="text-center">
                                                <button
                                                    type="button"
                                                    className="btn btn-sm btn-outline-danger"
                                                    onClick={() => removeLine(idx)}
                                                    disabled={lines.length <= 2}
                                                    title="Eliminar linea"
                                                >
                                                    <i className="ri-delete-bin-line" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="table-light">
                                    <tr>
                                        <th className="text-end">Totales</th>
                                        <th className="text-end">${fmt(totalDebit)}</th>
                                        <th className="text-end">${fmt(totalCredit)}</th>
                                        <th colSpan="3">
                                            <span className={`badge ${balanced ? 'bg-label-success' : 'bg-label-danger'}`}>
                                                {balanced ? 'Partida doble cuadra' : 'Desbalanceado: Debito != Credito'}
                                            </span>
                                        </th>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-outline-secondary" data-bs-dismiss="modal">Cancelar</button>
                        <button type="button" className="btn btn-primary"
                            onClick={handleSubmit} disabled={submitting || !balanced}>
                            <i className="ri-save-line me-1" />
                            {submitting ? 'Registrando...' : 'Registrar'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreateComprobante;
