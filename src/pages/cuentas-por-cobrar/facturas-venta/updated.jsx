import { useEffect, useState } from 'react';

import InputModal from '../../../components/molecules/InputModal';
import AlertPage from '../../../components/molecules/AlertPage';

import { base_url } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';

/**
 * Modal de edicion de Factura de Venta.
 * Permite actualizar: fecha de vencimiento, resolucion DIAN y notas.
 * No permite modificar factura con pagos, anulada, o liquidada.
 */
const UpdatedSalesInvoice = ({ modalRef, modalInstance, dataTableRef, record, setMessage }) => {
    const [form, setForm] = useState({ dueDate: '', resolutionNumber: '', notes: '' });
    const [errorMessage, setErrorMessage] = useState('');
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
            setErrorMessage(err?.message || err?.msg || 'Error al actualizar la factura.');
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
                                onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />

                            <InputModal label="Resolucion DIAN" name="resolutionNumber" type="text"
                                value={form.resolutionNumber}
                                onChange={(e) => setForm({ ...form, resolutionNumber: e.target.value })} />

                            <InputModal label="Notas" name="notes" type="text"
                                value={form.notes}
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
