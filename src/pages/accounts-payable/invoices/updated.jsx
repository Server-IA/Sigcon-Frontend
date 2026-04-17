import { useEffect, useState } from 'react';

import InputModal from '../../../components/molecules/InputModal';
import InputSelectModal from '../../../components/molecules/inputSelectModal';

import { base_url } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';

/**
 * Modal para editar una Factura de Compra (FC).
 * PUT a /api/v1/invoices/{id}.
 *
 * Segun el backend, solo son editables: supplierInvoiceNumber, notes,
 * paymentFormId, invoiceDate, invoiceDueDay y resolutionInvoice.
 * Las lineas, proveedor y totales no se pueden modificar (una vez generado
 * el asiento contable no deben alterarse).
 */
const UpdatedApInvoice = ({ modalRef, modalInstance, dataTableRef, setMessage, selected }) => {
    const [form, setForm] = useState({
        supplierInvoiceNumber: '',
        resolutionInvoice: '',
        invoiceDate: '',
        invoiceDueDay: '',
        paymentFormId: '',
        notes: '',
    });
    const [paymentForms, setPaymentForms] = useState([]);
    const [errorMessage, setErrorMessage] = useState('');
    const [loading, setLoading] = useState(false);

    /** Carga el catalogo de formas de pago. */
    useEffect(() => {
        (async () => {
            try {
                const resp = await fetchHelper.post(
                    base_url(['api', 'v1', 'resources', 'payment-forms']),
                    { start: 0, length: -1, draw: 1 }, {}, 0, true
                );
                const data = resp?.data || resp;
                const list = data?.data || data || [];
                if (Array.isArray(list)) {
                    setPaymentForms(list.map((pf) => ({ id: pf.id, name: pf.name })));
                }
            } catch (e) { /* noop */ }
        })();
    }, []);

    /** Precarga los valores cuando cambia la factura seleccionada. */
    useEffect(() => {
        if (!selected) return;
        setForm({
            supplierInvoiceNumber: selected.supplierInvoiceNumber || '',
            resolutionInvoice:     selected.resolutionInvoice || '',
            invoiceDate:           selected.invoiceDate || '',
            invoiceDueDay:         selected.invoiceDueDay != null ? String(selected.invoiceDueDay) : '',
            paymentFormId:         selected.paymentFormId != null ? String(selected.paymentFormId) : '',
            notes:                 selected.notes || '',
        });
        setErrorMessage('');
    }, [selected]);

    const setField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMessage('');

        if (!selected?.id) {
            setErrorMessage('No se identifico la factura a actualizar.');
            return;
        }

        const payload = {
            supplierInvoiceNumber: form.supplierInvoiceNumber?.trim() || null,
            resolutionInvoice:     form.resolutionInvoice?.trim() || null,
            invoiceDate:           form.invoiceDate || null,
            invoiceDueDay:         form.invoiceDueDay !== '' ? Number(form.invoiceDueDay) : null,
            paymentFormId:         form.paymentFormId ? Number(form.paymentFormId) : null,
            notes:                 form.notes?.trim() || null,
            // Campos obligatorios del DTO pero inmutables (se envian con valor actual)
            thirdPartyId:          selected.thirdPartyId,
            lineInvoices:          [],
        };

        setLoading(true);
        try {
            await fetchHelper.put(
                base_url(['api', 'v1', 'invoices', selected.id]),
                payload, {}, 1000, true
            );
            setMessage({ type: 'success', show: true, message: 'Factura actualizada correctamente.' });
            dataTableRef?.current?.ajax.reload();
            modalInstance?.current?.hide();
        } catch (err) {
            setErrorMessage(err?.msg || err?.message || 'Error al actualizar la factura.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal fade" tabIndex="-1" ref={modalRef}>
            <div className="modal-dialog modal-lg" role="document">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">
                            <i className="ri-edit-box-line me-2" />Editar Factura de Compra
                        </h5>
                        <button type="button" className="btn-close" data-bs-dismiss="modal" />
                    </div>
                    <form onSubmit={handleSubmit}>
                        <div className="modal-body">
                            {errorMessage && (
                                <div className="alert alert-danger py-2 mb-3">{errorMessage}</div>
                            )}

                            {/* Datos de solo lectura */}
                            <div className="alert alert-light border mb-3">
                                <div className="row small">
                                    <div className="col-md-4">
                                        <strong>Proveedor:</strong><br />
                                        {selected?.thirdPartyName || '-'}
                                    </div>
                                    <div className="col-md-4">
                                        <strong>Total factura:</strong><br />
                                        $ {Number(selected?.totalAmount || 0).toLocaleString('es-CO')}
                                    </div>
                                    <div className="col-md-4">
                                        <strong>Estado:</strong><br />
                                        <span className="badge bg-label-warning">{selected?.status || '-'}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Campos editables */}
                            <div className="row g-3">
                                <div className="col-md-6">
                                    <InputModal
                                        id="upd_supplier_number"
                                        label="# Factura Proveedor"
                                        type="text"
                                        value={form.supplierInvoiceNumber}
                                        onChange={(e) => setField('supplierInvoiceNumber', e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="col-md-6">
                                    <InputModal
                                        id="upd_resolution"
                                        label="Resolucion DIAN"
                                        type="text"
                                        value={form.resolutionInvoice}
                                        onChange={(e) => setField('resolutionInvoice', e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="col-md-4">
                                    <InputModal
                                        id="upd_invoice_date"
                                        label="Fecha Factura"
                                        type="date"
                                        value={form.invoiceDate}
                                        onChange={(e) => setField('invoiceDate', e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="col-md-4">
                                    <InputModal
                                        id="upd_due_day"
                                        label="Dia de Vencimiento"
                                        type="number"
                                        value={form.invoiceDueDay}
                                        onChange={(e) => setField('invoiceDueDay', e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="col-md-4">
                                    <InputSelectModal
                                        id="upd_payment_form"
                                        label="Forma de Pago"
                                        value={String(form.paymentFormId || '')}
                                        onChange={(value) => setField('paymentFormId', value)}
                                        options={paymentForms}
                                        placeholder="Seleccione forma de pago"
                                        required
                                    />
                                </div>
                                <div className="col-12">
                                    <InputModal
                                        id="upd_notes"
                                        label="Notas / Observaciones"
                                        type="text"
                                        value={form.notes}
                                        onChange={(e) => setField('notes', e.target.value)}
                                        maxLength={500}
                                    />
                                </div>
                            </div>

                            <small className="text-muted mt-3 d-block">
                                <i className="ri-information-line me-1" />
                                Las lineas, el proveedor y los totales no pueden modificarse una vez
                                generado el asiento contable. Si necesitas corregir montos, anula la
                                factura y crea una nueva.
                            </small>
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-label-secondary" data-bs-dismiss="modal">
                                Cancelar
                            </button>
                            <button type="submit" className="btn btn-primary" disabled={loading}>
                                {loading ? 'Guardando...' : 'Guardar cambios'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default UpdatedApInvoice;
