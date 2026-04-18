import { useEffect, useState } from 'react';

import InputModal from '../../../components/molecules/InputModal';
import InputSelectModal from '../../../components/molecules/inputSelectModal';
import AlertPage from '../../../components/molecules/AlertPage';

import { base_url } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';

/**
 * Modal para crear una Nota Credito o Debito sobre una factura de venta.
 * Envia POST a /api/v1/ar/notes. Cubre HU AR-07.
 */

const NOTE_TYPES = [
    { id: 'CREDIT', name: 'Nota Credito (reduce saldo)' },
    { id: 'DEBIT', name: 'Nota Debito (incrementa saldo)' },
];

const emptyErrors = {
    invoiceId: '',
    noteType: '',
    amount: '',
    reason: '',
};

const emptyRecord = {
    invoiceId: '',
    noteType: '',
    amount: '',
    reason: '',
};

const CreateArNote = ({ modalRef, modalInstance, dataTableRef, setMessage }) => {
    const [record, setRecord] = useState({ ...emptyRecord });
    const [errors, setErrors] = useState({ ...emptyErrors });
    const [errorMessage, setErrorMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [invoices, setInvoices] = useState([]);

    useEffect(() => { loadInvoices(); }, []);

    const loadInvoices = async () => {
        try {
            const { data } = await fetchHelper.post(
                base_url(['api', 'v1', 'sales-invoices', 'search']),
                { length: -1, columns: [] },
                {},
                0
            );
            const list = Array.isArray(data) ? data : data?.data || [];
            setInvoices(list.map((inv) => ({
                id: inv.id,
                name: `${inv.invoiceNumber || ('#' + inv.id)} - ${inv.thirdPartyName || ''}`.trim(),
            })));
        } catch (e) {
            console.log('Error cargando facturas de venta:', e);
        }
    };

    useEffect(() => {
        setErrors({ ...emptyErrors });
        setErrorMessage('');
    }, [record]);

    const validate = () => {
        const next = { ...emptyErrors };
        let valid = true;

        if (!record.invoiceId) { next.invoiceId = 'Debe seleccionar una factura'; valid = false; }
        if (!record.noteType) { next.noteType = 'Debe seleccionar el tipo de nota'; valid = false; }
        if (!record.amount || Number(record.amount) <= 0) { next.amount = 'El monto debe ser mayor a cero'; valid = false; }
        if (!record.reason || record.reason.trim().length < 5) {
            next.reason = 'La razon es obligatoria (minimo 5 caracteres)';
            valid = false;
        }

        setErrors(next);
        return valid;
    };

    const handleSubmit = async () => {
        if (!validate()) return;

        const payload = {
            invoiceId: Number(record.invoiceId),
            noteType: record.noteType,
            amount: Number(record.amount),
            reason: record.reason.trim(),
        };

        try {
            setLoading(true);
            await fetchHelper.post(base_url(['api', 'v1', 'ar', 'notes']), payload, {}, 1000);

            dataTableRef?.current?.ajax.reload();
            modalInstance?.current?.hide();
            setRecord({ ...emptyRecord });
            setMessage({ type: 'success', show: true, message: 'Nota creada exitosamente.' });
        } catch (error) {
            const backendErrors = error?.errors;
            if (Array.isArray(backendErrors) && backendErrors.length > 0) {
                const next = { ...emptyErrors };
                backendErrors.forEach((item) => {
                    if (item.field) next[item.field] = item.message;
                });
                setErrors(next);
            } else {
                setErrorMessage(error?.msg || 'Error al crear la nota.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleClear = () => {
        setRecord({ ...emptyRecord });
        setErrors({ ...emptyErrors });
        setErrorMessage('');
    };

    return (
        <div className="modal fade" ref={modalRef} id="modalCreateArNote" tabIndex={-1} aria-hidden="true">
            <div className="modal-dialog modal-lg modal-dialog-centered" role="document">
                <div className="modal-content">
                    <div className="modal-header">
                        <h4 className="modal-title">Crear Nota Credito / Debito</h4>
                        <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close" />
                    </div>

                    <div className="modal-body">
                        <AlertPage
                            message={errorMessage}
                            type="danger"
                            show={errorMessage !== ''}
                            onChange={() => setErrorMessage('')}
                        />

                        <div className="row">
                            <div className="col-md-6 mb-4 mt-2">
                                <InputSelectModal
                                    id="ar_note_invoice"
                                    label="Factura de Venta"
                                    value={String(record.invoiceId || '')}
                                    onChange={(value) => setRecord((prev) => ({ ...prev, invoiceId: value }))}
                                    error={errors.invoiceId}
                                    placeholder="Seleccione factura"
                                    options={invoices}
                                    required
                                />
                            </div>
                            <div className="col-md-6 mb-4 mt-2">
                                <InputSelectModal
                                    id="ar_note_type"
                                    label="Tipo de Nota"
                                    value={record.noteType}
                                    onChange={(value) => setRecord((prev) => ({ ...prev, noteType: value }))}
                                    error={errors.noteType}
                                    placeholder="Seleccione tipo"
                                    options={NOTE_TYPES}
                                    required
                                />
                            </div>
                        </div>

                        <div className="row">
                            <div className="col-md-6 mb-4 mt-2">
                                <InputModal
                                    type="number"
                                    id="ar_note_amount"
                                    label="Monto"
                                    value={record.amount}
                                    onChange={(e) => setRecord((prev) => ({ ...prev, amount: e.target.value }))}
                                    error={errors.amount}
                                    placeholder="0.00"
                                    min={0}
                                    required
                                />
                            </div>
                        </div>

                        <div className="row">
                            <div className="col-12 mb-4 mt-2">
                                <InputModal
                                    type="text"
                                    id="ar_note_reason"
                                    label="Razon / Justificacion"
                                    value={record.reason}
                                    onChange={(e) => setRecord((prev) => ({ ...prev, reason: e.target.value }))}
                                    error={errors.reason}
                                    placeholder="Motivo de la nota"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    <div className="modal-footer">
                        <button type="button" className="btn btn-primary ms-auto" onClick={handleSubmit} disabled={loading}>
                            {loading ? 'Guardando...' : 'Guardar'}
                        </button>
                        <button type="button" className="btn btn-danger" onClick={handleClear} disabled={loading}>
                            Limpiar
                        </button>
                        <button type="button" className="btn btn-outline-secondary" data-bs-dismiss="modal" disabled={loading}>
                            Volver
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreateArNote;
