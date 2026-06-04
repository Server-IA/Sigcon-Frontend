import { useEffect, useState } from 'react';

import InputModal from '../../../components/molecules/InputModal';
import AlertPage from '../../../components/molecules/AlertPage';

import { base_url } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';

/**
 * HU-AR-01B DEF#3: traduccion campo->etiqueta para mensajes legibles.
 */
const FIELD_LABELS = {
    thirdPartyId: 'Cliente',
    invoiceDate: 'Fecha de la factura',
    dueDate: 'Fecha de vencimiento',
    resolutionNumber: 'Resolucion DIAN',
    notes: 'Notas',
};

const buildValidationErrors = (errors) => {
    if (!Array.isArray(errors) || errors.length === 0) return { msg: '', map: {} };
    const map = {};
    const lines = errors.map((e) => {
        const field = e?.field || '';
        const label = FIELD_LABELS[field] || field;
        const msg = e?.message || 'Campo invalido';
        map[field] = msg;
        return `- ${label}: ${msg}`;
    });
    return {
        msg: 'Faltan o son invalidos los siguientes campos:\n' + lines.join('\n'),
        map,
    };
};

/**
 * Modal de edicion de Factura de Venta.
 * Permite actualizar: fecha de vencimiento, resolucion DIAN y notas.
 * No permite modificar factura con pagos, anulada, o liquidada.
 */
const UpdatedSalesInvoice = ({ modalRef, modalInstance, dataTableRef, record, setMessage }) => {
    const [form, setForm] = useState({ dueDate: '', resolutionNumber: '', notes: '' });
    const [errorMessage, setErrorMessage] = useState('');
    // HU-AR-01B DEF#3: errores por campo para resaltar inputs invalidos.
    const [fieldErrors, setFieldErrors] = useState({});
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (record) {
            setForm({
                dueDate: record.dueDate || '',
                resolutionNumber: record.resolutionNumber || '',
                notes: record.notes || '',
            });
        }
    }, [record]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!record?.id) return;
        setErrorMessage('');
        setFieldErrors({});
        setLoading(true);
        try {
            await fetchHelper.put(
                base_url(['api', 'v1', 'sales-invoices', record.id]),
                {
                    thirdPartyId: record.thirdPartyId,
                    invoiceDate: record.invoiceDate,
                    dueDate: form.dueDate,
                    resolutionNumber: form.resolutionNumber || null,
                    notes: form.notes || null,
                    lines: [],
                },
                {},
                1000
            );
            setMessage({ type: 'success', show: true, message: 'Factura actualizada correctamente.' });
            dataTableRef?.current?.ajax.reload();
            modalInstance?.current?.hide();
        } catch (err) {
            // HU-AR-01B DEF#3: mostrar campos invalidos detallados.
            const validation = buildValidationErrors(err?.errors);
            if (validation.msg) {
                setErrorMessage(validation.msg);
                setFieldErrors(validation.map);
            } else {
                setErrorMessage(err?.msg || err?.message || 'Error al actualizar la factura.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal fade" tabIndex="-1" ref={modalRef}>
            <div className="modal-dialog" role="document">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">Editar Factura {record?.invoiceNumber || ''}</h5>
                        <button type="button" className="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <form onSubmit={handleSubmit}>
                        <div className="modal-body">
                            <AlertPage type="danger" message={errorMessage} show={!!errorMessage}
                                onChange={() => setErrorMessage('')} />

                            <InputModal label="Fecha de vencimiento" name="dueDate" type="date"
                                value={form.dueDate}
                                error={fieldErrors.dueDate}
                                onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />

                            <InputModal label="Resolucion DIAN" name="resolutionNumber" type="text"
                                value={form.resolutionNumber}
                                error={fieldErrors.resolutionNumber}
                                onChange={(e) => setForm({ ...form, resolutionNumber: e.target.value })} />

                            {/* QA CXC Bug 1 (2026-06-03 / IEEE AR-RF-01A): notas max 1000. */}
                            <InputModal label="Notas" name="notes" type="text"
                                value={form.notes}
                                maxLength={1000}
                                error={fieldErrors.notes}
                                onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-label-secondary" data-bs-dismiss="modal">Cancelar</button>
                            <button type="submit" className="btn btn-primary" disabled={loading}>
                                {loading ? 'Guardando...' : 'Actualizar'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default UpdatedSalesInvoice;
