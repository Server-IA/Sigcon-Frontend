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
    const [accountingAccounts, setAccountingAccounts] = useState([]);
    const [errorMessage, setErrorMessage] = useState('');
    const [loading, setLoading] = useState(false);
    // HU-AP-02 (Bloque AT/AU): editar lineas/monto solo si la factura es PENDING.
    // PENDING significa "sin pagos aplicados" por definicion del estado, sin
    // importar si balanceDue == totalPayment (puede haber retenciones que hacen
    // que difieran). PARTIAL/PAID/SETTLED/VOIDED bloquean edicion de lineas.
    const canEditLines = selected?.status === 'PENDING';
    // QA-BLOQUE-AY HU-AP-02 E3 (2026-05-06): factura PARTIALLY_PAID solo permite
    // editar invoiceDueDay, paymentFormId y notes. Los demas campos quedan
    // bloqueados a nivel UI para evitar 400 al hacer submit (el backend ya
    // valida lo mismo).
    const partial = selected?.status === 'PARTIALLY_PAID';
    const [editLines, setEditLines] = useState(false);
    const [lines, setLines] = useState([]);
    // QA-BLOQUE-AY HU-AP-02 E1 (2026-05-06): catalogo de reglas tributarias
    // (TAX/WITHHOLDING) para que al editar lineas el contador pueda
    // re-aplicar IVA/Retencion como en el modal de creacion. Antes solo se
    // podia cambiar cantidad/precio/cuenta pero no las reglas tributarias,
    // dejando la factura sin impuestos al regenerar el JE.
    const [taxRules, setTaxRules] = useState([]);

    /** Carga catalogos: formas de pago + cuentas contables. */
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
            try {
                const acc = await fetchHelper.post(
                    base_url(['api', 'v1', 'accounting-accounts']),
                    { start: 0, length: 200, draw: 1, columns: [], order: [], search: { value: '' } },
                    {}, 0, true
                );
                const accList = acc?.data || [];
                if (Array.isArray(accList)) {
                    setAccountingAccounts(accList.map((a) => ({
                        id: a.id, name: a.customName || `${a.pucAccount?.code || ''} - ${a.customName || ''}`
                    })));
                }
            } catch (e) { /* noop */ }
            // QA-BLOQUE-AY HU-AP-02 E1 (2026-05-06): cargar reglas tributarias
            try {
                const rt = await fetchHelper.post(
                    base_url(['api', 'v1', 'ruler-tax', 'search']),
                    { start: 0, length: -1, draw: 1 }, {}, 0, true
                );
                const rtData = rt?.data || rt;
                const rtList = rtData?.data || rtData || [];
                if (Array.isArray(rtList)) {
                    setTaxRules(rtList.map((r) => ({
                        id: r.id,
                        name: `${r.name} (${r.typeRulerTax} ${r.percentage}%)`,
                        type: r.typeRulerTax,
                        percentage: Number(r.percentage || 0),
                        // QA-BLOQUE-AY (2026-05-06): respetar tope UVT como el backend.
                        // El backend omite retenciones cuando base < minAmountUvt * uvtValueYear.
                        // Sin estos datos en el frontend, el editor mostraba un total estimado
                        // distinto al real (ej: aplicaba retencion 2.5% a una base que el
                        // backend rechaza por tope UVT).
                        minAmountUvt: r.minAmountUvt != null ? Number(r.minAmountUvt) : null,
                        uvtValueYear: r.uvtValueYear != null ? Number(r.uvtValueYear) : null,
                    })));
                }
            } catch (e) { /* noop */ }
        })();
    }, []);

    /** Precarga los valores cuando cambia la factura seleccionada.
     *  QA-BLOQUE-AY (2026-05-06): tambien resetear lines, editLines y errorMessage
     *  para que al abrir el modal con OTRA factura no aparezcan los datos del
     *  registro anterior (bug visible cuando el contador editaba dos facturas
     *  consecutivas: la 2da heredaba lineas/editLines de la 1ra).
     */
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
        setLines([]);
        setEditLines(false);
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

        // HU-AP-02 (Bloque AT): si el usuario activo "Editar lineas", incluir
        // lineInvoices en el payload. El backend valida que la factura este
        // en PENDING sin pagos.
        // QA-BLOQUE-AY HU-AP-02 E3 (2026-05-06): si la factura es PARTIALLY_PAID,
        // omitir del payload los campos bloqueados (supplierInvoiceNumber,
        // resolutionInvoice, invoiceDate). El backend tambien lo bloquea pero
        // asi se evita el rechazo defensivo cuando el usuario nunca toco esos
        // campos pero el form los tiene cargados con el valor actual.
        const payload = {
            supplierInvoiceNumber: partial ? null : (form.supplierInvoiceNumber?.trim() || null),
            resolutionInvoice:     partial ? null : (form.resolutionInvoice?.trim() || null),
            invoiceDate:           partial ? null : (form.invoiceDate || null),
            invoiceDueDay:         form.invoiceDueDay !== '' ? Number(form.invoiceDueDay) : null,
            paymentFormId:         form.paymentFormId ? Number(form.paymentFormId) : null,
            notes:                 form.notes?.trim() || null,
            thirdPartyId:          selected.thirdPartyId,
            version:               selected.version,
            lineInvoices:          editLines ? lines.filter(l => l.accountingAccountId && l.quantity > 0 && l.price > 0)
                                                     .map(l => ({
                                                         accountingAccountId: Number(l.accountingAccountId),
                                                         description: l.description || '',
                                                         quantity: Number(l.quantity),
                                                         price: Number(l.price),
                                                         // HU-AP-02 E1 (Bloque AY): mapear taxRuleIds del UI al
                                                         // formato que espera el backend: [{taxId, percentage}].
                                                         taxRulesIds: (l.taxRuleIds || []).map((rid) => {
                                                             const rule = taxRules.find((r) => r.id === rid);
                                                             return {
                                                                 taxId: rid,
                                                                 percentage: rule ? rule.percentage : 0,
                                                             };
                                                         }),
                                                     })) : [],
        };

        if (editLines && payload.lineInvoices.length === 0) {
            setErrorMessage('Debe agregar al menos una linea valida con cantidad y precio mayores a cero.');
            return;
        }

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

                            {/* Campos editables.
                                HU-AP-02 E3 (Bloque AY): si la factura es PARTIALLY_PAID,
                                solo invoiceDueDay, paymentFormId y notes son editables.
                                Los demas campos se muestran disabled. */}
                            {partial && (
                                <div className="alert alert-info py-2 mb-3 small mb-2">
                                    <i className="ri-information-line me-1"></i>
                                    Esta factura tiene pagos aplicados. Solo se permiten cambiar
                                    <strong> Dia de Vencimiento</strong> y <strong>Forma de Pago</strong>.
                                </div>
                            )}
                            <div className="row g-3">
                                <div className="col-md-6">
                                    <InputModal
                                        id="upd_supplier_number"
                                        label="# Factura Proveedor"
                                        type="text"
                                        value={form.supplierInvoiceNumber}
                                        onChange={(e) => setField('supplierInvoiceNumber', e.target.value)}
                                        required
                                        disabled={partial}
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
                                        disabled={partial}
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
                                        disabled={partial}
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

                            {/* HU-AP-02 (Bloque AT): editar lineas/monto solo si PENDING sin pagos */}
                            {canEditLines ? (
                                <div className="mt-3">
                                    <div className="form-check form-switch mb-2">
                                        <input className="form-check-input" type="checkbox" id="toggleEditLines"
                                               checked={editLines}
                                               onChange={(e) => {
                                                   setEditLines(e.target.checked);
                                                   if (e.target.checked && lines.length === 0) {
                                                       setLines([{ accountingAccountId: '', description: '', quantity: 1, price: 0, taxRuleIds: [] }]);
                                                   }
                                               }} />
                                        <label className="form-check-label" htmlFor="toggleEditLines">
                                            <strong>Editar lineas y monto</strong>
                                            <small className="text-muted ms-2">(reemplaza las lineas actuales y recalcula el JE)</small>
                                        </label>
                                    </div>
                                    {editLines && (() => {
                                        // Helpers de calculo. Respeta tope UVT como el backend
                                        // (HU-CFG-RF-09 motor UVT): si la regla es WITHHOLDING y
                                        // tiene minAmountUvt + uvtValueYear, omite la retencion
                                        // cuando base < minAmountUvt * uvtValueYear.
                                        const lineFiscal = (l) => {
                                            const base = (Number(l.quantity) || 0) * (Number(l.price) || 0);
                                            let tax = 0, withholding = 0;
                                            const omitted = [];
                                            (l.taxRuleIds || []).forEach((rid) => {
                                                const rule = taxRules.find((r) => r.id === rid);
                                                if (!rule) return;
                                                const amount = (base * rule.percentage) / 100;
                                                if (rule.type === 'WITHHOLDING') {
                                                    if (rule.minAmountUvt != null && rule.uvtValueYear != null) {
                                                        const tope = rule.minAmountUvt * rule.uvtValueYear;
                                                        if (base < tope) {
                                                            omitted.push({ ruleName: rule.name, tope });
                                                            return; // no aplicar
                                                        }
                                                    }
                                                    withholding += amount;
                                                } else {
                                                    tax += amount;
                                                }
                                            });
                                            return { base, tax, withholding, omitted };
                                        };
                                        const totals = lines.reduce((acc, l) => {
                                            const f = lineFiscal(l);
                                            acc.subtotal += f.base; acc.tax += f.tax; acc.withholding += f.withholding;
                                            return acc;
                                        }, { subtotal: 0, tax: 0, withholding: 0 });
                                        const fmt = (n) => Number(n || 0).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                        const toggleTaxRule = (idx, ruleId) => {
                                            setLines((prev) => prev.map((l, i) => {
                                                if (i !== idx) return l;
                                                const ids = l.taxRuleIds || [];
                                                const exists = ids.includes(ruleId);
                                                return {
                                                    ...l,
                                                    taxRuleIds: exists ? ids.filter((x) => x !== ruleId) : [...ids, ruleId],
                                                };
                                            }));
                                        };
                                        return (
                                        <div className="border rounded p-2">
                                            {lines.map((ln, idx) => {
                                                const f = lineFiscal(ln);
                                                return (
                                                <div className="border-bottom mb-2 pb-2" key={idx}>
                                                    <div className="row g-2 align-items-center mb-1">
                                                        <div className="col-md-4">
                                                            <label className="form-label small mb-1">Cuenta contable *</label>
                                                            <select className="form-select form-select-sm"
                                                                value={ln.accountingAccountId || ''}
                                                                onChange={(e) => {
                                                                    const next = [...lines];
                                                                    next[idx].accountingAccountId = e.target.value;
                                                                    setLines(next);
                                                                }}>
                                                                <option value="">-- Cuenta --</option>
                                                                {accountingAccounts.map(a => (
                                                                    <option key={a.id} value={a.id}>{a.name}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                        <div className="col-md-3">
                                                            <label className="form-label small mb-1">Descripcion</label>
                                                            <input type="text" className="form-control form-control-sm"
                                                                placeholder="Descripcion"
                                                                value={ln.description || ''}
                                                                onChange={(e) => {
                                                                    const next = [...lines];
                                                                    next[idx].description = e.target.value;
                                                                    setLines(next);
                                                                }} />
                                                        </div>
                                                        <div className="col-md-2">
                                                            <label className="form-label small mb-1">Cantidad *</label>
                                                            <input type="number" min="1" className="form-control form-control-sm"
                                                                value={ln.quantity}
                                                                onChange={(e) => {
                                                                    const next = [...lines];
                                                                    next[idx].quantity = e.target.value;
                                                                    setLines(next);
                                                                }} />
                                                        </div>
                                                        <div className="col-md-2">
                                                            <label className="form-label small mb-1">Precio *</label>
                                                            <input type="number" min="0" className="form-control form-control-sm"
                                                                value={ln.price}
                                                                onChange={(e) => {
                                                                    const next = [...lines];
                                                                    next[idx].price = e.target.value;
                                                                    setLines(next);
                                                                }} />
                                                        </div>
                                                        <div className="col-md-1 text-end">
                                                            <button type="button" className="btn btn-sm btn-label-danger"
                                                                onClick={() => setLines(lines.filter((_, i) => i !== idx))}
                                                                disabled={lines.length === 1}>
                                                                <i className="ri-close-line" />
                                                            </button>
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
                                                                            id={`upd_rule_${idx}_${r.id}`}
                                                                            checked={(ln.taxRuleIds || []).includes(r.id)}
                                                                            onChange={() => toggleTaxRule(idx, r.id)}
                                                                        />
                                                                        <label className="form-check-label small" htmlFor={`upd_rule_${idx}_${r.id}`}>
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
                                                            Subtotal: <strong>${fmt(f.base)}</strong>
                                                            {' | '}IVA: <strong>${fmt(f.tax)}</strong>
                                                            {' | '}Retenciones: <strong>${fmt(f.withholding)}</strong>
                                                        </div>
                                                        {f.omitted && f.omitted.length > 0 && (
                                                            <div className="col-12 text-end small text-warning">
                                                                <i className="ri-alert-line me-1" />
                                                                {f.omitted.map((o, i) => (
                                                                    <span key={i}>
                                                                        {o.ruleName} no aplica: base inferior al tope UVT (${fmt(o.tope)}){i < f.omitted.length - 1 ? ' | ' : ''}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>);
                                            })}
                                            <button type="button" className="btn btn-sm btn-outline-primary"
                                                onClick={() => setLines([...lines, { accountingAccountId: '', description: '', quantity: 1, price: 0, taxRuleIds: [] }])}>
                                                <i className="ri-add-line" /> Agregar linea
                                            </button>
                                            <div className="mt-2 text-end small">
                                                <div>Subtotal: <strong>${fmt(totals.subtotal)}</strong></div>
                                                <div>Total Impuestos: <strong>${fmt(totals.tax)}</strong></div>
                                                <div>Total Retenciones: <strong>- ${fmt(totals.withholding)}</strong></div>
                                                <div className="fs-6">TOTAL: <strong>${fmt(totals.subtotal + totals.tax - totals.withholding)}</strong></div>
                                            </div>
                                        </div>
                                        );
                                    })()}
                                </div>
                            ) : (
                                <small className="text-muted mt-3 d-block">
                                    <i className="ri-information-line me-1" />
                                    Las lineas y los totales no pueden modificarse en una factura con pagos
                                    aplicados. Si necesitas corregir montos, anula la factura y crea una nueva.
                                </small>
                            )}
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
