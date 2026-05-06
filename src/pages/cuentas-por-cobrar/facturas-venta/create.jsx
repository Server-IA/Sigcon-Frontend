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

/**
 * HU-AR-01B DEF#3: traduccion de nombres de campos a etiquetas legibles para
 * mostrar en mensajes de validacion. Si un campo no esta en el mapa, se usa
 * el nombre crudo. Cubre los campos de SalesInvoice + lineas anidadas.
 */
const FIELD_LABELS = {
    thirdPartyId: 'Cliente',
    invoiceDate: 'Fecha de la factura',
    dueDate: 'Fecha de vencimiento',
    currencyId: 'Moneda',
    exchangeRate: 'Tasa de cambio',
    paymentFormId: 'Forma de pago',
    resolutionNumber: 'Resolucion DIAN',
    notes: 'Notas',
    lines: 'Lineas de la factura',
    'lines[].description': 'Descripcion de la linea',
    'lines[].quantity': 'Cantidad',
    'lines[].unitPrice': 'Precio unitario',
    'lines[].discount': 'Descuento',
    'lines[].taxRuleIds': 'Reglas tributarias',
};

/**
 * HU-AR-01B DEF#3: convierte el array de errores de validacion del backend
 * (formato {field, message}) en (1) un mensaje legible y (2) un mapa
 * fieldName -> message para resaltar campos en el form.
 */
const buildValidationErrors = (errors) => {
    if (!Array.isArray(errors) || errors.length === 0) return { msg: '', map: {} };
    const map = {};
    const lines = errors.map((e) => {
        const field = e?.field || '';
        // Normalizar `lines[0].description` a `lines[].description`
        const normalized = field.replace(/\[\d+\]/g, '[]');
        const label = FIELD_LABELS[normalized] || FIELD_LABELS[field] || field;
        const msg = e?.message || 'Campo invalido';
        map[field] = msg;
        return `- ${label}: ${msg}`;
    });
    return {
        msg: 'Faltan o son invalidos los siguientes campos:\n' + lines.join('\n'),
        map,
    };
};

