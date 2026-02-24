import '../../../styles/vendor/animate-css/animate.css'
import { base_url } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';
import { useEffect, useState } from 'react';
import AlertPage from '../../../components/molecules/AlertPage';

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
                            <div className="row mb-3">
                                <div className="col-12">
                                    <label htmlFor="id" className="form-label">
                                        ID de Cuenta
                                    </label>
                                    <input
                                        type="text"
                                        id="id"
                                        className="form-control"
                                        value={cuentaUpdated.id}
                                        disabled
                                        style={{ backgroundColor: '#f0f0f0' }}
                                    />
                                </div>
                            </div>

                            {/* Código PUC (Solo lectura si hay transacciones) */}
                            <div className="row mb-3">
                                <div className="col-12">
                                    <label htmlFor="pucId" className="form-label">
                                        Cuenta PUC <span className="text-danger">*</span>
                                    </label>
                                    {renderFieldWithTooltip(
                                        readOnlyFields.pucId,
                                        <select
                                            id="pucId"
                                            className={`form-control ${errors.pucId ? 'is-invalid' : ''}`}
                                            value={cuentaUpdated.pucId}
                                            onChange={(e) => {
                                                const selectedPuc = pucs.find(p => p.id === parseInt(e.target.value));
                                                setCuentaUpdated({
                                                    ...cuentaUpdated,
                                                    pucId: parseInt(e.target.value),
                                                    pucCode: selectedPuc?.code || ''
                                                });
                                            }}
                                            disabled={readOnlyFields.pucId}
                                            style={readOnlyFields.pucId ? { backgroundColor: '#f0f0f0' } : {}}
                                        >
                                            <option value="">-- Seleccionar cuenta PUC --</option>
                                            {pucs.map(puc => (
                                                <option key={puc.id} value={puc.id}>
                                                    {puc.code} - {puc.name}
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                    {errors.pucId && <div className="invalid-feedback d-block">{errors.pucId}</div>}
                                </div>
                            </div>

                            {/* Nombre Personalizado (Solo lectura si hay transacciones) */}
                            <div className="row mb-3">
                                <div className="col-12">
                                    <label htmlFor="customName" className="form-label">
                                        Nombre Personalizado <span className="text-danger">*</span>
                                    </label>
                                    {renderFieldWithTooltip(
                                        readOnlyFields.customName,
                                        <input
                                            type="text"
                                            id="customName"
                                            className={`form-control ${errors.customName ? 'is-invalid' : ''}`}
                                            placeholder="Ej: Caja general"
                                            value={cuentaUpdated.customName}
                                            onChange={(e) => setCuentaUpdated({ 
                                                ...cuentaUpdated, 
                                                customName: e.target.value 
                                            })}
                                            maxLength={50}
                                            disabled={readOnlyFields.customName}
                                            style={readOnlyFields.customName ? { backgroundColor: '#f0f0f0' } : {}}
                                        />
                                    )}
                                    {errors.customName && <div className="invalid-feedback d-block">{errors.customName}</div>}
                                </div>
                            </div>

                            {/* Moneda Base */}
                            <div className="row mb-3">
                                <div className="col-12">
                                    <label htmlFor="baseCurrency" className="form-label">
                                        Moneda Base <span className="text-danger">*</span>
                                    </label>
                                    <select
                                        id="baseCurrency"
                                        className={`form-control ${errors.baseCurrency ? 'is-invalid' : ''}`}
                                        value={cuentaUpdated.baseCurrency}
                                        onChange={(e) => setCuentaUpdated({ 
                                            ...cuentaUpdated, 
                                            baseCurrency: e.target.value 
                                        })}
                                    >
                                        <option value="">-- Seleccionar moneda --</option>
                                        {currencies.map(currency => (
                                            <option key={currency.id} value={currency.code}>
                                                {currency.name} ({currency.code})
                                            </option>
                                        ))}
                                    </select>
                                    {errors.baseCurrency && <div className="invalid-feedback d-block">{errors.baseCurrency}</div>}
                                </div>
                            </div>

                            {/* Centro de Costos (Solo lectura si hay transacciones) */}
                            <div className="row mb-3">
                                <div className="col-12">
                                    <label htmlFor="costCenterId" className="form-label">
                                        Centro de Costos (Opcional)
                                    </label>
                                    {renderFieldWithTooltip(
                                        readOnlyFields.costCenterId,
                                        <select
                                            id="costCenterId"
                                            className={`form-control ${errors.costCenterId ? 'is-invalid' : ''}`}
                                            value={cuentaUpdated.costCenterId}
                                            onChange={(e) => setCuentaUpdated({ 
                                                ...cuentaUpdated, 
                                                costCenterId: e.target.value 
                                            })}
                                            disabled={readOnlyFields.costCenterId}
                                            style={readOnlyFields.costCenterId ? { backgroundColor: '#f0f0f0' } : {}}
                                        >
                                            <option value="">-- Seleccionar centro de costos --</option>
                                            {costCenters.map(center => (
                                                <option key={center.id} value={center.id}>
                                                    {center.name}
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                    {errors.costCenterId && <div className="invalid-feedback d-block">{errors.costCenterId}</div>}
                                </div>
                            </div>

                            {/* Regla de Depreciación (Solo lectura si hay transacciones) */}
                            <div className="row mb-3">
                                <div className="col-12">
                                    <label htmlFor="depreciationRuleId" className="form-label">
                                        Regla de Depreciación (Opcional)
                                    </label>
                                    {renderFieldWithTooltip(
                                        readOnlyFields.depreciationRuleId,
                                        <select
                                            id="depreciationRuleId"
                                            className={`form-control ${errors.depreciationRuleId ? 'is-invalid' : ''}`}
                                            value={cuentaUpdated.depreciationRuleId}
                                            onChange={(e) => setCuentaUpdated({ 
                                                ...cuentaUpdated, 
                                                depreciationRuleId: e.target.value 
                                            })}
                                            disabled={readOnlyFields.depreciationRuleId}
                                            style={readOnlyFields.depreciationRuleId ? { backgroundColor: '#f0f0f0' } : {}}
                                        >
                                            <option value="">-- Seleccionar regla de depreciación --</option>
                                            {depreciationRules.map(rule => (
                                                <option key={rule.id} value={rule.id}>
                                                    {rule.name}
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                    {errors.depreciationRuleId && <div className="invalid-feedback d-block">{errors.depreciationRuleId}</div>}
                                </div>
                            </div>

                            {/* Naturaleza */}
                            <div className="row mb-3">
                                <div className="col-12">
                                    <label htmlFor="nature" className="form-label">
                                        Naturaleza de la Cuenta <span className="text-danger">*</span>
                                    </label>
                                    <select
                                        id="nature"
                                        className={`form-control ${errors.nature ? 'is-invalid' : ''}`}
                                        value={cuentaUpdated.nature}
                                        onChange={(e) => setCuentaUpdated({ 
                                            ...cuentaUpdated, 
                                            nature: e.target.value 
                                        })}
                                    >
                                        <option value="">-- Seleccionar naturaleza --</option>
                                        <option value="DEUDORA">Deudora</option>
                                        <option value="ACREEDORA">Acreedora</option>
                                    </select>
                                    {errors.nature && <div className="invalid-feedback d-block">{errors.nature}</div>}
                                </div>
                            </div>

                            {/* Estado */}
                            <div className="row mb-3">
                                <div className="col-12">
                                    <label htmlFor="status" className="form-label">
                                        Estado <span className="text-danger">*</span>
                                    </label>
                                    <select
                                        id="status"
                                        className={`form-control ${errors.status ? 'is-invalid' : ''}`}
                                        value={cuentaUpdated.status}
                                        onChange={(e) => setCuentaUpdated({ 
                                            ...cuentaUpdated, 
                                            status: e.target.value 
                                        })}
                                    >
                                        <option value="ACTIVE">Activa</option>
                                        <option value="INACTIVE">Inactiva</option>
                                    </select>
                                    {errors.status && <div className="invalid-feedback d-block">{errors.status}</div>}
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
