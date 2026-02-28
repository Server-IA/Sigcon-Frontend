import '../../../styles/vendor/animate-css/animate.css'
import { base_url } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';
import { useEffect, useState } from 'react';
import AlertPage from '../../../components/molecules/AlertPage';
import InputModal from '../../../components/molecules/InputModal';
import InputSelectModal from '../../../components/molecules/inputSelectModal';

const ACCOUNT_CLASS_OPTIONS = [
    { id: 'ASSET', label: 'Activo' },
    { id: 'LIABILITY', label: 'Pasivo' },
    { id: 'EQUITY', label: 'Patrimonio' },
    { id: 'REVENUE', label: 'Ingresos' },
    { id: 'EXPENSE', label: 'Gastos' },
    { id: 'COST_OF_SALES', label: 'Costos de venta' },
    { id: 'PRODUCTION_COST', label: 'Costos de producción' },
    { id: 'MEMORANDUM_DEBIT', label: 'Cuentas de orden deudoras' },
    { id: 'MEMORANDUM_CREDIT', label: 'Cuentas de orden acreedoras' },
];

const ACCOUNT_LEVEL_OPTIONS = [
    { id: 'CLASS', label: 'Clase (1 dígito)' },
    { id: 'GROUP', label: 'Grupo (2 dígitos)' },
    { id: 'ACCOUNT', label: 'Cuenta (4 dígitos)' },
    { id: 'SUBACCOUNT', label: 'Subcuenta (6 dígitos)' },
];

const NATURE_OPTIONS = [
    { id: 'DEBIT', label: 'Deudora' },
    { id: 'CREDIT', label: 'Acreedora' },
];

const STATUS_OPTIONS = [
    { id: 'ACTIVE', label: 'Activa' },
    { id: 'INACTIVE', label: 'Inactiva' },
];

