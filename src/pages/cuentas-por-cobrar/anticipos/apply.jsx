import { useEffect, useState } from 'react';

import InputModal from '../../../components/molecules/InputModal';
import InputSelectModal from '../../../components/molecules/inputSelectModal';
import AlertPage from '../../../components/molecules/AlertPage';

import { base_url } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';

/**
 * Modal para aplicar un anticipo de cliente a una factura de venta.
 * Envia POST a /api/v1/ar/advances/{id}/apply.
 */

const formatCurrency = (val) => {
    if (val === null || val === undefined) return '$0.00';
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 2,
    }).format(Number(val));
};

const ApplyArAdvance = ({ modalRef, modalInstance, dataTableRef, advance, setMessage }) => {
    const [invoiceId, setInvoiceId] = useState('');
    const [amount, setAmount] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [errors, setErrors] = useState({ invoiceId: '', amount: '' });
    const [loading, setLoading] = useState(false);
    const [invoices, setInvoices] = useState([]);

    useEffect(() => {
        if (advance?.thirdPartyId) loadInvoices(advance.thirdPartyId);
    }, [advance]);

    /** Carga facturas pendientes del cliente del anticipo. */
    const loadInvoices = async (thirdPartyId) => {
        try {
            const { data } = await fetchHelper.post(
                base_url(['api', 'v1', 'sales-invoices', 'search']),
                { length: -1, columns: [], thirdPartyId },
                {},
                0
            );
            const list = Array.isArray(data) ? data : data?.data || [];
            const pending = list.filter((inv) =>
                ['ISSUED', 'PARTIALLY_PAID'].includes(inv.status)
                && (!thirdPartyId || inv.thirdPartyId === thirdPartyId)
            );
            setInvoices(pending.map((inv) => ({
                id: inv.id,
                name: `${inv.invoiceNumber || ('#' + inv.id)} - Saldo ${formatCurrency(inv.balanceDue)}`,
            })));
        } catch (e) {
            console.log('Error cargando facturas:', e);
        }
    };

    useEffect(() => {
        setErrors({ invoiceId: '', amount: '' });
        setErrorMessage('');
    }, [invoiceId, amount]);

    const handleSubmit = async () => {
        const nextErrors = { invoiceId: '', amount: '' };
        let valid = true;
        if (!invoiceId) { nextErrors.invoiceId = 'Debe seleccionar una factura'; valid = false; }
        if (!amount || Number(amount) <= 0) { nextErrors.amount = 'El monto debe ser mayor a cero'; valid = false; }
        if (advance?.availableAmount !== undefined && Number(amount) > Number(advance.availableAmount)) {
            nextErrors.amount = `Excede el saldo disponible (${formatCurrency(advance.availableAmount)})`;
            valid = false;
        }
        setErrors(nextErrors);
        if (!valid) return;

        try {
            setLoading(true);
            await fetchHelper.post(
                base_url(['api', 'v1', 'ar', 'advances', advance.id, 'apply']),
                { invoiceId: Number(invoiceId), amount: Number(amount) },
                {},
                1000
            );
            dataTableRef?.current?.ajax.reload();
            modalInstance?.current?.hide();
            setInvoiceId('');
            setAmount('');
            setMessage({ type: 'success', show: true, message: 'Anticipo aplicado exitosamente.' });
        } catch (error) {
            setErrorMessage(error?.msg || 'Error al aplicar el anticipo.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal fade" ref={modalRef} id="modalApplyArAdvance" tabIndex={-1} aria-hidden="true">
            <div className="modal-dialog modal-md modal-dialog-centered" role="document">
                <div className="modal-content">
                    <div className="modal-header">
                        <h4 className="modal-title">Aplicar Anticipo a Factura</h4>
                        <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close" />
                    </div>

                    <div className="modal-body">
                        <AlertPage
                            message={errorMessage}
                            type="danger"
                            show={errorMessage !== ''}
                            onChange={() => setErrorMessage('')}
                        />

                        {advance && (
                            <div className="alert alert-info">
                                <strong>Cliente:</strong> {advance.thirdPartyName || '-'}<br />
                                <strong>Monto:</strong> {formatCurrency(advance.amount)}<br />
                                <strong>Disponible:</strong> {formatCurrency(advance.availableAmount)}
                            </div>
                        )}

                        <div className="row">
                            <div className="col-12 mb-4 mt-2">
                                <InputSelectModal
                                    id="ar_apply_invoice"
                                    label="Factura de Venta"
                                    value={String(invoiceId)}
                                    onChange={(value) => setInvoiceId(value)}
                                    error={errors.invoiceId}
                                    placeholder="Seleccione factura pendiente"
                                    options={invoices}
                                    required
                                />
                            </div>
                            <div className="col-12 mb-4 mt-2">
                                <InputModal
                                    type="number"
                                    id="ar_apply_amount"
                                    label="Monto a Aplicar"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    error={errors.amount}
                                    placeholder="0.00"
                                    min={0}
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    <div className="modal-footer">
                        <button type="button" className="btn btn-primary ms-auto" onClick={handleSubmit} disabled={loading}>
                            {loading ? 'Aplicando...' : 'Aplicar'}
                        </button>
                        <button type="button" className="btn btn-outline-secondary" data-bs-dismiss="modal" disabled={loading}>
                            Cancelar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ApplyArAdvance;
