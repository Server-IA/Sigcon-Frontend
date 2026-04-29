import { useEffect, useState } from 'react';

import InputSelectModal from '../../../components/molecules/inputSelectModal';
import AlertPage from '../../../components/molecules/AlertPage';
import InputDate from '../../../components/molecules/InputDate';
import InputModal from '../../../components/molecules/InputModal';

import { base_url } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';

/**
 * Modal para editar una Orden de Compra existente en estado DRAFT.
 * Envia PUT a /api/v1/ap/purchase-orders/{id}.
 *
 * HU-AP-17 (2026-04-28): solo se permite editar ordenes en estado borrador.
 * El backend (PurchaseOrderService.updateOrder) valida el estado y rechaza
 * cualquier orden distinta de DRAFT con HTTP 400.
 */

const emptyLine = () => ({
    description: '',
    quantity: '1',
    unitPrice: '0',
});

const emptyRecord = {
    thirdPartyId: '',
    orderDate: '',
    deliveryDate: '',
    notes: '',
};

const emptyErrors = {
    thirdPartyId: '',
    orderDate: '',
    deliveryDate: '',
    notes: '',
};

const fmt = (n) => Number(n || 0).toLocaleString('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
});

const UpdateApPurchaseOrder = ({ modalRef, modalInstance, dataTableRef, setMessage, orderId }) => {
    const [record, setRecord] = useState({ ...emptyRecord });
    const [lines, setLines] = useState([emptyLine()]);
    const [errors, setErrors] = useState({ ...emptyErrors });
    const [errorMessage, setErrorMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [loadingOrder, setLoadingOrder] = useState(false);

    const [suppliers, setSuppliers] = useState([]);

    useEffect(() => {
        loadSuppliers();
    }, []);

    /** Cuando cambia orderId (al abrir el modal con una OC seleccionada), carga sus datos. */
    useEffect(() => {
        if (orderId) {
            loadOrder(orderId);
        } else {
            setRecord({ ...emptyRecord });
            setLines([emptyLine()]);
            setErrors({ ...emptyErrors });
            setErrorMessage('');
        }
    }, [orderId]);

    const loadSuppliers = async () => {
        try {
            const resp = await fetchHelper.post(
                base_url(['api', 'v1', 'third-parties', 'search']),
                { length: -1, columns: [] }, {}, 0
            );
            const list = resp?.data ?? resp;
            if (Array.isArray(list)) {
                setSuppliers(list.map((t) => ({
                    id: t.id,
                    name: `${t.nit || t.documentNumber || ''} - ${t.businessName || t.firstName || ''}`.trim(),
                })));
            }
        } catch (e) { /* noop */ }
    };

    /** Carga la OC desde GET /api/v1/ap/purchase-orders/{id} y prefilla el form. */
    const loadOrder = async (id) => {
        try {
            setLoadingOrder(true);
            const resp = await fetchHelper.get(
                base_url(['api', 'v1', 'ap', 'purchase-orders', id]), {}, 0
            );
            const order = resp?.data ?? resp;
            if (!order) return;

            setRecord({
                thirdPartyId: String(order.thirdPartyId || ''),
                orderDate: order.orderDate || '',
                deliveryDate: order.deliveryDate || '',
                notes: order.notes || '',
            });
            const ls = (order.lines || []).map((l) => ({
                description: l.description || '',
                quantity: String(l.quantity || '0'),
                unitPrice: String(l.unitPrice || '0'),
            }));
            setLines(ls.length > 0 ? ls : [emptyLine()]);
        } catch (error) {
            setErrorMessage(error?.msg || 'Error al cargar la orden de compra.');
        } finally {
            setLoadingOrder(false);
        }
    };

    const setField = (field, value) => setRecord((prev) => ({ ...prev, [field]: value }));

    const updateLine = (idx, field, value) => {
        setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, [field]: value } : l)));
    };

    const addLine = () => setLines((prev) => [...prev, emptyLine()]);

    const removeLine = (idx) => {
        setLines((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx)));
    };

    const lineTotal = (l) => Number(l.quantity || 0) * Number(l.unitPrice || 0);
    const orderTotal = lines.reduce((s, l) => s + lineTotal(l), 0);

    const hasValidLines = lines.some(
        (l) => l.description.trim() && Number(l.quantity) > 0 && Number(l.unitPrice) > 0
    );

    const validate = () => {
        const next = { ...emptyErrors };
        let valid = true;
        if (!record.thirdPartyId) {
            next.thirdPartyId = 'Debe seleccionar un proveedor';
            valid = false;
        }
        if (!record.orderDate) {
            next.orderDate = 'La fecha de la orden es obligatoria';
            valid = false;
        }
        if (!hasValidLines) {
            setErrorMessage('Debe agregar al menos una linea con descripcion, cantidad > 0 y precio > 0.');
            valid = false;
        }
        setErrors(next);
        return valid;
    };

    const handleSubmit = async () => {
        setErrorMessage('');
        if (!validate()) return;

        const cleanLines = lines
            .filter((l) => l.description.trim() && Number(l.quantity) > 0 && Number(l.unitPrice) > 0)
            .map((l) => ({
                description: l.description.trim(),
                quantity: Number(l.quantity),
                unitPrice: Number(l.unitPrice),
            }));

        const payload = {
            thirdPartyId: Number(record.thirdPartyId),
            orderDate: record.orderDate,
            deliveryDate: record.deliveryDate || null,
            notes: record.notes.trim() || null,
            lines: cleanLines,
        };

        try {
            setLoading(true);
            await fetchHelper.put(
                base_url(['api', 'v1', 'ap', 'purchase-orders', orderId]),
                payload, {}, 1000
            );
            dataTableRef?.current?.ajax.reload();
            modalInstance?.current?.hide();
            setMessage({ type: 'success', show: true, message: 'Orden de compra actualizada exitosamente.' });
        } catch (error) {
            const backendErrors = error?.errors;
            if (Array.isArray(backendErrors) && backendErrors.length > 0) {
                const next = { ...emptyErrors };
                backendErrors.forEach((item) => {
                    if (item.field) next[item.field] = item.message;
                });
                setErrors(next);
            } else {
                setErrorMessage(error?.msg || error?.message || 'Error al actualizar la orden de compra.');
            }
        } finally {
            setLoading(false);
        }
    };

    const canSubmit = !loading && !loadingOrder && record.thirdPartyId && record.orderDate && hasValidLines;

    return (
        <div className="modal fade" ref={modalRef} id="modalUpdateApPurchaseOrder" tabIndex={-1} aria-hidden="true">
            <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable" role="document">
                <div className="modal-content">
                    <div className="modal-header">
                        <h4 className="modal-title">
                            <i className="ri-edit-line me-2" />Editar Orden de Compra
                        </h4>
                        <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close" />
                    </div>

                    <div className="modal-body">
                        <AlertPage
                            message={errorMessage}
                            type="danger"
                            show={errorMessage !== ''}
                            onChange={() => setErrorMessage('')}
                        />

                        {loadingOrder && (
                            <div className="alert alert-info py-2">Cargando orden...</div>
                        )}

                        <div className="row">
                            <div className="col-md-12 mb-3 mt-2">
                                <InputSelectModal
                                    id="ap_po_upd_third_party"
                                    label="Proveedor"
                                    value={String(record.thirdPartyId || '')}
                                    onChange={(value) => setField('thirdPartyId', value)}
                                    error={errors.thirdPartyId}
                                    placeholder="Seleccione proveedor"
                                    options={suppliers}
                                    required
                                />
                            </div>
                        </div>

                        <div className="row">
                            <div className="col-md-6 mb-3 mt-2">
                                <InputDate
                                    id="ap_po_upd_order_date"
                                    label="Fecha de la Orden"
                                    date={record.orderDate}
                                    onChange={(date) => setField('orderDate', date || '')}
                                    error={errors.orderDate}
                                    placeholder="yyyy-mm-dd"
                                    dateFormat="Y-m-d"
                                    required
                                />
                            </div>
                            <div className="col-md-6 mb-3 mt-2">
                                <InputDate
                                    id="ap_po_upd_delivery_date"
                                    label="Fecha de Entrega"
                                    date={record.deliveryDate}
                                    onChange={(date) => setField('deliveryDate', date || '')}
                                    error={errors.deliveryDate}
                                    placeholder="yyyy-mm-dd"
                                    dateFormat="Y-m-d"
                                />
                            </div>
                        </div>

                        <div className="row">
                            <div className="col-12 mb-3 mt-2">
                                <InputModal
                                    type="text"
                                    id="ap_po_upd_notes"
                                    label="Notas"
                                    value={record.notes}
                                    onChange={(e) => setField('notes', e.target.value)}
                                    error={errors.notes}
                                    placeholder="Observaciones opcionales"
                                />
                            </div>
                        </div>

                        <div className="d-flex justify-content-between align-items-center mb-2">
                            <h6 className="mb-0">
                                <i className="ri-list-check me-1" />Lineas de la orden
                            </h6>
                            <button type="button" className="btn btn-sm btn-outline-primary" onClick={addLine}>
                                <i className="ri-add-line me-1" />Agregar linea
                            </button>
                        </div>

                        <div className="table-responsive">
                            <table className="table table-sm align-middle">
                                <thead className="table-light">
                                    <tr>
                                        <th style={{ minWidth: 260 }}>Descripcion *</th>
                                        <th style={{ minWidth: 110 }} className="text-end">Cantidad *</th>
                                        <th style={{ minWidth: 140 }} className="text-end">Precio Unit. *</th>
                                        <th style={{ minWidth: 140 }} className="text-end">Total Linea</th>
                                        <th style={{ width: 50 }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {lines.map((l, idx) => (
                                        <tr key={idx}>
                                            <td>
                                                <input type="text"
                                                    className="form-control form-control-sm"
                                                    value={l.description}
                                                    onChange={(e) => updateLine(idx, 'description', e.target.value)} />
                                            </td>
                                            <td>
                                                <input type="number" min="0" step="0.01"
                                                    className="form-control form-control-sm text-end"
                                                    value={l.quantity}
                                                    onChange={(e) => updateLine(idx, 'quantity', e.target.value)} />
                                            </td>
                                            <td>
                                                <input type="number" min="0" step="0.01"
                                                    className="form-control form-control-sm text-end"
                                                    value={l.unitPrice}
                                                    onChange={(e) => updateLine(idx, 'unitPrice', e.target.value)} />
                                            </td>
                                            <td className="text-end">${fmt(lineTotal(l))}</td>
                                            <td className="text-center">
                                                <button type="button"
                                                    className="btn btn-sm btn-outline-danger"
                                                    onClick={() => removeLine(idx)}
                                                    disabled={lines.length <= 1}>
                                                    <i className="ri-delete-bin-line" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="table-light">
                                    <tr>
                                        <th colSpan={3} className="text-end">Total Orden</th>
                                        <th className="text-end">${fmt(orderTotal)}</th>
                                        <th></th>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>

                    <div className="modal-footer">
                        <button type="button" className="btn btn-primary ms-auto"
                            onClick={handleSubmit} disabled={!canSubmit}>
                            {loading ? 'Guardando...' : 'Guardar cambios'}
                        </button>
                        <button type="button" className="btn btn-outline-secondary"
                            data-bs-dismiss="modal" disabled={loading}>
                            Volver
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UpdateApPurchaseOrder;