const UpdatedCuentaContable = ({ 
    modalRef, 
    modalInstance, 
    cuentaContable, 
    setCuentaContable, 
    dataTableRef, 
    setMessage 
}) => {

    const [errors, setErrors] = useState({});
    const [errorMessage, setErrorMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [cuentaUpdated, setCuentaUpdated] = useState(cuentaContable);
<<<<<<< HEAD

    const initialState = {
        id: '',
        code: '',
        name: '',
        accountClass: '',
        level: '',
        nature: '',
        status: 'ACTIVE',
    };
=======
    const [readOnlyFields, setReadOnlyFields] = useState({
        puc_id: false,
        cost_center_id: false,
        depreciation_rule_id: false,
        custom_name: false,
    });

    // Data loading — swagger endpoints:
    // POST /api/v1/chart-of-accounts/search
    // POST /api/v1/accounting-lists/currency-types/search
    // POST /api/v1/cost-centers/search
    // POST /api/v1/depretation-rules/search
    useEffect(() => {
        const dtBody = { draw: 1, start: 0, length: 1000 };
        const loadData = async () => {
            // Promise.allSettled: a 403 on one endpoint won't block the others
            const [pucRes, currRes, ccRes, drRes] = await Promise.allSettled([
                fetchHelper.post(base_url(['api', 'v1', 'chart-of-accounts', 'search']), dtBody, {}, 0),
                fetchHelper.post(base_url(['api', 'v1', 'accounting-lists', 'currency-types', 'search']), dtBody, {}, 0),
                fetchHelper.post(base_url(['api', 'v1', 'cost-centers', 'search']), dtBody, {}, 0),
                fetchHelper.post(base_url(['api', 'v1', 'depretation-rules', 'search']), dtBody, {}, 0),
            ]);
            if (pucRes.status === 'fulfilled')  setPucs(pucRes.value.data || []);
            if (currRes.status === 'fulfilled') setCurrencies(currRes.value.data || []);
            if (ccRes.status === 'fulfilled')   setCostCenters(ccRes.value.data || []);
            if (drRes.status === 'fulfilled')   setDepreciationRules(drRes.value.data || []);
            const failed = [pucRes, currRes, ccRes, drRes].filter(r => r.status === 'rejected');
            if (failed.length) console.warn('Algunos datos no pudieron cargarse:', failed.map(f => f.reason));
        };
        loadData();
    }, []);
>>>>>>> developer

    // Sync local state when the selected account changes
    useEffect(() => {
        setCuentaUpdated(cuentaContable);
    }, [cuentaContable]);

    const handleSubmit = async (e) => {
        e.preventDefault();

<<<<<<< HEAD
        // Validar campos obligatorios
        if (!cuentaUpdated.code || cuentaUpdated.code.trim() === '') {
            setErrorMessage('Por favor diligencie el código de la cuenta');
            return;
        }
        if (!cuentaUpdated.name || cuentaUpdated.name.trim() === '') {
            setErrorMessage('Por favor diligencie el nombre de la cuenta');
            return;
        }
        if (!cuentaUpdated.accountClass) {
            setErrorMessage('Por favor seleccione la clase de la cuenta');
            return;
        }
        if (!cuentaUpdated.level) {
            setErrorMessage('Por favor seleccione el nivel jerárquico');
=======
        // Validar campos obligatorios (swagger UpdateAccountingAccountRequest)
        if (!cuentaUpdated.puc_id) {
            setErrorMessage('Por favor seleccione una cuenta PUC');
            return;
        }
        if (!cuentaUpdated.custom_name || cuentaUpdated.custom_name.trim() === '') {
            setErrorMessage('El nombre personalizado de la cuenta es obligatorio');
            return;
        }
        if (!cuentaUpdated.base_currency) {
            setErrorMessage('Por favor seleccione una moneda base');
>>>>>>> developer
            return;
        }
        if (!cuentaUpdated.nature) {
            setErrorMessage('Por favor seleccione la naturaleza de la cuenta');
            return;
        }
        if (!cuentaUpdated.status) {
            setErrorMessage('Por favor seleccione el estado de la cuenta');
<<<<<<< HEAD
            return;
        }

        // Validar formato del código (solo números, máximo 10 dígitos)
        const codeRegex = /^[0-9]{1,10}$/;
        if (!codeRegex.test(cuentaUpdated.code.trim())) {
            setErrorMessage('El código debe contener solo números (máximo 10 dígitos)');
            return;
        }

        // Validar formato del nombre
        const nameRegex = /^[A-Za-z0-9_\-\s]{1,100}$/;
        if (!nameRegex.test(cuentaUpdated.name.trim())) {
            setErrorMessage('El nombre debe tener entre 1 y 100 caracteres, solo alfanuméricos, espacios, guiones y guiones bajos');
            return;
        }

        // Construir UpdateChartOfAccountDTO según swagger
        const requestBody = {
            code: cuentaUpdated.code.trim(),
            name: cuentaUpdated.name.trim(),
            accountClass: cuentaUpdated.accountClass,
            level: cuentaUpdated.level,
            nature: cuentaUpdated.nature,
            status: cuentaUpdated.status,
        };

        // PUT /api/v1/chart-of-accounts/{id} → 200 OK
        const url = base_url(['api', 'v1', 'chart-of-accounts', cuentaContable.id]);
        try {
            setLoading(true);
            await fetchHelper.put(url, requestBody, {}, 1000);
            
            setCuentaContable(initialState);
=======
            return;
        }

        // Swagger: maxLength 50, pattern ^[a-zA-Z0-9 _-]+$
        const nameRegex = /^[a-zA-Z0-9 _-]{1,50}$/;
        if (!nameRegex.test(cuentaUpdated.custom_name)) {
            setErrorMessage('El nombre debe tener entre 1 y 50 caracteres, solo alfanuméricos, espacios, guiones y guiones bajos');
            return;
        }

        // Swagger: PUT /api/v1/accounting-accounts/update
        const updateUrl = base_url(['api', 'v1', 'accounting-accounts', 'update']);
        const body = {
            id: cuentaUpdated.id,
            puc_id: cuentaUpdated.puc_id,
            custom_name: cuentaUpdated.custom_name.trim(),
            base_currency: cuentaUpdated.base_currency,
            cost_center_id: cuentaUpdated.cost_center_id || null,
            depreciation_rule_id: cuentaUpdated.depreciation_rule_id || null,
            nature: cuentaUpdated.nature,
            status: cuentaUpdated.status,
        };
        try {
            setLoading(true);
            await fetchHelper.put(updateUrl, body, {}, 1000);
            
            setCuentaContable({
                id: '',
                puc_id: '',
                pucCode: '',
                custom_name: '',
                base_currency: '',
                cost_center_id: '',
                depreciation_rule_id: '',
                nature: '',
                status: 'ACTIVE',
            });
>>>>>>> developer
            
            dataTableRef?.current?.ajax.reload();
            modalInstance?.current?.hide();
            
            setMessage({
                message: 'Cuenta contable actualizada exitosamente',
                type: 'success',
                show: true,
            });
            
            setErrors({});
            setErrorMessage('');
        } catch (error) {
            console.error('Error PUT /api/v1/chart-of-accounts/' + cuentaContable.id + ':', error);
            const errores = error?.errors;
            if (errores && errores.length > 0) {
                const fieldErrors = {};
                errores.forEach(err => {
                    fieldErrors[err.field] = err.message;
                });
                setErrors(fieldErrors);
            }
            if (error?.msg) {
                setErrorMessage(error.msg);
            } else if (!errores || errores.length === 0) {
                setErrorMessage('Error al actualizar la cuenta contable');
            }
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        setErrors({});
        setErrorMessage('');
    }, [cuentaUpdated]);

    return <>
        <div className="modal fade" ref={modalRef} id="modalCenter" tabIndex={-1} aria-hidden="true">
            <div className="modal-dialog modal-lg modal-dialog-centered" role="document">
                <div className="modal-content">
                    <div className="modal-header">
                        <h4 className="modal-title" id="modalCenterTitle">Editar Cuenta Contable</h4>
                        <button
                            type="button"
                            className="btn-close"
                            data-bs-dismiss="modal"
                            aria-label="Close"></button>
                    </div>
                    <div className="modal-body">
                        <AlertPage 
                            message={errorMessage} 
                            type="danger" 
                            show={errorMessage !== ''}
                            onChange={() => setErrorMessage('')}
                        />

                        <form onSubmit={handleSubmit}>
                            {/* ID (Solo lectura) */}
                            <div className="row">
                                <div className="col mb-6 mt-2">
                                    <InputModal
                                        type="text"
                                        id="edit_id"
                                        label="ID de Cuenta"
                                        value={cuentaUpdated.id}
                                        onChange={() => {}}
                                        error=""
                                        placeholder=""
                                        disabled={true}
                                    />
                                </div>
                            </div>

                            {/* Código de la Cuenta — swagger: pattern ^[0-9]{1,10}$ */}
                            <div className="row">
                                <div className="col mb-6 mt-2">
<<<<<<< HEAD
                                    <InputModal
                                        type="text"
                                        id="edit_code"
                                        label="Código de la Cuenta"
                                        value={cuentaUpdated.code}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 10);
                                            setCuentaUpdated({ ...cuentaUpdated, code: val });
                                        }}
                                        error={errors.code}
                                        placeholder="Ej: 110505"
                                        required={true}
                                        maxLength={10}
                                        inputMode="numeric"
                                        pattern="^[0-9]{1,10}$"
                                    />
