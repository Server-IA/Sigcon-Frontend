//a
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
        pucId: false,
        costCenterId: false,
        depreciationRuleId: false,
        customName: false,
    });

    // Cargar datos de selecciones
    useEffect(() => {
        const loadData = async () => {
            try {
                // Cargar PUC
                const pucUrl = base_url(['api', 'puc-catalog']);
                const pucResponse = await fetchHelper.get(pucUrl, {}, 0);
                setPucs(pucResponse.data || []);

                // Cargar Monedas
                const currencyUrl = base_url(['api', 'currencies']);
                const currencyResponse = await fetchHelper.get(currencyUrl, {}, 0);
                setCurrencies(currencyResponse.data || []);

                // Cargar Centros de Costos
                const costCenterUrl = base_url(['api', 'cost-centers']);
                const costCenterResponse = await fetchHelper.get(costCenterUrl, {}, 0);
                setCostCenters(costCenterResponse.data || []);

                // Cargar Reglas de Depreciación
                const depRuleUrl = base_url(['api', 'depreciation-rules']);
                const depRuleResponse = await fetchHelper.get(depRuleUrl, {}, 0);
                setDepreciationRules(depRuleResponse.data || []);
            } catch (error) {
                console.error('Error cargando datos:', error);
            }
        };
        loadData();
    }, []);

    // Actualizar estado cuando cambia la cuenta
    useEffect(() => {
        setCuentaUpdated(cuentaContable);
        // Verificar si hay transacciones y deshabilitar campos
        checkReadOnlyFields();
    }, [cuentaContable]);

    const checkReadOnlyFields = async () => {
        if (!cuentaContable.id) return;
        
        try {
            // Aquí se haría una llamada al backend para verificar si hay transacciones
            // Por ahora, asumimos que el backend retorna esta información
            const url = base_url(['api', 'accounting-accounts', cuentaContable.id, 'readonly-fields']);
            const response = await fetchHelper.get(url, {}, 0);
            setReadOnlyFields(response.data || {});
        } catch (error) {
            console.error('Error verificando campos de solo lectura:', error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validar campos obligatorios
        if (!cuentaUpdated.pucId) {
            setErrorMessage('Por favor seleccione una cuenta PUC');
            return;
        }
        if (!cuentaUpdated.customName || cuentaUpdated.customName.trim() === '') {
            setErrorMessage('El nombre personalizado de la cuenta es obligatorio');
            return;
        }
        if (!cuentaUpdated.baseCurrency) {
            setErrorMessage('Por favor seleccione una moneda base');
            return;
        }
        if (!cuentaUpdated.nature) {
            setErrorMessage('Por favor seleccione la naturaleza de la cuenta');
            return;
        }

        // Validar formato del nombre
        const nameRegex = /^[a-zA-Z0-9\s\-_]{1,50}$/;
        if (!nameRegex.test(cuentaUpdated.customName)) {
            setErrorMessage('El nombre debe tener entre 1 y 50 caracteres, solo alfanuméricos, espacios, guiones y guiones bajos');
            return;
        }

        const url = base_url(['api', 'accounting-accounts', cuentaContable.id]);
        try {
            setLoading(true);
            await fetchHelper.put(url, cuentaUpdated, {}, 1000);
            
            setCuentaContable({
                id: '',
                pucId: '',
                pucCode: '',
                customName: '',
                baseCurrency: '',
                costCenterId: '',
                depreciationRuleId: '',
                nature: '',
                status: 'ACTIVE',
                companyId: '',
            });
            
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

                            {/* Código PUC (Solo lectura si hay transacciones) */}
                            <div className="row">
                                <div className="col mb-6 mt-2">
                                    {renderFieldWithTooltip(
                                        readOnlyFields.pucId,
                                        <InputSelectModal
                                            id="edit_pucId"
                                            label="Cuenta PUC"
                                            value={cuentaUpdated.pucId}
                                            onChange={(value) => {
                                                const selectedPuc = pucs.find(p => p.id === parseInt(value));
                                                setCuentaUpdated({
                                                    ...cuentaUpdated,
                                                    pucId: parseInt(value) || '',
                                                    pucCode: selectedPuc?.code || ''
                                                });
                                            }}
                                            error={errors.pucId}
                                            placeholder="Seleccionar cuenta PUC"
                                            options={pucs.map(puc => ({
                                                id: puc.id,
                                                label: `${puc.code} - ${puc.name}`
                                            }))}
                                            required={true}
                                        />
                                    )}
                                </div>
                            </div>

                            {/* Nombre Personalizado (Solo lectura si hay transacciones) */}
                            <div className="row">
                                <div className="col mb-6 mt-2">
                                    {renderFieldWithTooltip(
                                        readOnlyFields.customName,
                                        <InputModal
                                            type="text"
                                            id="edit_customName"
                                            label="Nombre Personalizado"
                                            value={cuentaUpdated.customName}
                                            onChange={(e) => setCuentaUpdated({ 
                                                ...cuentaUpdated, 
                                                customName: e.target.value 
                                            })}
                                            error={errors.customName}
                                            placeholder="Ej: Caja general"
                                            disabled={readOnlyFields.customName}
                                            required={true}
                                        />
                                    )}
                                </div>
                            </div>

                            {/* Moneda Base */}
                            <div className="row">
                                <div className="col mb-6 mt-2">
                                    <InputSelectModal
                                        id="edit_baseCurrency"
                                        label="Moneda Base"
                                        value={cuentaUpdated.baseCurrency}
                                        onChange={(value) => setCuentaUpdated({ 
                                            ...cuentaUpdated, 
                                            baseCurrency: value 
                                        })}
                                        error={errors.baseCurrency}
                                        placeholder="Seleccionar moneda"
                                        options={currencies.map(currency => ({
                                            id: currency.code,
                                            label: `${currency.name} (${currency.code})`
                                        }))}
                                        required={true}
                                    />
                                </div>
                            </div>

                            {/* Centro de Costos (Solo lectura si hay transacciones) */}
                            <div className="row">
                                <div className="col mb-6 mt-2">
                                    {renderFieldWithTooltip(
                                        readOnlyFields.costCenterId,
                                        <InputSelectModal
                                            id="edit_costCenterId"
                                            label="Centro de Costos"
                                            value={cuentaUpdated.costCenterId}
                                            onChange={(value) => setCuentaUpdated({ 
                                                ...cuentaUpdated, 
                                                costCenterId: value 
                                            })}
                                            error={errors.costCenterId}
                                            placeholder="Seleccionar centro de costos"
                                            options={costCenters.map(center => ({
                                                id: center.id,
                                                name: center.name
                                            }))}
                                            clearable={true}
                                        />
                                    )}
                                </div>
                            </div>

                            {/* Regla de Depreciación (Solo lectura si hay transacciones) */}
                            <div className="row">
                                <div className="col mb-6 mt-2">
                                    {renderFieldWithTooltip(
                                        readOnlyFields.depreciationRuleId,
                                        <InputSelectModal
                                            id="edit_depreciationRuleId"
                                            label="Regla de Depreciación"
                                            value={cuentaUpdated.depreciationRuleId}
                                            onChange={(value) => setCuentaUpdated({ 
                                                ...cuentaUpdated, 
                                                depreciationRuleId: value 
                                            })}
                                            error={errors.depreciationRuleId}
                                            placeholder="Seleccionar regla de depreciación"
                                            options={depreciationRules.map(rule => ({
                                                id: rule.id,
                                                name: rule.name
                                            }))}
                                            clearable={true}
                                        />
                                    )}
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
                                        options={[
                                            { id: 'DEUDORA', label: 'Deudora' },
                                            { id: 'ACREEDORA', label: 'Acreedora' }
                                        ]}
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
