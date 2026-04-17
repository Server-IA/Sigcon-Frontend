import { useEffect, useState } from 'react';

import InputModal from '../../../components/molecules/InputModal';
import InputSelectModal from '../../../components/molecules/inputSelectModal';
import AlertPage from '../../../components/molecules/AlertPage';
import InputDate from '../../../components/molecules/InputDate';

import { base_url } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';

/**
 * Modal para registrar una nueva Factura de Compra (tipo FC).
 * Envia POST a /api/v1/invoices/fc.
 *
 * DTO backend InvoiceFCRequestDTO:
 *   - stateInvoiceId (opcional)
 *   - paymentFormId (@NotNull)
 *   - thirdPartyId (@NotNull)
 *   - resolutionInvoice (@NotNull, String)
 *   - invoiceDate (@NotNull)
 *   - invoiceDueDay (@NotNull, Integer)
 *   - supplierInvoiceNumber (opcional)
 *   - notes (opcional)
 *   - lineInvoices: [{ itemId, quantity, price, taxRulesIds: [{taxId, value, percentage}] }]
 */

/** Record cabecera vacio. */
const emptyRecord = {
    supplierInvoiceNumber: '',
    resolutionInvoice: '',
    paymentFormId: '',
    thirdPartyId: '',
    stateInvoiceId: '',
    invoiceDate: '',
    invoiceDueDay: '',
    notes: '',
};

/** Errores vacios por campo. */
const emptyErrors = {
    supplierInvoiceNumber: '',
    resolutionInvoice: '',
    paymentFormId: '',
    thirdPartyId: '',
    stateInvoiceId: '',
    invoiceDate: '',
    invoiceDueDay: '',
    notes: '',
};

/** Linea vacia inicial. */
const emptyLine = () => ({
    itemId: '',           // cuenta contable
    description: '',
    quantity: '1',
    price: '0',
    taxRuleIds: [],       // IDs de reglas tributarias (TAX/WITHHOLDING) aplicadas
});

/** Formatea moneda COP. */
const fmt = (n) => Number(n || 0).toLocaleString('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
});

