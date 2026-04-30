import { useEffect, useState } from 'react';

import InputModal from '../../../components/molecules/InputModal';
import InputSelectModal from '../../../components/molecules/inputSelectModal';
import AlertPage from '../../../components/molecules/AlertPage';
import InputDate from '../../../components/molecules/InputDate';

import { base_url } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';

/**
 * Modal para registrar un nuevo Pago a proveedor.
 * Envia POST a /api/v1/ap/payments/store.
 */

/** Metodos de pago disponibles. */
const PAYMENT_METHODS = [
    { id: 'BANK', name: 'Transferencia Bancaria' },
    { id: 'CASH', name: 'Efectivo' },
    { id: 'CHECK', name: 'Cheque' },
];

const emptyErrors = {
    invoiceId: '',
    amount: '',
    paymentDate: '',
    paymentReference: '',
    paymentMethod: '',
    bankAccountId: '',
    notes: '',
};

const emptyRecord = {
    invoiceId: '',
    amount: '',
    paymentDate: '',
    paymentReference: '',
    paymentMethod: '',
    bankAccountId: '',
    notes: '',
};

const CreateApPayment = ({ modalRef, modalInstance, dataTableRef, setMessage }) => {
    const [record, setRecord] = useState({ ...emptyRecord });
    const [errors, setErrors] = useState({ ...emptyErrors });
    const [errorMessage, setErrorMessage] = useState('');
    const [loading, setLoading] = useState(false);

    /** Catalogos. */
    const [invoices, setInvoices] = useState([]);
    const [bankAccounts, setBankAccounts] = useState([]);

    /** Carga facturas pendientes y cuentas bancarias al montar. */
    useEffect(() => {
        loadInvoices();
        loadBankAccounts();
    }, []);

    /** QA-BLOQUE-AS v2 (2026-04-30): reset + remount Select2 al cerrar. */
    const [formKey, setFormKey] = useState(0);
    useEffect(() => {
        const el = modalRef?.current;
        if (!el) return;
        const handler = () => {
            setRecord({ ...emptyRecord });
            setErrors({ ...emptyErrors });
            setErrorMessage('');
            setLoading(false);
            setFormKey((k) => k + 1);
        };
        el.addEventListener('hidden.bs.modal', handler);
        return () => el.removeEventListener('hidden.bs.modal', handler);
    }, [modalRef]);

    const loadInvoices = async () => {
        try {
            const { data } = await fetchHelper.post(
                base_url(['api', 'v1', 'invoices', 'search']),
                { length: -1, columns: [] },
                {},
                0
            );
            if (Array.isArray(data)) {
                setInvoices(data.map((inv) => ({
                    id: inv.id,
                    name: `#${inv.supplierInvoiceNumber || inv.id} - ${inv.thirdPartyName || ''}`.trim(),
                })));
            }
        } catch (e) {
            console.log('Error cargando facturas:', e);
        }
    };

    const loadBankAccounts = async () => {
        try {
            const { data } = await fetchHelper.post(
                base_url(['api', 'v1', 'bank-accounts', 'search']),
                { length: -1, columns: [] },
                {},
                0
            );
            if (Array.isArray(data)) {
                setBankAccounts(data.map((ba) => ({
                    id: ba.id,
                    name: `${ba.accountName || ''} - ${ba.accountNumber || ''}`.trim(),
                })));
            }
        } catch (e) {
            console.log('Error cargando cuentas bancarias:', e);
        }
    };

    useEffect(() => {
        setErrors({ ...emptyErrors });
        setErrorMessage('');
    }, [record]);

    const validate = () => {
        const next = { ...emptyErrors };
        let valid = true;

        if (!record.invoiceId) {
            next.invoiceId = 'Debe seleccionar una factura';
            valid = false;
        }
        if (!record.amount || Number(record.amount) <= 0) {
            next.amount = 'El monto debe ser mayor a cero';
            valid = false;
        }
        if (!record.paymentDate) {
            next.paymentDate = 'La fecha de pago es obligatoria';
            valid = false;
        }
        if (!record.paymentMethod) {
            next.paymentMethod = 'Debe seleccionar un metodo de pago';
            valid = false;
        }

        setErrors(next);
        return valid;
    };

    const handleSubmit = async () => {
        if (!validate()) return;

        const payload = {
            invoiceId: Number(record.invoiceId),
            amount: Number(record.amount),
            paymentDate: record.paymentDate,
            paymentReference: record.paymentReference.trim() || null,
            paymentMethod: record.paymentMethod,
            bankAccountId: record.bankAccountId ? Number(record.bankAccountId) : null,
            notes: record.notes.trim() || null,
        };

        try {
            setLoading(true);
            await fetchHelper.post(base_url(['api', 'v1', 'ap', 'payments', 'store']), payload, {}, 1000);

            dataTableRef?.current?.ajax.reload();
            modalInstance?.current?.hide();
            setRecord({ ...emptyRecord });
            setMessage({ type: 'success', show: true, message: 'Pago registrado exitosamente.' });
        } catch (error) {
            const backendErrors = error?.errors;
            if (Array.isArray(backendErrors) && backendErrors.length > 0) {
                const next = { ...emptyErrors };
                backendErrors.forEach((item) => {
                    if (item.field) next[item.field] = item.message;
                });
                setErrors(next);
            } else {
                setErrorMessage(error?.msg || 'Error al registrar el pago.');
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
        <div className="modal fade" ref={modalRef} id="modalCreateApPayment" tabIndex={-1} aria-hidden="true">
            <div className="modal-dialog modal-lg modal-dialog-centered" role="document">
                <div className="modal-content">
                    <div className="modal-header">
                        <h4 className="modal-title">Registrar Pago</h4>
                        <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close" />
                    </div>

                    <div className="modal-body" key={`form-${formKey}`}>
                        <AlertPage
                            message={errorMessage}
                            type="danger"
                            show={errorMessage !== ''}
                            onChange={() => setErrorMessage('')}
                        />

                        <div className="row">
                            <div className="col-md-6 mb-4 mt-2">
                                <InputSelectModal
                                    id="ap_payment_invoice"
                                    label="Factura"
                                    value={String(record.invoiceId || '')}
                                    onChange={(value) => setRecord((prev) => ({ ...prev, invoiceId: value }))}
                                    error={errors.invoiceId}
                                    placeholder="Seleccione factura"
                                    options={invoices}
                                    required
                                />
                            </div>
                            <div className="col-md-6 mb-4 mt-2">
                                <InputModal
                                    type="number"
                                    id="ap_payment_amount"
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
                            <div className="col-md-6 mb-4 mt-2">
                                <InputDate
                                    id="ap_payment_date"
                                    label="Fecha de Pago"
                                    date={record.paymentDate}
                                    onChange={(date) => setRecord((prev) => ({ ...prev, paymentDate: date || '' }))}
                                    error={errors.paymentDate}
                                    placeholder="yyyy-mm-dd"
                                    dateFormat="Y-m-d"
                                    required
                                />
                            </div>
                            <div className="col-md-6 mb-4 mt-2">
                                <InputModal
                                    type="text"
                                    id="ap_payment_reference"
                                    label="Referencia de Pago"
                                    value={record.paymentReference}
                                    onChange={(e) => setRecord((prev) => ({ ...prev, paymentReference: e.target.value }))}
                                    error={errors.paymentReference}
                                    placeholder="Numero de referencia"
                                />
                            </div>
                        </div>

                        <div className="row">
                            <div className="col-md-6 mb-4 mt-2">
                                <InputSelectModal
                                    id="ap_payment_method"
                                    label="Metodo de Pago"
                                    value={record.paymentMethod}
                                    onChange={(value) => setRecord((prev) => ({ ...prev, paymentMethod: value }))}
                                    error={errors.paymentMethod}
                                    placeholder="Seleccione metodo"
                                    options={PAYMENT_METHODS}
                                    required
                                />
                            </div>
                            <div className="col-md-6 mb-4 mt-2">
                                <InputSelectModal
                                    id="ap_payment_bank_account"
                                    label="Cuenta Bancaria / Caja"
                                    value={String(record.bankAccountId || '')}
                                    onChange={(value) => setRecord((prev) => ({ ...prev, bankAccountId: value }))}
                                    error={errors.bankAccountId}
                                    placeholder="Seleccione cuenta"
                                    options={bankAccounts}
                                />
                            </div>
                        </div>

                        <div className="row">
                            <div className="col-12 mb-4 mt-2">
                                <InputModal
                                    type="text"
                                    id="ap_payment_notes"
                                    label="Notas"
                                    value={record.notes}
                                    onChange={(e) => setRecord((prev) => ({ ...prev, notes: e.target.value }))}
                                    error={errors.notes}
                                    placeholder="Observaciones opcionales"
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

export default CreateApPayment;
