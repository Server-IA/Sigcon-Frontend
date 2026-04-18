import { useEffect, useState } from 'react';

import InputModal from '../../../components/molecules/InputModal';
import InputSelectModal from '../../../components/molecules/inputSelectModal';
import AlertPage from '../../../components/molecules/AlertPage';

import { base_url } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';

/**
 * Modal para registrar una nueva Factura de Venta (FV).
 * Envia POST a /api/v1/sales-invoices/fv.
 */

const emptyRecord = {
    thirdPartyId: '',
    invoiceDate: '',
    dueDate: '',
    currencyId: '',
    exchangeRate: '1',
    paymentFormId: '',
    resolutionNumber: '',
    notes: '',
};

const emptyLine = {
    description: '',
    quantity: '1',
    unitPrice: '0',
    discount: '0',
    taxRuleIds: [],
};

const CreateSalesInvoice = ({ modalRef, modalInstance, dataTableRef, setMessage }) => {
    const [record, setRecord] = useState({ ...emptyRecord });
    const [lines, setLines] = useState([{ ...emptyLine }]);
    const [errorMessage, setErrorMessage] = useState('');
    const [loading, setLoading] = useState(false);

    const [clients, setClients] = useState([]);
    const [currencies, setCurrencies] = useState([]);
    const [paymentForms, setPaymentForms] = useState([]);
    const [taxRules, setTaxRules] = useState([]);

    useEffect(() => {
        loadClients();
        loadCurrencies();
        loadPaymentForms();
        loadTaxRules();
    }, []);

    const loadClients = async () => {
        try {
            const { data } = await fetchHelper.post(
                base_url(['api', 'v1', 'third-parties', 'search']),
                { length: -1, columns: [] },
                {},
                0
            );
            if (Array.isArray(data)) {
                setClients(data.map((t) => ({
                    id: t.id,
                    name: `${t.documentNumber || t.nit || ''} - ${t.businessName || t.firstName || ''}`.trim(),
                })));
            }
        } catch (e) { /* noop */ }
    };

    const loadCurrencies = async () => {
        try {
            const resp = await fetchHelper.post(
                base_url(['api', 'v1', 'accounting-lists', 'currency-types', 'search']),
                { start: 0, length: -1, draw: 1 }, {}, 1000, true
            );
            const data = resp?.data || resp;
            const list = data?.data || data || [];
            if (Array.isArray(list)) {
                setCurrencies(list.map((c) => ({ id: c.id, name: `${c.isoCode || c.code} - ${c.name}` })));
            }
        } catch (e) { /* noop */ }
    };

    const loadPaymentForms = async () => {
        try {
            const resp = await fetchHelper.post(
                base_url(['api', 'v1', 'resources', 'payment-forms']),
                { start: 0, length: -1, draw: 1 }, {}, 1000, true
            );
            const data = resp?.data || resp;
            const list = data?.data || data || [];
            if (Array.isArray(list)) {
                setPaymentForms(list.map((p) => ({ id: p.id, name: p.name })));
            }
        } catch (e) { /* noop */ }
    };

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
                })));
            }
        } catch (e) { /* noop */ }
    };

    const updateLine = (idx, field, value) => {
        setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, [field]: value } : l)));
    };

    const addLine = () => setLines((prev) => [...prev, { ...emptyLine }]);
    const removeLine = (idx) => setLines((prev) => prev.filter((_, i) => i !== idx));

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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMessage('');
        setLoading(true);
        try {
            const payload = {
                thirdPartyId: Number(record.thirdPartyId),
                invoiceDate: record.invoiceDate,
                dueDate: record.dueDate,
                currencyId: record.currencyId ? Number(record.currencyId) : null,
                exchangeRate: record.exchangeRate ? Number(record.exchangeRate) : 1,
                paymentFormId: record.paymentFormId ? Number(record.paymentFormId) : null,
                resolutionNumber: record.resolutionNumber || null,
                notes: record.notes || null,
                lines: lines.map((l) => ({
                    description: l.description,
                    quantity: Number(l.quantity),
                    unitPrice: Number(l.unitPrice),
                    discount: Number(l.discount) || 0,
                    taxRuleIds: (l.taxRuleIds || []).map(Number),
                })),
            };

            await fetchHelper.post(base_url(['api', 'v1', 'sales-invoices', 'fv']), payload, {}, 1000);

            setMessage({ type: 'success', show: true, message: 'Factura de venta creada correctamente.' });
            dataTableRef?.current?.ajax.reload();
            modalInstance?.current?.hide();
            setRecord({ ...emptyRecord });
            setLines([{ ...emptyLine }]);
        } catch (err) {
            setErrorMessage(err?.message || err?.msg || 'Error al crear la factura.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal fade" tabIndex="-1" ref={modalRef}>
            <div className="modal-dialog modal-xl" role="document">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">Registrar Factura de Venta</h5>
                        <button type="button" className="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <form onSubmit={handleSubmit}>
                        <div className="modal-body">
                            <AlertPage type="danger" message={errorMessage} show={!!errorMessage}
                                onChange={() => setErrorMessage('')} />

                            {/* Seccion cabecera */}
                            <h6 className="text-primary fw-bold mb-3">
                                <i className="ri-file-list-3-line me-1" />Datos de la factura
                            </h6>
                            <div className="row g-3 mb-4">
                                <div className="col-md-6">
                                    <InputSelectModal label="Cliente" name="thirdPartyId"
                                        value={record.thirdPartyId}
                                        options={clients}
                                        onChange={(val) => setRecord({ ...record, thirdPartyId: val })} />
                                </div>
                                <div className="col-md-3">
                                    <InputModal label="Fecha factura" name="invoiceDate" type="date"
                                        value={record.invoiceDate}
                                        onChange={(e) => setRecord({ ...record, invoiceDate: e.target.value })} />
                                </div>
                                <div className="col-md-3">
                                    <InputModal label="Vencimiento" name="dueDate" type="date"
                                        value={record.dueDate}
                                        onChange={(e) => setRecord({ ...record, dueDate: e.target.value })} />
                                </div>

                                <div className="col-md-4">
                                    <InputSelectModal label="Moneda" name="currencyId"
                                        value={record.currencyId}
                                        options={currencies}
                                        onChange={(val) => setRecord({ ...record, currencyId: val })} />
                                </div>
                                <div className="col-md-4">
                                    <InputModal label="Tasa de cambio" name="exchangeRate" type="number"
                                        value={record.exchangeRate}
                                        onChange={(e) => setRecord({ ...record, exchangeRate: e.target.value })} />
                                </div>
                                <div className="col-md-4">
                                    <InputSelectModal label="Forma de pago" name="paymentFormId"
                                        value={record.paymentFormId}
                                        options={paymentForms}
                                        onChange={(val) => setRecord({ ...record, paymentFormId: val })} />
                                </div>

                                <div className="col-md-6">
                                    <InputModal label="Resolucion DIAN" name="resolutionNumber" type="text"
                                        value={record.resolutionNumber}
                                        onChange={(e) => setRecord({ ...record, resolutionNumber: e.target.value })} />
                                </div>
                                <div className="col-md-6">
                                    <InputModal label="Notas" name="notes" type="text"
                                        value={record.notes}
                                        onChange={(e) => setRecord({ ...record, notes: e.target.value })} />
                                </div>
                            </div>

                            <hr className="my-4" />

                            {/* Seccion lineas */}
                            <div className="d-flex justify-content-between align-items-center mb-3">
                                <h6 className="text-primary fw-bold mb-0">
                                    <i className="ri-list-check me-1" />Lineas de factura
                                </h6>
                                <button type="button" className="btn btn-sm btn-primary" onClick={addLine}>
                                    <i className="ri-add-line me-1" />Agregar linea
                                </button>
                            </div>

                            {lines.map((line, idx) => (
                                <div className="card border mb-3" key={idx}>
                                    <div className="card-body p-3">
                                        <div className="d-flex justify-content-between align-items-center mb-2">
                                            <span className="badge bg-label-primary">Linea #{idx + 1}</span>
                                            <button type="button" className="btn btn-sm btn-outline-danger"
                                                onClick={() => removeLine(idx)}
                                                disabled={lines.length === 1}
                                                title="Eliminar linea">
                                                <i className="ri-delete-bin-5-line" />
                                            </button>
                                        </div>
                                        <div className="row g-3">
                                            <div className="col-md-5">
                                                <InputModal label="Descripcion" name={`desc_${idx}`} type="text"
                                                    value={line.description}
                                                    onChange={(e) => updateLine(idx, 'description', e.target.value)} />
                                            </div>
                                            <div className="col-md-2">
                                                <InputModal label="Cantidad" name={`qty_${idx}`} type="number"
                                                    value={line.quantity}
                                                    onChange={(e) => updateLine(idx, 'quantity', e.target.value)} />
                                            </div>
                                            <div className="col-md-3">
                                                <InputModal label="Precio unitario" name={`price_${idx}`} type="number"
                                                    value={line.unitPrice}
                                                    onChange={(e) => updateLine(idx, 'unitPrice', e.target.value)} />
                                            </div>
                                            <div className="col-md-2">
                                                <InputModal label="Descuento" name={`disc_${idx}`} type="number"
                                                    value={line.discount}
                                                    onChange={(e) => updateLine(idx, 'discount', e.target.value)} />
                                            </div>

                                            <div className="col-12">
                                                <label className="form-label small fw-semibold mb-2">
                                                    Reglas tributarias (IVA / Retencion)
                                                </label>
                                                <div className="d-flex flex-wrap gap-3">
                                                    {taxRules.map((r) => (
                                                        <div className="form-check" key={r.id}>
                                                            <input type="checkbox" className="form-check-input"
                                                                id={`rule_${idx}_${r.id}`}
                                                                checked={line.taxRuleIds.includes(r.id)}
                                                                onChange={() => toggleTaxRule(idx, r.id)} />
                                                            <label className="form-check-label small"
                                                                htmlFor={`rule_${idx}_${r.id}`}>{r.name}</label>
                                                        </div>
                                                    ))}
                                                    {taxRules.length === 0 && (
                                                        <small className="text-muted fst-italic">
                                                            Sin reglas tributarias disponibles
                                                        </small>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-label-secondary" data-bs-dismiss="modal">Cancelar</button>
                            <button type="submit" className="btn btn-primary" disabled={loading}>
                                {loading ? 'Guardando...' : 'Guardar factura'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default CreateSalesInvoice;
