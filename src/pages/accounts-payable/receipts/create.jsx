import { useEffect, useState } from 'react';

import InputSelectModal from '../../../components/molecules/inputSelectModal';
import AlertPage from '../../../components/molecules/AlertPage';
import InputDate from '../../../components/molecules/InputDate';
import InputModal from '../../../components/molecules/InputModal';

import { base_url } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';

/**
 * Modal para registrar una Recepcion de Bienes asociada a una Orden de Compra.
 * Envia POST a /api/v1/ap/receipts/store.
 *
 * Flujo:
 *   1. Usuario selecciona OC (solo APPROVED).
 *   2. Se cargan lineas de la OC via GET /api/v1/ap/purchase-orders/{id}.
 *   3. Usuario ingresa quantityReceived por linea (default 0, max = quantity ordenada).
 *   4. Al enviar, solo se incluyen lineas con quantityReceived > 0.
 *
 * DTO backend esperado:
 *   - purchaseOrderId (Long)
 *   - receiptDate (LocalDate)
 *   - notes (String, opcional)
 *   - lines: [{ purchaseOrderLineId, quantityReceived }]  (NotEmpty, min 1)
 */

const emptyErrors = {
    purchaseOrderId: '',
    receiptDate: '',
    notes: '',
};

const emptyRecord = {
    purchaseOrderId: '',
    receiptDate: '',
    notes: '',
};

/** Formatea numero con separadores de miles. */
const fmt = (n) => Number(n || 0).toLocaleString('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
});

