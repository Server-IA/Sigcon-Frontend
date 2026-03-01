import '../../../styles/vendor/animate-css/animate.css'
import { base_url } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';
import { useEffect, useState } from 'react';
import AlertPage from '../../../components/molecules/AlertPage';
import InputModal from '../../../components/molecules/InputModal';
import InputSelectModal from '../../../components/molecules/inputSelectModal';

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
    const [pucs, setPucs] = useState([]);
    const [currencies, setCurrencies] = useState([]);
    const [costCenters, setCostCenters] = useState([]);
    const [depreciationRules, setDepreciationRules] = useState([]);
    const [loading, setLoading] = useState(false);
    const [cuentaUpdated, setCuentaUpdated] = useState(cuentaContable);
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
        const dtBody = { length: -1, columns: [{data:'status', search: {value: 'ACTIVE', regex: false}}] };
        const loadData = async () => {
            // Promise.allSettled: a 403 on one endpoint won't block the others
            const [pucRes, currRes, ccRes] = await Promise.allSettled([
                fetchHelper.post(base_url(['api', 'v1', 'chart-of-accounts', 'search']), dtBody, {}, 0),
                fetchHelper.post(base_url(['api', 'v1', 'accounting-lists', 'currency-types', 'search']), dtBody, {}, 0),
                fetchHelper.post(base_url(['api', 'v1', 'cost-centers', 'search']), dtBody, {}, 0),
                // fetchHelper.post(base_url(['api', 'v1', 'depretation-rules', 'search']), dtBody, {}, 0),
            ]);
            if (pucRes.status === 'fulfilled')  setPucs(pucRes.value.data || []);
            if (currRes.status === 'fulfilled') setCurrencies(currRes.value.data || []);
            if (ccRes.status === 'fulfilled')   setCostCenters(ccRes.value.data || []);
            // if (drRes.status === 'fulfilled')   setDepreciationRules(drRes.value.data || []);
            const failed = [pucRes, currRes, ccRes].filter(r => r.status === 'rejected');
            if (failed.length) console.warn('Algunos datos no pudieron cargarse:', failed.map(f => f.reason));
        };
        loadData();
    }, []);

    // Sync local state when the selected account changes
    useEffect(() => {
        setCuentaUpdated(cuentaContable);
    }, [cuentaContable]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validar campos obligatorios (swagger UpdateAccountingAccountRequest)
        if (!cuentaUpdated.puc_id) {
            setErrors({ ...errors, puc_id: 'Por favor seleccione una cuenta PUC' });
            return;
        }
        if (!cuentaUpdated.custom_name || cuentaUpdated.custom_name.trim() === '') {
            setErrors({ ...errors, custom_name: 'El nombre personalizado de la cuenta es obligatorio' });
            return;
        }
        if (!cuentaUpdated.currency_type_id) {
            setErrors({ ...errors, currency_type_id: 'Por favor seleccione una moneda base' });
            return;
        }
        if (!cuentaUpdated.cost_center_id) {
            setErrors({ ...errors, cost_center_id: 'Por favor seleccione un centro de costos' });
            return;
        }
        if (!cuentaUpdated.nature) {
            setErrors({ ...errors, nature: 'Por favor seleccione la naturaleza de la cuenta' });
            return;
        }
        if (!cuentaUpdated.status) {
            setErrors({ ...errors, status: 'Por favor seleccione el estado de la cuenta' });
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
            currency_type_id: cuentaUpdated.currency_type_id,
            cost_center_id: cuentaUpdated.cost_center_id || null,
            tax_rule_id: cuentaUpdated.tax_rule_id || null,
            nature: cuentaUpdated.nature,
            status: cuentaUpdated.status,
        };
        try {
            setLoading(true);
            await fetchHelper.put(updateUrl, body, {}, 1000);
            
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

    const renderFieldWithTooltip = (readOnly, children) => {
        if (readOnly) {
            return (
                <div 
                    style={{ 
                        position: 'relative',
                        opacity: 0.7
                    }}
                    data-bs-toggle="tooltip" 
                    data-bs-placement="top" 
                    title="Este campo no se puede modificar porque la cuenta tiene transacciones registradas"
                >
                    {children}
                </div>
            );
        }
        return children;
    };

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

                            {/* Código PUC (Solo lectura si hay transacciones) */}
                            <div className="row">
                                <div className="col mb-6 mt-2">
                                    {renderFieldWithTooltip(
                                        readOnlyFields.puc_id,
                                        <InputSelectModal
                                            id="pucId_updated"
                                            label="Cuenta PUC"
                                            value={cuentaUpdated.puc_id}
                                            onChange={(value) => {
                                                setCuentaUpdated({
                                                    ...cuentaUpdated,
                                                    puc_id: parseInt(value) || ''
                                                });
                                                setErrors({ ...errors, puc_id: null });
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
                                </div>
                            </div>

                            {/* Nombre Personalizado (Solo lectura si hay transacciones) */}
                            <div className="row">
                                <div className="col mb-6 mt-2">
                                    {renderFieldWithTooltip(
                                        readOnlyFields.custom_name,
                                        <InputModal
                                            type="text"
                                            id="customName_updated"
                                            label="Nombre Personalizado"
                                            value={cuentaUpdated.custom_name}
                                            onChange={(e) => {
                                                setCuentaUpdated({ 
                                                    ...cuentaUpdated, 
                                                    custom_name: e.target.value 
                                                });
                                                setErrors({ ...errors, custom_name: null });
                                            }}
                                            error={errors.custom_name}
                                            placeholder="Ej: Caja general"
                                            maxLength={50}
                                            disabled={readOnlyFields.custom_name}
                                            required={true}
                                        />
                                    )}
                                </div>
                            </div>

                            {/* Moneda Base */}
                            <div className="row">
                                <div className="col mb-6 mt-2">
                                    <InputSelectModal
                                        id="baseCurrency_updated"
                                        label="Moneda Base"
                                        value={cuentaUpdated.currency_type_id}
                                        onChange={(value) => setCuentaUpdated({ 
                                            ...cuentaUpdated, 
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

                            {/* Centro de Costos (Solo lectura si hay transacciones) */}
                            <div className="row">
                                <div className="col mb-6 mt-2">
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
                                            required={true}
                                            disabled={readOnlyFields.cost_center_id}
                                        />
                                    )}
                                </div>
                            </div>

                            {/* Regla de Depreciación (Solo lectura si hay transacciones) */}
                            {/* <div className="row">
                                <div className="col mb-6 mt-2">
                                    {renderFieldWithTooltip(
                                        readOnlyFields.depreciation_rule_id,
                                        <InputSelectModal
                                            id="depreciationRuleId_updated"
                                            label="Regla de Depreciación"
                                            value={cuentaUpdated.depreciation_rule_id}
                                            onChange={(value) => setCuentaUpdated({ 
                                                ...cuentaUpdated, 
                                                tax_rule_id: parseInt(value) || null
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
                                </div>
                            </div> */}

                            {/* Naturaleza */}
                            <div className="row">
                                <div className="col mb-6 mt-2">
                                    <InputSelectModal
                                        id="nature_updated"
                                        label="Naturaleza de la Cuenta"
                                        value={cuentaUpdated.nature}
                                        onChange={(value) => setCuentaUpdated({ 
                                            ...cuentaUpdated, 
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

                            {/* Estado */}
                            <div className="row">
                                <div className="col mb-6 mt-2">
                                    <InputSelectModal
                                        id="status_updated"
                                        label="Estado"
                                        value={cuentaUpdated.status}
                                        onChange={(value) => setCuentaUpdated({ 
                                            ...cuentaUpdated, 
                                            status: value 
                                        })}
                                        error={errors.status}
                                        placeholder="Seleccionar estado"
                                        options={[
                                            { id: 'ACTIVE', label: 'Activa' },
                                            { id: 'INACTIVE', label: 'Inactiva' }
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
                            {loading ? 'Guardando...' : 'Guardar Cambios'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </>;
};

export default UpdatedCuentaContable;