=======
                                    {renderFieldWithTooltip(
                                        readOnlyFields.puc_id,
                                        <InputSelectModal
                                            id="pucId_updated"
                                            label="Cuenta PUC"
                                            value={cuentaUpdated.puc_id}
                                            onChange={(value) => {
                                                const selectedPuc = pucs.find(p => p.id === parseInt(value));
                                                setCuentaUpdated({
                                                    ...cuentaUpdated,
                                                    puc_id: parseInt(value) || '',
                                                    pucCode: selectedPuc?.code || ''
                                                });
                                            }}
                                            error={errors.puc_id}
                                            placeholder="Seleccionar cuenta PUC"
                                            options={pucs.map(puc => ({
                                                id: puc.id,
                                                label: `${puc.code} - ${puc.name}`
                                            }))}
                                            required={true}
                                            disabled={readOnlyFields.puc_id}
                                        />
                                    )}
>>>>>>> developer
                                </div>
                            </div>

                            {/* Nombre de la Cuenta — swagger: pattern ^[A-Za-z0-9_\-\s]{1,100}$ */}
                            <div className="row">
                                <div className="col mb-6 mt-2">
<<<<<<< HEAD
                                    <InputModal
                                        type="text"
                                        id="edit_name"
                                        label="Nombre de la Cuenta"
                                        value={cuentaUpdated.name}
                                        onChange={(e) => setCuentaUpdated({ 
                                            ...cuentaUpdated, 
                                            name: e.target.value 
                                        })}
                                        error={errors.name}
                                        placeholder="Ej: Caja General"
                                        required={true}
                                        maxLength={100}
                                        pattern="^[A-Za-z0-9_\-\s]{1,100}$"
                                    />
=======
                                    {renderFieldWithTooltip(
                                        readOnlyFields.custom_name,
                                        <InputModal
                                            type="text"
                                            id="customName_updated"
                                            label="Nombre Personalizado"
                                            value={cuentaUpdated.custom_name}
                                            onChange={(e) => setCuentaUpdated({ 
                                                ...cuentaUpdated, 
                                                custom_name: e.target.value 
                                            })}
                                            error={errors.custom_name}
                                            placeholder="Ej: Caja general"
                                            maxLength={50}
                                            disabled={readOnlyFields.custom_name}
                                            required={true}
                                        />
                                    )}
>>>>>>> developer
                                </div>
                            </div>

                            {/* Clase Contable */}
                            <div className="row">
                                <div className="col mb-6 mt-2">
                                    <InputSelectModal
<<<<<<< HEAD
                                        id="edit_accountClass"
                                        label="Clase Contable"
                                        value={cuentaUpdated.accountClass}
                                        onChange={(value) => setCuentaUpdated({ 
                                            ...cuentaUpdated, 
                                            accountClass: value 
                                        })}
                                        error={errors.accountClass}
                                        placeholder="Seleccionar clase"
                                        options={ACCOUNT_CLASS_OPTIONS}