const CreateApReceipt = ({ modalRef, modalInstance, dataTableRef, setMessage }) => {
    const [record, setRecord] = useState({ ...emptyRecord });
    const [errors, setErrors] = useState({ ...emptyErrors });
    const [errorMessage, setErrorMessage] = useState('');
    const [loading, setLoading] = useState(false);

    const [purchaseOrders, setPurchaseOrders] = useState([]);
    /** Lineas de la OC seleccionada con quantityReceived editable. */
    const [orderLines, setOrderLines] = useState([]);
    const [loadingLines, setLoadingLines] = useState(false);

    useEffect(() => {
        loadPurchaseOrders();
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
            setOrderLines([]);
            setLoadingLines(false);
            setFormKey((k) => k + 1);
        };
        el.addEventListener('hidden.bs.modal', handler);
        return () => el.removeEventListener('hidden.bs.modal', handler);
    }, [modalRef]);

    /** Carga solo OCs APROBADAS. Usa DataTable con filtro por status si es posible. */
    const loadPurchaseOrders = async () => {
        try {
            const { data } = await fetchHelper.post(
                base_url(['api', 'v1', 'ap', 'purchase-orders']),
                { length: -1, columns: [] },
                {},
                0
            );
            const list = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
            // Filtrar por estado APPROVED en cliente (el backend puede no exponer filtro directo)
            const approved = list.filter((po) => !po.status || po.status === 'APPROVED');
            setPurchaseOrders(approved.map((po) => ({
                id: po.id,
                name: `#${po.orderNumber || po.id} - ${po.thirdPartyName || ''}`.trim(),
            })));
        } catch (e) {
            // silencioso
        }
    };

    /** Al cambiar la OC, carga sus lineas desde GET /api/v1/ap/purchase-orders/{id}. */
    const onOrderChange = async (value) => {
        setRecord((prev) => ({ ...prev, purchaseOrderId: value }));
        setOrderLines([]);
        if (!value) return;

        try {
            setLoadingLines(true);
            const resp = await fetchHelper.get(
                base_url(['api', 'v1', 'ap', 'purchase-orders', value]),
                {},
                0
            );
            const data = resp?.data || resp;
            const lines = data?.lines || [];
            setOrderLines(lines.map((l) => ({
                purchaseOrderLineId: l.id,
                description: l.description,
                quantityOrdered: Number(l.quantity || 0),
                // El backend puede no exponer quantityAlreadyReceived; mostramos "-" en ese caso.
                quantityAlreadyReceived: l.quantityReceived != null ? Number(l.quantityReceived) : null,
                quantityReceived: '0',
            })));
        } catch (e) {
            setErrorMessage('Error al cargar lineas de la orden de compra.');
        } finally {
            setLoadingLines(false);
        }
    };

    /** Actualiza la cantidad recibida de una linea por indice. */
    const updateLineQty = (idx, value) => {
        setOrderLines((prev) => prev.map((l, i) => {
            if (i !== idx) return l;
            let num = Number(value);
            if (isNaN(num) || num < 0) num = 0;
            // HU-AP-19 MT-#01 (2026-04-28): mostrar mensaje claro al usuario
            // cuando intenta exceder. Antes el input lo bloqueaba silenciosamente.
            if (num > l.quantityOrdered) {
                num = l.quantityOrdered;
                setErrorMessage(
                    `La cantidad recibida supera la cantidad pedida (max: ${l.quantityOrdered}).`);
            }
            return { ...l, quantityReceived: String(num) };
        }));
    };

    /** Verifica que al menos una linea tenga quantityReceived > 0. */
    const hasAnyReceived = orderLines.some((l) => Number(l.quantityReceived) > 0);

    /** Validacion de campos obligatorios de la cabecera. */
    const validate = () => {
        const next = { ...emptyErrors };
        let valid = true;

        if (!record.purchaseOrderId) {
            next.purchaseOrderId = 'Debe seleccionar una orden de compra';
            valid = false;
        }
        if (!record.receiptDate) {
            next.receiptDate = 'La fecha de recepcion es obligatoria';
            valid = false;
        }
        if (!hasAnyReceived) {
            setErrorMessage('Debe ingresar cantidad recibida > 0 en al menos una linea.');
            valid = false;
        }

        setErrors(next);
        return valid;
    };

    /** Envia la recepcion al backend. */
    const handleSubmit = async () => {
        setErrorMessage('');
        if (!validate()) return;

        // Solo lineas con quantityReceived > 0
        const cleanLines = orderLines
            .filter((l) => Number(l.quantityReceived) > 0)
            .map((l) => ({
                purchaseOrderLineId: l.purchaseOrderLineId,
                quantityReceived: Number(l.quantityReceived),
            }));

        const payload = {
            purchaseOrderId: Number(record.purchaseOrderId),
            receiptDate: record.receiptDate,
            notes: record.notes.trim() || null,
            lines: cleanLines,
        };

        try {
            setLoading(true);
            await fetchHelper.post(base_url(['api', 'v1', 'ap', 'receipts', 'store']), payload, {}, 1000);

            dataTableRef?.current?.ajax.reload();
            modalInstance?.current?.hide();
            setRecord({ ...emptyRecord });
            setOrderLines([]);
            setMessage({ type: 'success', show: true, message: 'Recepcion registrada exitosamente.' });
        } catch (error) {
            const backendErrors = error?.errors;
            if (Array.isArray(backendErrors) && backendErrors.length > 0) {
                const next = { ...emptyErrors };
                backendErrors.forEach((item) => {
                    if (item.field) next[item.field] = item.message;
                });
                setErrors(next);
            } else {
                setErrorMessage(error?.msg || error?.message || 'Error al registrar la recepcion.');
            }
        } finally {
            setLoading(false);
        }
    };

    /** Limpia el formulario. */
    const handleClear = () => {
        setRecord({ ...emptyRecord });
        setOrderLines([]);
        setErrors({ ...emptyErrors });
        setErrorMessage('');
    };

    const canSubmit = !loading && record.purchaseOrderId && record.receiptDate && hasAnyReceived;

    return (
        <div className="modal fade" ref={modalRef} id="modalCreateApReceipt" tabIndex={-1} aria-hidden="true">
            <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable" role="document">
                <div className="modal-content">
                    <div className="modal-header">
                        <h4 className="modal-title">
                            <i className="ri-truck-line me-2" />Registrar Recepcion de Bienes
                        </h4>
                        <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close" />
                    </div>

                    <div className="modal-body" key={`form-${formKey}`}>
                        <AlertPage
                            message={errorMessage}
                            type="danger"
                            show={errorMessage !== ''}
                            onChange={() => setErrorMessage('')}
                        />

                        {/* Cabecera */}
                        <div className="row">
                            <div className="col-md-8 mb-3 mt-2">
                                <InputSelectModal
                                    id="ap_receipt_po"
                                    label="Orden de Compra (APROBADAS)"
                                    value={String(record.purchaseOrderId || '')}
                                    onChange={(value) => onOrderChange(value)}
                                    error={errors.purchaseOrderId}
                                    placeholder="Seleccione orden de compra"
                                    options={purchaseOrders}
                                    required
                                />
                            </div>
                            <div className="col-md-4 mb-3 mt-2">
                                <InputDate
                                    id="ap_receipt_date"
                                    label="Fecha de Recepcion"
                                    date={record.receiptDate}
                                    onChange={(date) => setRecord((prev) => ({ ...prev, receiptDate: date || '' }))}
                                    error={errors.receiptDate}
                                    placeholder="yyyy-mm-dd"
                                    dateFormat="Y-m-d"
                                    required
                                />
                            </div>
                        </div>

                        <div className="row">
                            <div className="col-12 mb-3 mt-2">
                                <InputModal
                                    type="text"
                                    id="ap_receipt_notes"
                                    label="Notas"
                                    value={record.notes}
                                    onChange={(e) => setRecord((prev) => ({ ...prev, notes: e.target.value }))}
                                    error={errors.notes}
                                    placeholder="Observaciones opcionales"
                                />
                            </div>
                        </div>

                        {/* Lineas de la OC */}
                        <div className="d-flex justify-content-between align-items-center mb-2">
                            <h6 className="mb-0">
                                <i className="ri-list-check me-1" />Lineas de la orden
                            </h6>
                            {loadingLines && <small className="text-muted">Cargando lineas...</small>}
                        </div>

                        <div className="table-responsive">
                            <table className="table table-sm align-middle">
                                <thead className="table-light">
                                    <tr>
                                        <th style={{ minWidth: 260 }}>Descripcion</th>
                                        <th style={{ minWidth: 110 }} className="text-end">Cant. Ordenada</th>
                                        <th style={{ minWidth: 110 }} className="text-end">Ya Recibida</th>
                                        <th style={{ minWidth: 140 }} className="text-end">Cant. a Recibir *</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {orderLines.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="text-center text-muted py-3">
                                                Seleccione una orden de compra para cargar sus lineas.
                                            </td>
                                        </tr>
                                    )}
                                    {orderLines.map((l, idx) => (
                                        <tr key={l.purchaseOrderLineId}>
                                            <td>{l.description}</td>
                                            <td className="text-end">{fmt(l.quantityOrdered)}</td>
                                            <td className="text-end">
                                                {l.quantityAlreadyReceived != null
                                                    ? fmt(l.quantityAlreadyReceived)
                                                    : '-'}
                                            </td>
                                            <td>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max={l.quantityOrdered}
                                                    step="0.01"
                                                    className="form-control form-control-sm text-end"
                                                    value={l.quantityReceived}
                                                    onChange={(e) => updateLineQty(idx, e.target.value)}
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="modal-footer">
                        <button type="button" className="btn btn-primary ms-auto" onClick={handleSubmit} disabled={!canSubmit}>
                            {loading ? 'Guardando...' : 'Registrar'}
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

export default CreateApReceipt;
