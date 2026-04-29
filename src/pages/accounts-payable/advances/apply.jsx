import { useEffect, useState } from 'react';

import InputModal from '../../../components/molecules/InputModal';
import InputSelectModal from '../../../components/molecules/inputSelectModal';
import AlertPage from '../../../components/molecules/AlertPage';

import { base_url } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';

/**
 * QA-BLOQUE-AO (2026-04-29): modal nuevo. Antes el listado de Anticipos a
 * Proveedores tenia el boton "Aplicar a Factura" pero NO existia el modal,
 * solo un handler que abria modalApply (undefined) -> nada visible. Ademas el
 * filter de status pedia AVAILABLE/PARTIALLY_APPLIED pero el backend usa
 * PENDING/APPLIED, asi que el boton siempre estaba disabled. Este modal
 * replica el de AR (cobros/anticipos) y envia POST /api/v1/ap/advances/{id}/apply
 * con { invoiceId, amount }.
 */

const formatCurrency = (val) => {
    if (val === null || val === undefined) return '$0.00';
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 2,
    }).format(Number(val));
};

const ApplyApAdvance = ({ modalRef, modalInstance, dataTableRef, advance, setMessage }) => {
    const [invoiceId, setInvoiceId] = useState('');
    const [amount, setAmount] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [errors, setErrors] = useState({ invoiceId: '', amount: '' });
    const [loading, setLoading] = useState(false);
    const [invoices, setInvoices] = useState([]);

    /** Carga facturas de compra pendientes del proveedor del anticipo. */
    const loadInvoices = async (thirdPartyId) => {
        try {
            const res = await fetchHelper.post(
                base_url(['api', 'v1', 'invoices', 'search']),
                { length: -1, columns: [], thirdPartyId },
                {},
                0
            );
            const list = Array.isArray(res?.data) ? res.data : (res?.data?.data || []);
            // Filtrar facturas de compra (FC) del proveedor con saldo pendiente.
            const pending = list.filter((inv) =>
                ['PENDING', 'PARTIALLY_PAID', 'OVERDUE'].includes(inv.status)
                && (!thirdPartyId || inv.thirdPartyId === thirdPartyId)
                && (inv.typeInvoiceCode === 'FC' || !inv.typeInvoiceCode) // tolerante si el campo no viene
            );
            setInvoices(pending.map((inv) => ({
                id: inv.id,
                name: `${inv.supplierInvoiceNumber || inv.resolutionInvoice || ('#' + inv.id)} - Saldo ${formatCurrency(inv.balanceDue)}`,
            })));
        } catch (e) {
            console.log('Error cargando facturas de compra:', e);
        }
    };

    useEffect(() => {
        if (advance?.thirdPartyId) loadInvoices(advance.thirdPartyId);
    }, [advance]);

    useEffect(() => {
        setErrors({ invoiceId: '', amount: '' });
        setErrorMessage('');
    }, [invoiceId, amount]);

    const handleSubmit = async () => {
        const nextErrors = { invoiceId: '', amount: '' };
        let valid = true;
        if (!invoiceId) { nextErrors.invoiceId = 'Debe seleccionar una factura'; valid = false; }
        if (!amount || Number(amount) <= 0) { nextErrors.amount = 'El monto debe ser mayor a cero'; valid = false; }
        if (advance?.amount !== undefined && Number(amount) > Number(advance.amount)) {
            nextErrors.amount = `Excede el monto del anticipo (${formatCurrency(advance.amount)})`;
            valid = false;
        }
        setErrors(nextErrors);
        if (!valid) return;

        try {
            setLoading(true);
            await fetchHelper.post(
                base_url(['api', 'v1', 'ap', 'advances', advance.id, 'apply']),
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
        <div className="modal fade" ref={modalRef} id="modalApplyApAdvance" tabIndex={-1} aria-hidden="true">
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
                                <strong>Proveedor:</strong> {advance.thirdPartyName || '-'}<br />
                                <strong>Monto del anticipo:</strong> {formatCurrency(advance.amount)}<br />
                                <strong>Estado:</strong> {advance.status || '-'}
                            </div>
                        )}

                        <div className="row">
                            <div className="col-12 mb-4 mt-2">
                                <InputSelectModal
                                    id="ap_apply_invoice"
                                    label="Factura de Compra"
                                    value={String(invoiceId)}
                                    onChange={(value) => setInvoiceId(value)}
                                    error={errors.invoiceId}
                                    placeholder="Seleccione factura pendiente"
                                    options={invoices}
                                    emptyMessage="No hay facturas de compra pendientes para este proveedor"
                                    required
                                />
                            </div>
                            <div className="col-12 mb-4 mt-2">
                                <InputModal
                                    type="number"
                                    id="ap_apply_amount"
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

export default ApplyApAdvance;