=======
                                        id="baseCurrency_updated"
                                        label="Moneda Base"
                                        value={cuentaUpdated.base_currency}
                                        onChange={(value) => setCuentaUpdated({ 
                                            ...cuentaUpdated, 
                                            base_currency: value 
                                        })}
                                        error={errors.base_currency}
                                        placeholder="Seleccionar moneda"
                                        options={currencies.map(currency => ({
                                            id: currency.isoCode,
                                            label: `${currency.name} (${currency.isoCode})`
                                        }))}
>>>>>>> developer
                                        required={true}
                                    />
                                </div>
                            </div>

                            {/* Nivel Jerárquico */}
                            <div className="row">
                                <div className="col mb-6 mt-2">
<<<<<<< HEAD
                                    <InputSelectModal
                                        id="edit_level"
                                        label="Nivel Jerárquico"
                                        value={cuentaUpdated.level}
                                        onChange={(value) => setCuentaUpdated({ 
                                            ...cuentaUpdated, 
                                            level: value 
                                        })}
                                        error={errors.level}
                                        placeholder="Seleccionar nivel"
                                        options={ACCOUNT_LEVEL_OPTIONS}
                                        required={true}
                                    />
=======
                                    {renderFieldWithTooltip(
                                        readOnlyFields.cost_center_id,
                                        <InputSelectModal
                                            id="costCenterId_updated"
                                            label="Centro de Costos"
                                            value={cuentaUpdated.cost_center_id}
                                            onChange={(value) => setCuentaUpdated({ 
                                                ...cuentaUpdated, 
                                                cost_center_id: parseInt(value) || null
                                            })}
                                            error={errors.cost_center_id}
                                            placeholder="Seleccionar centro de costos (opcional)"
                                            options={costCenters.map(center => ({
                                                id: center.id,
                                                label: `${center.code} - ${center.name}`
                                            }))}
                                            clearable={true}
                                            disabled={readOnlyFields.cost_center_id}
                                        />
                                    )}
                                </div>
                            </div>

                            {/* Regla de Depreciación (Solo lectura si hay transacciones) */}
                            <div className="row">
                                <div className="col mb-6 mt-2">
                                    {renderFieldWithTooltip(
                                        readOnlyFields.depreciation_rule_id,
                                        <InputSelectModal
                                            id="depreciationRuleId_updated"
                                            label="Regla de Depreciación"
                                            value={cuentaUpdated.depreciation_rule_id}
                                            onChange={(value) => setCuentaUpdated({ 
                                                ...cuentaUpdated, 
                                                depreciation_rule_id: parseInt(value) || null
                                            })}
                                            error={errors.depreciation_rule_id}
                                            placeholder="Seleccionar regla de depreciación (opcional)"
                                            options={depreciationRules.map(rule => ({
                                                id: rule.id,
                                                label: rule.name
                                            }))}
                                            clearable={true}
                                            disabled={readOnlyFields.depreciation_rule_id}
                                        />
                                    )}
>>>>>>> developer
                                </div>
                            </div>

                            {/* Naturaleza */}
                            <div className="row">
                                <div className="col mb-6 mt-2">
                                    <InputSelectModal
                                        id="edit_nature"
                                        label="Naturaleza de la Cuenta"
                                        value={cuentaUpdated.nature}
                                        onChange={(value) => setCuentaUpdated({ 
                                            ...cuentaUpdated, 
                                            nature: value 
                                        })}
                                        error={errors.nature}
                                        placeholder="Seleccionar naturaleza"
<<<<<<< HEAD
                                        options={NATURE_OPTIONS}
=======
                                        options={[
                                            { id: 'DEBIT', label: 'Deudora' },
                                            { id: 'CREDIT', label: 'Acreedora' }
                                        ]}
>>>>>>> developer
                                        required={true}
                                    />
                                </div>
                            </div>

                            {/* Estado */}
                            <div className="row">
                                <div className="col mb-6 mt-2">
                                    <InputSelectModal
                                        id="edit_status"
                                        label="Estado"
                                        value={cuentaUpdated.status}
                                        onChange={(value) => setCuentaUpdated({ 
                                            ...cuentaUpdated, 
                                            status: value 
                                        })}
                                        error={errors.status}
                                        placeholder="Seleccionar estado"
                                        options={STATUS_OPTIONS}
                                        required={true}
                                    />
                                </div>
                            </div>
                        </form>
                    </div>
                    <div className="modal-footer">
                        <button 
                            type="button" 
                            className="btn btn-secondary" 
                            data-bs-dismiss="modal">
                            Cancelar
                        </button>
                        <button 
                            type="button" 
                            className="btn btn-primary" 
                            onClick={handleSubmit}
                            disabled={loading}
                        >
                            {loading ? 'Guardando...' : 'Guardar Cambios'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </>;
};

export default UpdatedCuentaContable;
