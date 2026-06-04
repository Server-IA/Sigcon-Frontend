import { useEffect, useState } from 'react';

import InputModal from '../../../components/molecules/InputModal';
import InputSelectModal from '../../../components/molecules/inputSelectModal';
import AlertPage from '../../../components/molecules/AlertPage';
import InputDate from '../../../components/molecules/InputDate';

import { base_url } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';
import { sanitizeDecimal } from '../../../utils/inputSanitize';

/**
 * Modal para registrar un nuevo Cobro sobre una factura de venta.
 * Envia POST a /api/v1/ar/payments.
 * Cubre HUs AR-02 y AR-08.
 */

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
    bankMovementId: '',
    notes: '',
};

const emptyRecord = {
    invoiceId: '',
    amount: '',
    paymentDate: '',
    paymentReference: '',
    paymentMethod: '',
    bankAccountId: '',
    bankMovementId: '',
    notes: '',
};

const CreateArPayment = ({ modalRef, modalInstance, dataTableRef, setMessage, preselectedInvoiceId }) => {
    const [record, setRecord] = useState({ ...emptyRecord });
    const [errors, setErrors] = useState({ ...emptyErrors });
    const [errorMessage, setErrorMessage] = useState('');
    const [loading, setLoading] = useState(false);

    const [invoices, setInvoices] = useState([]);
    const [bankAccounts, setBankAccounts] = useState([]);

    useEffect(() => {
        loadInvoices();
        loadBankAccounts();
    }, []);

    // HU-AR-08 (2026-04-27): si llega preseleccionada desde el listado de FV
    // (query param), prellenar el invoiceId al cargar el modal.
    useEffect(() => {
        if (preselectedInvoiceId && !record.invoiceId) {
            setRecord(prev => ({ ...prev, invoiceId: String(preselectedInvoiceId) }));
        }
    }, [preselectedInvoiceId]);

    /** Carga facturas de venta con saldo pendiente. */
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

    /** Carga cuentas bancarias. */
    const loadBankAccounts = async () => {
        try {
            const { data } = await fetchHelper.post(
                base_url(['api', 'v1', 'bank-accounts', 'search']),
                { length: -1, columns: [] },
                {},
                0
            );
            const list = Array.isArray(data) ? data : data?.data || [];
            setBankAccounts(list.map((ba) => ({
                id: ba.id,
                name: `${ba.accountName || ''} - ${ba.accountNumber || ''}`.trim(),
            })));
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
            next.paymentDate = 'La fecha del cobro es obligatoria';
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
            bankMovementId: record.bankMovementId ? Number(record.bankMovementId) : null,
            notes: record.notes.trim() || null,
        };

        try {
            setLoading(true);
            await fetchHelper.post(base_url(['api', 'v1', 'ar', 'payments']), payload, {}, 1000);

            dataTableRef?.current?.ajax.reload();
            modalInstance?.current?.hide();
            setRecord({ ...emptyRecord });
            setMessage({ type: 'success', show: true, message: 'Cobro registrado exitosamente.' });
        } catch (error) {
            const backendErrors = error?.errors;
            if (Array.isArray(backendErrors) && backendErrors.length > 0) {
                const next = { ...emptyErrors };
                backendErrors.forEach((item) => {
                    if (item.field) next[item.field] = item.message;
                });
                setErrors(next);
            } else {
                setErrorMessage(error?.msg || 'Error al registrar el cobro.');
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
        <div className="modal fade" ref={modalRef} id="modalCreateArPayment" tabIndex={-1} aria-hidden="true">
            <div className="modal-dialog modal-lg modal-dialog-centered" role="document">
                <div className="modal-content">
                    <div className="modal-header">
                        <h4 className="modal-title">Registrar Cobro</h4>
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
                                    id="ar_payment_invoice"
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
                                {/* QA CXC Bug 2 (2026-06-03 / IEEE AR-RF-02): el monto solo admite
                                    numeros. type="text" + inputMode="decimal" + sanitizeDecimal evita
                                    que se vean letras en cualquier navegador (Firefox las mostraba
                                    con type="number"). */}
                                <InputModal
                                    type="text"
                                    inputMode="decimal"
                                    id="ar_payment_amount"
                                    label="Monto"
                                    value={record.amount}
                                    onChange={(e) => setRecord((prev) => ({ ...prev, amount: sanitizeDecimal(e.target.value) }))}
                                    error={errors.amount}
                                    placeholder="0.00"
                                    required
                                />
                            </div>
                        </div>

                        <div className="row">
                            <div className="col-md-6 mb-4 mt-2">
                                <InputDate
                                    id="ar_payment_date"
                                    label="Fecha del Cobro"
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
                                    id="ar_payment_reference"
                                    label="Referencia"
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
                                    id="ar_payment_method"
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
                                    id="ar_payment_bank_account"
                                    label="Cuenta Bancaria"
                                    value={String(record.bankAccountId || '')}
                                    onChange={(value) => setRecord((prev) => ({ ...prev, bankAccountId: value }))}
                                    error={errors.bankAccountId}
                                    placeholder="Seleccione cuenta"
                                    options={bankAccounts}
                                />
                            </div>
                        </div>

                        <div className="row">
                            <div className="col-md-6 mb-4 mt-2">
                                <InputModal
                                    type="number"
                                    id="ar_payment_bank_movement"
                                    label="ID Movimiento Bancario"
                                    value={record.bankMovementId}
                                    onChange={(e) => setRecord((prev) => ({ ...prev, bankMovementId: e.target.value }))}
                                    error={errors.bankMovementId}
                                    placeholder="Id del movimiento origen"
                                />
                            </div>
                            <div className="col-md-6 mb-4 mt-2">
                                {/* QA CXC Bug 2 (2026-06-03 / IEEE AR-RF-02): notas opcionales, max 500. */}
                                <InputModal
                                    type="text"
                                    id="ar_payment_notes"
                                    label="Notas (opcional)"
                                    value={record.notes}
                                    maxLength={500}
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

export default CreateArPayment;
