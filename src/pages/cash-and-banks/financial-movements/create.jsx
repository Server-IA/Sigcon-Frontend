import { useState, useEffect } from 'react';
import { fetchHelper } from '../../../utils/fetch';
import { base_url } from '../../../utils/functions';
import InputModal from '../../../components/molecules/InputModal';
import InputSelectModal from '../../../components/molecules/inputSelectModal';
import { validateText, validateNumber, validateDateNotFuture } from '../../../utils/fieldValidations';

/**
 * Modal para crear un nuevo movimiento financiero manual.
 * Asocia el movimiento a una cuenta bancaria y opcionalmente clasifica por NIC 7.
 */
const CreateFinancialMovement = ({ modalRef, modalInstance, dataTableRef, setItemCreate }) => {
    const [errors, setErrors] = useState({});
    const [errorMessage, setErrorMessage] = useState('');
    const [bankAccounts, setBankAccounts] = useState([]);
    // QA Bloque AU+ (2026-05-07) Bug 5: cargar tambien bancos para que el
    // contador elija PRIMERO el banco y luego solo vea las cuentas del banco
    // seleccionado. Antes el dropdown mostraba todas las cuentas mezcladas.
    const [banks, setBanks] = useState([]);
    const [form, setForm] = useState({
        bankId: '',
        bankAccountId: '',
        movementDate: '',
        amount: '',
        description: '',
        externalReference: '',
        flowActivity: '',
    });

    const flowActivityOptions = [
        { id: 'OPERATIVA', name: 'Operativa' },
        { id: 'INVERSION', name: 'Inversion' },
        { id: 'FINANCIACION', name: 'Financiacion' },
    ];

    useEffect(() => {
        loadBankAccounts();
        loadBanks();
    }, []);

    // QA Bloque AU+ (2026-05-07) Bug 5: cargar lista de bancos para el dropdown.
    const loadBanks = async () => {
        try {
            const resp = await fetchHelper.post(
                base_url(['api', 'v1', 'banks', 'search']),
                { draw: 1, start: 0, length: -1, search: { value: '', regex: false }, columns: [], order: [] },
                {}, 0
            );
            const items = Array.isArray(resp?.data) ? resp.data : [];
            setBanks(items.filter(b => !b.status || b.status === 'ACTIVE')
                .map(b => ({ id: b.id, name: `${b.code || ''} - ${b.name || ''}`.trim() })));
        } catch (e) {
            console.log('Error cargando bancos:', e);
        }
    };

    /**
     * Carga la lista de cuentas bancarias activas para el selector.
     * fetchHelper.post devuelve directamente la respuesta JSON parseada
     * (no un objeto {data, error}). El payload del DataTable es
     * {draw, recordsTotal, data:[...]}, asi que las filas son resp.data.
     */
    const loadBankAccounts = async () => {
        try {
            const resp = await fetchHelper.post(
                base_url(['api', 'v1', 'bank-accounts', 'search']),
                { draw: 1, start: 0, length: -1, search: { value: '', regex: false }, columns: [], order: [] },
                {},
                0
            );
            const items = Array.isArray(resp?.data) ? resp.data : [];
            // Solo cuentas activas (status='ACTIVA') son utilizables para movimientos.
            const active = items.filter(acc => !acc.status || acc.status === 'ACTIVA');
            // QA Bloque AU (2026-05-06) — Bug 5: el dropdown muestra el SALDO
            // ACTUAL de cada cuenta junto con su codigo+nombre+banco para
            // que el contador sepa de donde viene/va el dinero. Antes solo
            // mostraba "BANCO-001 - Cuenta principal sigcom" sin contexto.
            setBankAccounts(active.map(acc => {
                const balance = acc.currentBalance != null ? acc.currentBalance : (acc.initialBalance ?? 0);
                const formatted = Number(balance).toLocaleString('es-CO', { style: 'currency', currency: acc.currencyTypeDTO?.isoCode || 'COP', minimumFractionDigits: 2 });
                const bank = acc.bankDTO?.name ? ` (${acc.bankDTO.name})` : '';
                return {
                    id: acc.id,
                    name: `${acc.code || ''} - ${acc.accountName || ''}${bank} · Saldo: ${formatted}`.trim(),
                    // Guardamos extra para el banner informativo + filtro por banco.
                    _balance: balance,
                    _isoCode: acc.currencyTypeDTO?.isoCode || 'COP',
                    _bankId: acc.bankDTO?.id ?? acc.bankId ?? null,
                };
            }));
        } catch (e) {
            console.log('Error cargando cuentas bancarias:', e);
        }
    };

    // QA Bloque AU (2026-05-06) — Bug 5: cuenta seleccionada -> banner
    // informativo con saldo actual.
    const selectedAccount = bankAccounts.find(a => String(a.id) === String(form.bankAccountId));

    const handleChange = (field, value) => {
        setForm(prev => ({ ...prev, [field]: value }));
        setErrors(prev => ({ ...prev, [field]: '' }));
    };

    /**
     * Envia el formulario para registrar el movimiento financiero.
     */
    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrors({});
        setErrorMessage('');

        if (!form.bankAccountId) {
            setErrors({ bankAccountId: 'La cuenta bancaria es obligatoria' });
            return;
        }

        // QA BNK (2026-06-03) BNK-RF-33: fecha no futura, monto != 0 hasta 2
        // decimales en +/-999.999.999,99, descripcion 0/500, referencia 0/100.
        const next = {};
        next.movementDate = validateDateNotFuture(form.movementDate, { required: true, label: 'La fecha del movimiento' });
        next.amount = validateNumber(form.amount, { required: true, min: -999999999.99, max: 999999999.99, decimals: 2, label: 'El monto' });
        if (!next.amount && Number(form.amount) === 0) next.amount = 'El monto debe ser distinto de cero';
        next.description = validateText(form.description, { required: false, min: 0, max: 500, patternKey: 'description', label: 'La descripción' });
        next.externalReference = validateText(form.externalReference, { required: false, min: 0, max: 100, patternKey: 'reference', label: 'La referencia externa' });
        Object.keys(next).forEach(k => { if (next[k] == null) delete next[k]; });
        if (Object.keys(next).length > 0) { setErrors(next); return; }

        try {
            const url = base_url(['api', 'v1', 'financial-movements', 'store']) + `?bankAccountId=${form.bankAccountId}`;
            const body = {
                movementDate: form.movementDate,
                amount: form.amount ? Number(form.amount) : null,
                description: form.description,
                externalReference: form.externalReference,
                flowActivity: form.flowActivity || null,
            };

            await fetchHelper.post(url, body, {}, 1000);
            dataTableRef?.current?.ajax?.reload?.();
            modalInstance?.current?.hide();
            setItemCreate(true);
            setForm({
                bankAccountId: '',
                movementDate: '',
                amount: '',
                description: '',
                externalReference: '',
                flowActivity: '',
            });
        } catch (error) {
            if (error?.errors) {
                const fieldErrors = {};
                error.errors.forEach(err => {
                    if (err.field) fieldErrors[err.field] = err.message || err.defaultMessage;
                });
                setErrors(fieldErrors);
            }
            if (error?.msg) {
                setErrorMessage(error.msg);
            }
        }
    };

    return (
        <div className="modal fade" ref={modalRef} tabIndex="-1" aria-hidden="true">
            <div className="modal-dialog modal-lg">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">Nuevo Movimiento Financiero</h5>
                        <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <form onSubmit={handleSubmit}>
                        <div className="modal-body">
                            {errorMessage && (
                                <div className="alert alert-danger">{errorMessage}</div>
                            )}

                            {/* QA Bloque AU (2026-05-06) — Bug 5: banner con
                                saldo actual de la cuenta seleccionada. El
                                contador puede asi confirmar que tiene fondos
                                antes de registrar un egreso. */}
                            {selectedAccount && (
                                <div className="alert alert-info py-2 mb-3 d-flex align-items-center">
                                    <i className="ri-bank-line me-2"></i>
                                    <div>
                                        <strong>Saldo actual de la cuenta:</strong>{' '}
                                        {Number(selectedAccount._balance).toLocaleString('es-CO', {
                                            style: 'currency',
                                            currency: selectedAccount._isoCode || 'COP',
                                            minimumFractionDigits: 2
                                        })}
                                        <small className="d-block text-muted">
                                            Use monto positivo para ingresos y monto negativo para egresos.
                                        </small>
                                    </div>
                                </div>
                            )}

                            <div className="row g-3">
                                {/* QA Bloque AU+ (2026-05-07) Bug 5: Banco PRIMERO,
                                    luego cuenta filtrada por banco. Sin banco no
                                    se puede elegir cuenta. */}
                                <div className="col-md-6">
                                    <InputSelectModal
                                        label="Banco *"
                                        value={form.bankId}
                                        onChange={(val) => {
                                            handleChange('bankId', val);
                                            // Limpiar cuenta al cambiar banco
                                            handleChange('bankAccountId', '');
                                        }}
                                        options={banks}
                                        error={errors.bankId}
                                        emptyMessage={banks.length === 0
                                            ? 'No hay bancos activos. Cree uno en Bancos y Cajas -> Catalogo.'
                                            : 'Sin coincidencias'}
                                    />
                                </div>
                                <div className="col-md-6">
                                    <InputSelectModal
                                        label="Cuenta Bancaria *"
                                        value={form.bankAccountId}
                                        onChange={(val) => handleChange('bankAccountId', val)}
                                        options={form.bankId
                                            ? bankAccounts.filter(a => String(a._bankId) === String(form.bankId))
                                            : []}
                                        error={errors.bankAccountId}
                                        disabled={!form.bankId}
                                        emptyMessage={!form.bankId
                                            ? 'Seleccione un banco primero'
                                            : 'El banco no tiene cuentas activas'}
                                    />
                                </div>
                                <div className="col-md-6">
                                    <InputModal
                                        label="Fecha Movimiento *"
                                        type="date"
                                        value={form.movementDate}
                                        onChange={(e) => handleChange('movementDate', e.target.value)}
                                        error={errors.movementDate}
                                    />
                                </div>
                                <div className="col-md-6">
                                    <InputModal
                                        label="Monto *"
                                        type="number"
                                        value={form.amount}
                                        onChange={(e) => handleChange('amount', e.target.value)}
                                        error={errors.amount}
                                        placeholder="Positivo=ingreso, Negativo=egreso"
                                    />
                                </div>
                                <div className="col-md-6">
                                    <InputSelectModal
                                        label="Actividad Flujo (NIC 7)"
                                        value={form.flowActivity}
                                        onChange={(val) => handleChange('flowActivity', val)}
                                        options={flowActivityOptions}
                                        error={errors.flowActivity}
                                    />
                                </div>
                                <div className="col-md-6">
                                    <InputModal
                                        label="Descripcion"
                                        type="text"
                                        value={form.description}
                                        onChange={(e) => handleChange('description', e.target.value)}
                                        error={errors.description}
                                        maxLength={500}
                                    />
                                </div>
                                <div className="col-md-6">
                                    <InputModal
                                        label="Referencia Externa"
                                        type="text"
                                        value={form.externalReference}
                                        onChange={(e) => handleChange('externalReference', e.target.value)}
                                        error={errors.externalReference}
                                        maxLength={100}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-label-secondary" data-bs-dismiss="modal">Cancelar</button>
                            <button type="submit" className="btn btn-primary">Registrar Movimiento</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default CreateFinancialMovement;