const CreateSalesInvoice = ({ modalRef, modalInstance, dataTableRef, setMessage }) => {
    const [record, setRecord] = useState({ ...emptyRecord });
    const [lines, setLines] = useState([{ ...emptyLine }]);
    const [errorMessage, setErrorMessage] = useState('');
    // HU-AR-01B DEF#3: errores por campo para resaltar inputs invalidos.
    const [fieldErrors, setFieldErrors] = useState({});
    const [loading, setLoading] = useState(false);

    const [clients, setClients] = useState([]);
    const [currencies, setCurrencies] = useState([]);
    const [paymentForms, setPaymentForms] = useState([]);
    const [taxRules, setTaxRules] = useState([]);
    const [resolutions, setResolutions] = useState([]);
    // HU-AR-01A E3: cache de paymentTermDays por tercero, cargado desde commercial-data.
    const [paymentTermDaysByThird, setPaymentTermDaysByThird] = useState({});
    // Para mostrar warning cuando el cliente NO tiene termino de pago configurado.
    const [missingPaymentTermWarning, setMissingPaymentTermWarning] = useState('');

    useEffect(() => {
        loadClients();
        loadCurrencies();
        loadPaymentForms();
        loadTaxRules();
        loadResolutions();
    }, []);

    const loadResolutions = async () => {
        try {
            const resp = await fetchHelper.post(
                base_url(['api', 'v1', 'ar', 'dian', 'resolutions', 'search']),
                { start: 0, length: -1, draw: 1 }, {}, 1000, true
            );
            const list = Array.isArray(resp?.data) ? resp.data : [];
            setResolutions(list
                .filter(r => r.status === 'ACTIVE')
                .map(r => ({
                    id: r.id,
                    name: `${r.resolutionNumber || r.number || r.id} (${r.startNumber}-${r.endNumber})`,
                    resolutionNumber: r.resolutionNumber || r.number || String(r.id),
                })));
        } catch (e) { /* noop */ }
    };

    const loadClients = async () => {
        try {
            // fetchHelper retorna el JSON directo (no {data, error}).
            const resp = await fetchHelper.post(
                base_url(['api', 'v1', 'third-parties', 'search']),
                { length: -1, columns: [] },
                {},
                0
            );
            const list = Array.isArray(resp?.data) ? resp.data : (Array.isArray(resp) ? resp : []);
            if (list.length > 0) {
                setClients(list.map((t) => ({
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
                // QA-2026-05-05: incluir isoCode para que el subtotal muestre la
                // moneda real (USD/EUR/etc) en lugar de "COP" por defecto.
                setCurrencies(list.map((c) => ({
                    id: c.id,
                    name: `${c.isoCode || c.code} - ${c.name}`,
                    isoCode: c.isoCode || c.code,
                })));
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

    /**
     * HU-AR-01A E3: cuando el contador selecciona cliente o cambia la fecha de
     * factura, calculamos automaticamente la fecha de vencimiento sumando los
     * dias del termino de pago configurado en commercial-data del cliente.
     */
    const fetchPaymentTermDays = async (thirdPartyId) => {
        if (!thirdPartyId) return null;
        if (paymentTermDaysByThird[thirdPartyId] !== undefined) {
            return paymentTermDaysByThird[thirdPartyId];
        }
        try {
            const resp = await fetchHelper.get(
                base_url(['api', 'v1', 'commercial-data', thirdPartyId]),
                {}, 1000, true
            );
            const data = resp?.data || resp;
            const days = data?.paymentTermDays
                      ?? data?.paymentTerm?.days
                      ?? data?.commercial?.paymentTermDays
                      ?? null;
            setPaymentTermDaysByThird((prev) => ({ ...prev, [thirdPartyId]: days }));
            return days;
        } catch (_) {
            setPaymentTermDaysByThird((prev) => ({ ...prev, [thirdPartyId]: null }));
            return null;
        }
    };

    const recalcDueDate = async (clientId, invoiceDate) => {
        if (!clientId || !invoiceDate) {
            setRecord((prev) => ({ ...prev, dueDate: '' }));
            setMissingPaymentTermWarning('');
            return;
        }
        const days = await fetchPaymentTermDays(clientId);
        if (!days || days <= 0) {
            setRecord((prev) => ({ ...prev, dueDate: '' }));
            setMissingPaymentTermWarning(
                'Este cliente no tiene terminos de pago configurados. '
                + 'Registre los datos comerciales del cliente antes de continuar.'
            );
            return;
        }
        setMissingPaymentTermWarning('');
        const base = new Date(invoiceDate + 'T00:00:00');
        base.setDate(base.getDate() + Number(days));
        const yyyy = base.getFullYear();
        const mm = String(base.getMonth() + 1).padStart(2, '0');
        const dd = String(base.getDate()).padStart(2, '0');
        setRecord((prev) => ({ ...prev, dueDate: `${yyyy}-${mm}-${dd}` }));
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
        setFieldErrors({});

        // QA-2026-05-05 (CXC factura venta): validacion frontend para
        // resaltar TODOS los campos requeridos en rojo + alerta general
        // antes del POST.
        const clientErrors = {};
        if (!record.thirdPartyId) clientErrors.thirdPartyId = 'El cliente es requerido.';
        if (!record.invoiceDate) clientErrors.invoiceDate = 'La fecha de la factura es requerida.';
        if (!record.currencyId) clientErrors.currencyId = 'La moneda es requerida.';
        if (!record.paymentFormId) clientErrors.paymentFormId = 'La forma de pago es requerida.';
        if (record.currencyId && (!record.exchangeRate || Number(record.exchangeRate) <= 0)) {
            clientErrors.exchangeRate = 'La tasa de cambio debe ser mayor que cero.';
        }
        const linesErrors = [];
        lines.forEach((l, idx) => {
            const le = {};
            if (!l.description || !String(l.description).trim()) le.description = 'Descripcion requerida.';
            if (!l.quantity || Number(l.quantity) <= 0) le.quantity = 'Cantidad > 0.';
            if (!l.unitPrice || Number(l.unitPrice) <= 0) le.unitPrice = 'Precio unitario > 0.';
            if (Object.keys(le).length) {
                linesErrors[idx] = le;
                clientErrors[`lines[${idx}]`] = `Linea ${idx+1}: complete los campos obligatorios.`;
            }
        });
        if (Object.keys(clientErrors).length > 0) {
            setFieldErrors(clientErrors);
            setErrorMessage('Hay campos obligatorios sin completar. Revise los marcados en rojo.');
            return;
        }
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
            // HU-AR-01B DEF#3: si el backend mando details/errors, mostrar
            // cada campo invalido con su mensaje y resaltar inputs.
            const validation = buildValidationErrors(err?.errors);
            if (validation.msg) {
                setErrorMessage(validation.msg);
                setFieldErrors(validation.map);
            } else {
                setErrorMessage(err?.msg || err?.message || 'Error al crear la factura.');
            }
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
                                        error={fieldErrors.thirdPartyId}
                                        required
                                        onChange={(val) => {
                                            // HU-AR-01A E3: al cambiar cliente, recalcular venc.
                                            setRecord((prev) => ({ ...prev, thirdPartyId: val }));
                                            recalcDueDate(val, record.invoiceDate);
                                        }} />
                                </div>
                                <div className="col-md-3">
                                    <InputModal label="Fecha factura" name="invoiceDate" type="date"
                                        value={record.invoiceDate}
                                        error={fieldErrors.invoiceDate}
                                        required
                                        onChange={(e) => {
                                            const v = e.target.value;
                                            setRecord((prev) => ({ ...prev, invoiceDate: v }));
                                            // HU-AR-01A E3: al cambiar fecha, recalcular venc.
                                            recalcDueDate(record.thirdPartyId, v);
                                        }} />
                                </div>
                                {/* QA-2026-05-05: usar InputModal (form-floating-outline) para que
                                    se alinee con Cliente y Fecha factura. Antes se usaba un input
                                    crudo que rompia el alineamiento vertical de la fila. */}
                                <div className="col-md-3">
                                    <InputModal label="Vencimiento" name="dueDate" type="date"
                                        value={record.dueDate || ''}
                                        readOnly
                                        disabled
                                        onChange={() => { /* readonly */ }} />
                                    {missingPaymentTermWarning && (
                                        <small className="text-danger d-block mt-1">
                                            <i className="ri-error-warning-line me-1" />
                                            {missingPaymentTermWarning}
                                        </small>
                                    )}
                                    {!missingPaymentTermWarning && record.dueDate && (
                                        <small className="text-success d-block mt-1">
                                            <i className="ri-check-line me-1" />
                                            Calculada automaticamente
                                        </small>
                                    )}
                                </div>

                                <div className="col-md-4">
                                    <InputSelectModal label="Moneda" name="currencyId"
                                        value={record.currencyId}
                                        options={currencies}
                                        error={fieldErrors.currencyId}
                                        required
                                        onChange={(val) => setRecord({ ...record, currencyId: val })} />
                                </div>
                                <div className="col-md-4">
                                    <InputModal label="Tasa de cambio" name="exchangeRate" type="number"
                                        value={record.exchangeRate}
                                        error={fieldErrors.exchangeRate}
                                        required
                                        onChange={(e) => setRecord({ ...record, exchangeRate: e.target.value })} />
                                </div>
                                <div className="col-md-4">
                                    <InputSelectModal label="Forma de pago" name="paymentFormId"
                                        value={record.paymentFormId}
                                        options={paymentForms}
                                        error={fieldErrors.paymentFormId}
                                        required
                                        onChange={(val) => setRecord({ ...record, paymentFormId: val })} />
                                </div>

                                <div className="col-md-6">
                                    {/* QA-2026-05-05: las resoluciones DIAN registradas en el modulo
                                        deben aparecer como dropdown en la creacion de la factura. */}
                                    {resolutions.length > 0 ? (
                                        <InputSelectModal label="Resolucion DIAN (opcional)"
                                            name="resolutionNumber"
                                            value={record.resolutionNumber}
                                            options={resolutions}
                                            onChange={(val) => {
                                                const r = resolutions.find(x => String(x.id) === String(val));
                                                setRecord({ ...record, resolutionNumber: r ? r.resolutionNumber : '' });
                                            }} />
                                    ) : (
                                        <InputModal label="Resolucion DIAN (opcional)" name="resolutionNumber" type="text"
                                            value={record.resolutionNumber}
                                            placeholder="No hay resoluciones registradas"
                                            onChange={(e) => setRecord({ ...record, resolutionNumber: e.target.value })} />
                                    )}
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
                                                    required
                                                    error={!line.description?.trim() && fieldErrors[`lines[${idx}]`] ? 'Descripcion requerida' : ''}
                                                    onChange={(e) => updateLine(idx, 'description', e.target.value)} />
                                            </div>
                                            <div className="col-md-2">
                                                <InputModal label="Cantidad" name={`qty_${idx}`} type="number"
                                                    value={line.quantity}
                                                    required
                                                    error={(!line.quantity || Number(line.quantity) <= 0) && fieldErrors[`lines[${idx}]`] ? 'Cantidad > 0' : ''}
                                                    onChange={(e) => updateLine(idx, 'quantity', e.target.value)} />
                                            </div>
                                            <div className="col-md-3">
                                                <InputModal label="Precio unitario" name={`price_${idx}`} type="number"
                                                    value={line.unitPrice}
                                                    required
                                                    error={(!line.unitPrice || Number(line.unitPrice) <= 0) && fieldErrors[`lines[${idx}]`] ? 'Precio > 0' : ''}
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

                            {/* HU-AR-11 E2 (2026-04-27): si la factura es en moneda extranjera,
                                mostrar totales en moneda original Y conversion a COP usando la
                                tasa de cambio ingresada. Antes el contador no veia el equivalente
                                en pesos hasta confirmar la factura. */}
                            {(() => {
                                const subtotal = lines.reduce((acc, l) => {
                                    const qty = Number(l.quantity) || 0;
                                    const price = Number(l.unitPrice) || 0;
                                    const disc = Number(l.discount) || 0;
                                    return acc + (qty * price - disc);
                                }, 0);
                                const selectedCur = currencies.find(c => String(c.id) === String(record.currencyId));
                                const iso = selectedCur?.isoCode || selectedCur?.label || 'COP';
                                const rate = Number(record.exchangeRate) || 1;
                                const isForeign = iso && iso !== 'COP';
                                if (subtotal <= 0) return null;
                                return (
                                    <div className="alert alert-info mt-3 mb-0">
                                        <div className="d-flex justify-content-between flex-wrap">
                                            <span><strong>Subtotal:</strong> {subtotal.toLocaleString('es-CO')} {iso}</span>
                                            {isForeign && (
                                                <span className="text-primary">
                                                    <i className="ri-exchange-line me-1" />
                                                    <strong>Equivalente:</strong> ${(subtotal * rate).toLocaleString('es-CO')} COP
                                                    <small className="ms-2">(tasa {rate})</small>
                                                </span>
                                            )}
                                        </div>
                                        <small className="text-muted d-block mt-1">
                                            Los impuestos y retenciones se calculan automaticamente al guardar.
                                        </small>
                                    </div>
                                );
                            })()}
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