const CreateApInvoice = ({ modalRef, modalInstance, dataTableRef, setMessage }) => {
    const [record, setRecord] = useState({ ...emptyRecord });
    const [lines, setLines] = useState([emptyLine()]);
    const [errors, setErrors] = useState({ ...emptyErrors });
    const [errorMessage, setErrorMessage] = useState('');
    const [loading, setLoading] = useState(false);

    /** Catalogos. */
    const [suppliers, setSuppliers] = useState([]);
    const [paymentForms, setPaymentForms] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [taxRules, setTaxRules] = useState([]); // {id, name, type, percentage}

    useEffect(() => {
        loadSuppliers();
        loadPaymentForms();
        loadAccounts();
        loadTaxRules();
    }, []);

    /** Proveedores desde terceros. */
    const loadSuppliers = async () => {
        try {
            const { data } = await fetchHelper.post(
                base_url(['api', 'v1', 'third-parties', 'search']),
                { length: -1, columns: [] }, {}, 0
            );
            if (Array.isArray(data)) {
                setSuppliers(data.map((t) => ({
                    id: t.id,
                    name: `${t.documentNumber || ''} - ${t.businessName || t.firstName || ''}`.trim(),
                })));
            }
        } catch (e) { /* silencioso */ }
    };

    /** Formas de pago. */
    const loadPaymentForms = async () => {
        try {
            const resp = await fetchHelper.post(
                base_url(['api', 'v1', 'resources', 'payment-forms']),
                { start: 0, length: -1, draw: 1 }, {}, 1000, true
            );
            const data = resp?.data || resp;
            const list = (data?.data || data || []);
            if (Array.isArray(list)) {
                setPaymentForms(list.map((pf) => ({ id: pf.id, name: pf.name || pf.description })));
            }
        } catch (e) { /* silencioso */ }
    };

    /** Cuentas contables (items de linea). */
    const loadAccounts = async () => {
        try {
            const resp = await fetchHelper.post(
                base_url(['api', 'v1', 'accounting-accounts']),
                { start: 0, length: -1, draw: 1 }, {}, 1000, true
            );
            const data = resp?.data || resp;
            const list = (data?.data || data || []).map((a) => {
                const pucCode = a.pucAccount?.code || a.pucCode || a.code || '';
                const label   = a.customName || a.pucAccount?.name || a.name || 'Sin nombre';
                return {
                    id: a.id,
                    name: pucCode ? `${label} (${pucCode})` : label,
                };
            });
            setAccounts(list);
        } catch (e) {
            setAccounts([]);
        }
    };

    /** Reglas tributarias (IVA/Retencion). */
    const loadTaxRules = async () => {
        try {
            const resp = await fetchHelper.post(
                base_url(['api', 'v1', 'ruler-tax', 'search']),
                { start: 0, length: -1, draw: 1 }, {}, 1000, true
            );
            const data = resp?.data || resp;
            const list = data?.data || data || [];
            if (Array.isArray(list)) {
                setTaxRules(list.map((r) => ({
                    id: r.id,
                    name: `${r.name} (${r.typeRulerTax} ${r.percentage}%)`,
                    type: r.typeRulerTax,
                    percentage: Number(r.percentage || 0),
                })));
            }
        } catch (e) {
            setTaxRules([]);
        }
    };

    /** Limpia errores al cambiar record. */
    useEffect(() => {
        setErrors({ ...emptyErrors });
        setErrorMessage('');
    }, [record]);

    /** Actualiza un campo de la cabecera. */
    const setField = (field, value) => setRecord((prev) => ({ ...prev, [field]: value }));

    /** Actualiza un campo de una linea. */
    const updateLine = (idx, field, value) => {
        setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, [field]: value } : l)));
    };

    const addLine = () => setLines((prev) => [...prev, emptyLine()]);
    const removeLine = (idx) => setLines((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx)));

    /** Marca/desmarca una regla tributaria en una linea. */
    const toggleTaxRule = (idx, ruleId) => {
        setLines((prev) => prev.map((l, i) => {
            if (i !== idx) return l;
            const exists = l.taxRuleIds.includes(ruleId);
            return {
                ...l,
                taxRuleIds: exists ? l.taxRuleIds.filter((x) => x !== ruleId) : [...l.taxRuleIds, ruleId],
            };
        }));
    };

    /** Subtotal de una linea (cantidad * precio). */
    const lineSubtotal = (l) => Number(l.quantity || 0) * Number(l.price || 0);

    /** Calcula impuestos y retenciones de una linea. */
    const lineFiscal = (l) => {
        const base = lineSubtotal(l);
        let tax = 0;
        let withholding = 0;
        (l.taxRuleIds || []).forEach((rid) => {
            const rule = taxRules.find((r) => r.id === rid);
            if (!rule) return;
            const amount = (base * rule.percentage) / 100;
            if (rule.type === 'WITHHOLDING') withholding += amount;
            else tax += amount;
        });
        return { base, tax, withholding };
    };

    /** Totales generales. */
    const totals = lines.reduce((acc, l) => {
        const f = lineFiscal(l);
        acc.subtotal += f.base;
        acc.tax += f.tax;
        acc.withholding += f.withholding;
        return acc;
    }, { subtotal: 0, tax: 0, withholding: 0 });
    const grandTotal = totals.subtotal + totals.tax - totals.withholding;

    /** Al menos una linea valida (cuenta, cantidad > 0, precio > 0). */
    const hasValidLines = lines.some(
        (l) => l.itemId && Number(l.quantity) > 0 && Number(l.price) > 0
    );

    /** Validacion. */
    const validate = () => {
        const next = { ...emptyErrors };
        let valid = true;

        if (!record.supplierInvoiceNumber.trim()) {
            next.supplierInvoiceNumber = 'El numero de factura del proveedor es obligatorio';
            valid = false;
        }
        if (!record.resolutionInvoice.trim()) {
            next.resolutionInvoice = 'La resolucion DIAN es obligatoria';
            valid = false;
        }
        if (!record.thirdPartyId) {
            next.thirdPartyId = 'Debe seleccionar un proveedor';
            valid = false;
        }
        if (!record.paymentFormId) {
            next.paymentFormId = 'Debe seleccionar una forma de pago';
            valid = false;
        }
        if (!record.invoiceDate) {
            next.invoiceDate = 'La fecha de factura es obligatoria';
            valid = false;
        }
        if (!record.invoiceDueDay || Number(record.invoiceDueDay) < 0) {
            next.invoiceDueDay = 'El dia de vencimiento es obligatorio';
            valid = false;
        }
        if (!hasValidLines) {
            setErrorMessage('Debe agregar al menos una linea con cuenta, cantidad > 0 y precio > 0.');
            valid = false;
        }

        setErrors(next);
        return valid;
    };

    /** Envia la factura. */
    const handleSubmit = async () => {
        setErrorMessage('');
        if (!validate()) return;

        // Fallback defensivo: leer directo del DOM si el estado de React
        // no capturo el valor (problema conocido de Select2 + async options).
        const domPaymentForm = Number(document.getElementById('ap_invoice_payment_form')?.value || 0);
        const domThirdParty  = Number(document.getElementById('ap_invoice_third_party')?.value || 0);
        const paymentFormId  = Number(record.paymentFormId) || domPaymentForm;
        const thirdPartyId   = Number(record.thirdPartyId)  || domThirdParty;

        if (!paymentFormId) {
            setErrorMessage('Debe seleccionar una forma de pago valida.');
            return;
        }
        if (!thirdPartyId) {
            setErrorMessage('Debe seleccionar un proveedor valido.');
            return;
        }

        // Construir lineInvoices con forma LineInvoiceRequestDTO:
        //   { itemId, quantity, price, taxRulesIds: [{taxId, value, percentage}] }
        const lineInvoices = lines
            .filter((l) => l.itemId && Number(l.quantity) > 0 && Number(l.price) > 0)
            .map((l) => {
                const base = Number(l.quantity) * Number(l.price);
                const taxRulesIds = (l.taxRuleIds || []).map((rid) => {
                    const rule = taxRules.find((r) => r.id === rid);
                    const pct = rule?.percentage || 0;
                    return {
                        taxId: rid,
                        value: Math.round(((base * pct) / 100) * 100) / 100,
                        percentage: pct,
                    };
                });
                return {
                    // Enviar como accountingAccountId: el selector de linea referencia una cuenta contable,
                    // no un activo. El itemId queda disponible en el backend para facturas sobre activos fijos.
                    accountingAccountId: Number(l.itemId),
                    description: l.description ? String(l.description).trim() : null,
                    quantity: Number(l.quantity),
                    price: Number(l.price),
                    taxRulesIds,
                };
            });

        const payload = {
            stateInvoiceId: record.stateInvoiceId ? Number(record.stateInvoiceId) : null,
            paymentFormId,
            thirdPartyId,
            resolutionInvoice: record.resolutionInvoice.trim(),
            invoiceDate: record.invoiceDate,
            invoiceDueDay: Number(record.invoiceDueDay),
            supplierInvoiceNumber: record.supplierInvoiceNumber.trim(),
            notes: record.notes.trim() || null,
            lineInvoices,
        };

        try {
            setLoading(true);
            await fetchHelper.post(base_url(['api', 'v1', 'invoices', 'fc']), payload, {}, 1000);

            dataTableRef?.current?.ajax.reload();
            modalInstance?.current?.hide();
            setRecord({ ...emptyRecord });
            setLines([emptyLine()]);
            setMessage({ type: 'success', show: true, message: 'Factura registrada exitosamente.' });
        } catch (error) {
            const backendErrors = error?.errors;
            if (Array.isArray(backendErrors) && backendErrors.length > 0) {
                const next = { ...emptyErrors };
                backendErrors.forEach((item) => {
                    if (item.field) next[item.field] = item.message;
                });
                setErrors(next);
            } else {
                setErrorMessage(error?.msg || error?.message || 'Error al registrar la factura.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleClear = () => {
        setRecord({ ...emptyRecord });
        setLines([emptyLine()]);
        setErrors({ ...emptyErrors });
        setErrorMessage('');
    };

    const canSubmit = !loading
        && record.supplierInvoiceNumber.trim()
        && record.resolutionInvoice.trim()
        && record.thirdPartyId
        && record.paymentFormId
        && record.invoiceDate
        && record.invoiceDueDay
        && hasValidLines;

    return (
        <div className="modal fade" ref={modalRef} id="modalCreateApInvoice" tabIndex={-1} aria-hidden="true">
            <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable" role="document">
                <div className="modal-content">
                    <div className="modal-header">
                        <h4 className="modal-title">
                            <i className="ri-bill-line me-2" />Registrar Factura de Compra
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

                        {/* Cabecera */}
                        <div className="row">
                            <div className="col-md-6 mb-3 mt-2">
                                <InputModal
                                    type="text"
                                    id="ap_invoice_supplier_number"
                                    label="# Factura Proveedor"
                                    value={record.supplierInvoiceNumber}
                                    onChange={(e) => setField('supplierInvoiceNumber', e.target.value)}
                                    error={errors.supplierInvoiceNumber}
                                    placeholder="Numero de factura del proveedor"
                                    required
                                />
                            </div>
                            <div className="col-md-6 mb-3 mt-2">
                                <InputModal
                                    type="text"
                                    id="ap_invoice_resolution"
                                    label="Resolucion DIAN"
                                    value={record.resolutionInvoice}
                                    onChange={(e) => setField('resolutionInvoice', e.target.value)}
                                    error={errors.resolutionInvoice}
                                    placeholder="Numero de resolucion DIAN"
                                    required
                                />
                            </div>
                        </div>

                        <div className="row">
                            <div className="col-md-6 mb-3 mt-2">
                                <InputSelectModal
                                    id="ap_invoice_third_party"
                                    label="Proveedor"
                                    value={String(record.thirdPartyId || '')}
                                    onChange={(value) => setField('thirdPartyId', value)}
                                    error={errors.thirdPartyId}
                                    placeholder="Seleccione proveedor"
                                    options={suppliers}
                                    required
                                />
                            </div>
                            <div className="col-md-6 mb-3 mt-2">
                                <InputSelectModal
                                    id="ap_invoice_payment_form"
                                    label="Forma de Pago"
                                    value={String(record.paymentFormId || '')}
                                    onChange={(value) => setField('paymentFormId', value)}
                                    error={errors.paymentFormId}
                                    placeholder="Seleccione forma de pago"
                                    options={paymentForms}
                                    required
                                />
                            </div>
                        </div>

                        <div className="row">
                            <div className="col-md-6 mb-3 mt-2">
                                <InputDate
                                    id="ap_invoice_date"
                                    label="Fecha Factura"
                                    date={record.invoiceDate}
                                    onChange={(date) => setField('invoiceDate', date || '')}
                                    error={errors.invoiceDate}
                                    placeholder="yyyy-mm-dd"
                                    dateFormat="Y-m-d"
                                    required
                                />
                            </div>
                            <div className="col-md-6 mb-3 mt-2">
                                <InputModal
                                    type="number"
                                    id="ap_invoice_due_day"
                                    label="Dia de Vencimiento"
                                    value={record.invoiceDueDay}
                                    onChange={(e) => setField('invoiceDueDay', e.target.value)}
                                    error={errors.invoiceDueDay}
                                    placeholder="Ej: 30"
                                    min={0}
                                    required
                                />
                            </div>
                        </div>

                        <div className="row">
                            <div className="col-12 mb-3 mt-2">
                                <InputModal
                                    type="text"
                                    id="ap_invoice_notes"
                                    label="Notas"
                                    value={record.notes}
                                    onChange={(e) => setField('notes', e.target.value)}
                                    error={errors.notes}
                                    placeholder="Observaciones opcionales"
                                />
                            </div>
                        </div>

                        {/* Lineas */}
                        <div className="d-flex justify-content-between align-items-center mb-2">
                            <h6 className="mb-0">
                                <i className="ri-list-check me-1" />Lineas de la factura
                            </h6>
                            <button type="button" className="btn btn-sm btn-outline-primary" onClick={addLine}>
                                <i className="ri-add-line me-1" />Agregar linea
                            </button>
                        </div>

                        {lines.map((l, idx) => {
                            const { base, tax, withholding } = lineFiscal(l);
                            return (
                                <div className="border rounded p-2 mb-2" key={idx}>
                                    <div className="row">
                                        <div className="col-md-5 mb-2">
                                            <label className="form-label small mb-1">Cuenta contable *</label>
                                            <select
                                                className="form-select form-select-sm"
                                                value={l.itemId}
                                                onChange={(e) => updateLine(idx, 'itemId', e.target.value)}
                                            >
                                                <option value="">-- Seleccionar --</option>
                                                {accounts.map((a) => (
                                                    <option key={a.id} value={a.id}>{a.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="col-md-2 mb-2">
                                            <label className="form-label small mb-1">Cantidad *</label>
                                            <input
                                                type="number" min="0" step="0.01"
                                                className="form-control form-control-sm text-end"
                                                value={l.quantity}
                                                onChange={(e) => updateLine(idx, 'quantity', e.target.value)}
                                            />
                                        </div>
                                        <div className="col-md-3 mb-2">
                                            <label className="form-label small mb-1">Precio unitario *</label>
                                            <input
                                                type="number" min="0" step="0.01"
                                                className="form-control form-control-sm text-end"
                                                value={l.price}
                                                onChange={(e) => updateLine(idx, 'price', e.target.value)}
                                            />
                                        </div>
                                        <div className="col-md-2 mb-2 d-flex align-items-end">
                                            <button
                                                type="button"
                                                className="btn btn-sm btn-outline-danger w-100"
                                                onClick={() => removeLine(idx)}
                                                disabled={lines.length <= 1}
                                                title="Eliminar linea"
                                            >
                                                <i className="ri-delete-bin-line" />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="row">
                                        <div className="col-12 mb-2">
                                            <label className="form-label small mb-1">Descripcion</label>
                                            <input
                                                type="text"
                                                className="form-control form-control-sm"
                                                placeholder="Ej: Servicio de consultoria, Compra de papeleria"
                                                value={l.description || ''}
                                                onChange={(e) => updateLine(idx, 'description', e.target.value)}
                                                maxLength={500}
                                            />
                                        </div>
                                    </div>
                                    <div className="row">
                                        <div className="col-12">
                                            <label className="form-label small mb-1">Reglas tributarias (IVA / Retencion)</label>
                                            <div className="d-flex flex-wrap gap-2">
                                                {taxRules.map((r) => (
                                                    <div className="form-check" key={r.id}>
                                                        <input
                                                            type="checkbox"
                                                            className="form-check-input"
                                                            id={`ap_rule_${idx}_${r.id}`}
                                                            checked={l.taxRuleIds.includes(r.id)}
                                                            onChange={() => toggleTaxRule(idx, r.id)}
                                                        />
                                                        <label className="form-check-label small" htmlFor={`ap_rule_${idx}_${r.id}`}>
                                                            {r.name}
                                                        </label>
                                                    </div>
                                                ))}
                                                {taxRules.length === 0 && (
                                                    <small className="text-muted">Sin reglas tributarias disponibles</small>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="row mt-1">
                                        <div className="col-12 text-end small text-muted">
                                            Subtotal: <strong>${fmt(base)}</strong>
                                            {' | '}IVA: <strong>${fmt(tax)}</strong>
                                            {' | '}Retenciones: <strong>${fmt(withholding)}</strong>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        {/* Totales */}
                        <div className="row mt-3">
                            <div className="col-md-6 offset-md-6">
                                <table className="table table-sm mb-0">
                                    <tbody>
                                        <tr>
                                            <td className="text-end">Subtotal</td>
                                            <td className="text-end" style={{ width: 150 }}>
                                                <strong>${fmt(totals.subtotal)}</strong>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td className="text-end">Total Impuestos</td>
                                            <td className="text-end">${fmt(totals.tax)}</td>
                                        </tr>
                                        <tr>
                                            <td className="text-end">Total Retenciones</td>
                                            <td className="text-end">- ${fmt(totals.withholding)}</td>
                                        </tr>
                                        <tr className="table-light">
                                            <th className="text-end">Total Factura</th>
                                            <th className="text-end">${fmt(grandTotal)}</th>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
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

export default CreateApInvoice;
