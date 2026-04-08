import '../../../styles/vendor/animate-css/animate.css'
import { base_url } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';
import { useEffect, useState } from 'react';
import AlertPage from '../../../components/molecules/AlertPage';
import InputModal from '../../../components/molecules/InputModal';
import InputSelectModal from '../../../components/molecules/inputSelectModal';
const CreateCuentaContable = ({ 
    modalRef, 
    modalInstance, 
    cuentaContable, 
    setCuentaContable, 
    dataTableRef, 
    setMessage 
}) => {

    const [errors, setErrors] = useState({});
    const [errorMessage, setErrorMessage] = useState('');
    const [currencies, setCurrencies] = useState([]);
    const [costCenters, setCostCenters] = useState([]);
    const [loading, setLoading] = useState(false);

    // Data loading — swagger endpoints:
    // POST /api/v1/chart-of-accounts/search
    // POST /api/v1/accounting-lists/currency-types/search
    // POST /api/v1/cost-centers/search
    // POST /api/v1/depretation-rules/search
    useEffect(() => {
        const dtBody = { length: -1, columns: [{data:'status', search: {value: 'ACTIVE', regex: false}}] };
        const loadData = async () => {
            // Promise.allSettled: a 403 on one endpoint won't block the others
            const [currRes, ccRes] = await Promise.allSettled([
                fetchHelper.post(base_url(['api', 'v1', 'accounting-lists', 'currency-types', 'search']), dtBody, {}, 0),
                fetchHelper.post(base_url(['api', 'v1', 'cost-centers', 'search']), dtBody, {}, 0),
                // fetchHelper.post(base_url(['api', 'v1', 'depretation-rules', 'search']), dtBody, {}, 0),
            ]);
            if (currRes.status === 'fulfilled') setCurrencies(currRes.value.data || []);
            if (ccRes.status === 'fulfilled')   setCostCenters(ccRes.value.data || []);
            // if (drRes.status === 'fulfilled')   setDepreciationRules(drRes.value.data || []);
            const failed = [currRes, ccRes].filter(r => r.status === 'rejected');
            if (failed.length) console.warn('Algunos datos no pudieron cargarse:', failed.map(f => f.reason));
        };
        loadData();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validar campos obligatorios (swagger: puc_id, custom_name, base_currency, nature son requeridos)
        if (!cuentaContable.puc_id) {
            setErrors({ ...errors, puc_id: 'Por favor seleccione una cuenta PUC' });
            return;
        }
        if (!cuentaContable.custom_name || cuentaContable.custom_name.trim() === '') {
            setErrors({ ...errors, custom_name: 'El nombre personalizado de la cuenta es obligatorio' });
            return;
        }
        if (!cuentaContable.currency_type_id) {
            setErrors({ ...errors, currency_type_id: 'Por favor seleccione una moneda base' });
            return;
        }
        if (!cuentaContable.cost_center_id) {
            setErrors({ ...errors, cost_center_id: 'Por favor seleccione un centro de costos' });
            return;
        }
        if (!cuentaContable.nature) {
            setErrors({ ...errors, nature: 'Por favor seleccione la naturaleza de la cuenta' });
            return;
        }

        // Swagger CreateAccountingAccountRequest: maxLength 50, pattern ^[a-zA-Z0-9 _-]+$
        const nameRegex = /^[a-zA-Z0-9 _-]{1,50}$/;
        if (!nameRegex.test(cuentaContable.custom_name)) {
            setErrors({ ...errors, custom_name: 'El nombre debe tener entre 1 y 50 caracteres, solo alfanuméricos, espacios, guiones y guiones bajos' });
            return;
        }

        // Swagger: POST /api/v1/accounting-accounts/store
        const storeUrl = base_url(['api', 'v1', 'accounting-accounts', 'store']);
        const body = {
            puc_id: cuentaContable.puc_id,
            custom_name: cuentaContable.custom_name.trim(),
            currency_type_id: cuentaContable.currency_type_id,
            cost_center_id: cuentaContable.cost_center_id || null,
            tax_rule_id: cuentaContable.tax_rule_id || null,
            nature: cuentaContable.nature,
        };
        try {
            setLoading(true);
            await fetchHelper.post(storeUrl, body, {}, 1000);
            
            dataTableRef?.current?.ajax.reload();
            modalInstance?.current?.hide();
            
            setMessage({
                message: 'Cuenta contable creada exitosamente',
                type: 'success',
                show: true,
            });
            
            setErrors({});
            setErrorMessage('');
        } catch (error) {
            console.log(error);
            const errores = error?.errors;
            if (errores && errores.length > 0) {
                const fieldErrors = {};
                errores.forEach(err => {
                    fieldErrors[err.field] = err.message;
                });
                setErrors(fieldErrors);
            } else if (error?.msg) {
                setErrorMessage(error.msg);
            }
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        setErrors({});
        setErrorMessage('');
    }, [cuentaContable]);

    return <>
        <div className="modal fade" ref={modalRef} id="modalCenter" tabIndex={-1} aria-hidden="true">
            <div className="modal-dialog modal-lg modal-dialog-centered" role="document">
                <div className="modal-content">
                    <div className="modal-header">
                        <h4 className="modal-title" id="modalCenterTitle">Crear Cuenta Contable</h4>
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
                            {/* Selección de PUC */}
                            <div className="row">
                                <div className="col mb-6 mt-2">
                                    <InputSelectModal
                                        id="pucId"
                                        label="Cuenta PUC"
                                        value={cuentaContable.puc_id}
                                        onChange={(value) => {
                                            setCuentaContable({
                                                ...cuentaContable,
                                                puc_id: parseInt(value) || '',
                                            });
                                        }}
                                        error={errors.puc_id}
                                        placeholder="Cuenta PUC"
                                        options={[]}
                                        required={true}
                                        url={['api', 'v1', 'chart-of-accounts', 'search']}
                                    />
                                </div>
                            </div>

                            {/* Nombre Personalizado */}
                            <div className="row">
                                <div className="col mb-6 mt-2">
                                    <InputModal
                                        type="text"
                                        id="customName"
                                        label="Nombre Personalizado"
                                        value={cuentaContable.custom_name}
                                        onChange={(e) => setCuentaContable({ 
                                            ...cuentaContable, 
                                            custom_name: e.target.value 
                                        })}
                                        error={errors.custom_name}
                                        placeholder="Ej: Caja general"
                                        maxLength={50}
                                        required={true}
                                    />
                                </div>
                            </div>

                            {/* Moneda Base */}
                            <div className="row">
                                <div className="col mb-6 mt-2">
                                    <InputSelectModal
                                        id="baseCurrency"
                                        label="Moneda Base"
                                        value={cuentaContable.currency_type_id}
                                        onChange={(value) => setCuentaContable({ 
                                            ...cuentaContable, 
                                            currency_type_id: value 
                                        })}
                                        error={errors.currency_type_id}
                                        placeholder="Seleccionar moneda"
                                        options={currencies.map(currency => ({
                                            id: currency.id,
                                            label: `${currency.name} (${currency.isoCode})`
                                        }))}
                                        required={true}
                                    />
                                </div>
                            </div>

                            {/* Centro de Costos (Opcional) */}
                            <div className="row">
                                <div className="col mb-6 mt-2">
                                    <InputSelectModal
                                        id="costCenterId"
                                        label="Centro de Costos"
                                        value={cuentaContable.cost_center_id}
                                        onChange={(value) => setCuentaContable({ 
                                            ...cuentaContable, 
                                            cost_center_id: parseInt(value) || null
                                        })}
                                        error={errors.cost_center_id}
                                        placeholder="Seleccionar centro de costos (opcional)"
                                        options={costCenters.map(center => ({
                                            id: center.id,
                                            label: `${center.code} - ${center.name}`
                                        }))}
                                        required={true}
                                    />
                                </div>
                            </div>

                            {/* Regla de Depreciación (Opcional) */}
                            {/* <div className="row">
                                <div className="col mb-6 mt-2">
                                    <InputSelectModal
                                        id="depreciationRuleId"
                                        label="Regla de Depreciación"
                                        value={cuentaContable.depreciation_rule_id}
                                        onChange={(value) => setCuentaContable({ 
                                            ...cuentaContable, 
                                            depreciation_rule_id: parseInt(value) || null
                                        })}
                                        error={errors.depreciation_rule_id}
                                        placeholder="Seleccionar regla de depreciación (opcional)"
                                        options={depreciationRules.map(rule => ({
                                            id: rule.id,
                                            label: rule.name
                                        }))}
                                        clearable={true}
                                    />
                                </div>
                            </div> */}

                            {/* Naturaleza */}
                            <div className="row">
                                <div className="col mb-6 mt-2">
                                    <InputSelectModal
                                        id="nature"
                                        label="Naturaleza de la Cuenta"
                                        value={cuentaContable.nature}
                                        onChange={(value) => setCuentaContable({ 
                                            ...cuentaContable, 
                                            nature: value 
                                        })}
                                        error={errors.nature}
                                        placeholder="Seleccionar naturaleza"
                                        options={[
                                            { id: 'DEBIT', label: 'Deudora' },
                                            { id: 'CREDIT', label: 'Acreedora' }
                                        ]}
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
                            {loading ? 'Guardando...' : 'Crear Cuenta'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </>;
};

export default CreateCuentaContable;
