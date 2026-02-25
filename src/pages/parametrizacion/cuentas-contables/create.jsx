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
    const [pucs, setPucs] = useState([]);
    const [currencies, setCurrencies] = useState([]);
    const [costCenters, setCostCenters] = useState([]);
    const [depreciationRules, setDepreciationRules] = useState([]);
    const [loading, setLoading] = useState(false);

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

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validar campos obligatorios
        if (!cuentaContable.pucId) {
            setErrorMessage('Por favor seleccione una cuenta PUC');
            return;
        }
        if (!cuentaContable.customName || cuentaContable.customName.trim() === '') {
            setErrorMessage('El nombre personalizado de la cuenta es obligatorio');
            return;
        }
        if (!cuentaContable.baseCurrency) {
            setErrorMessage('Por favor seleccione una moneda base');
            return;
        }
        if (!cuentaContable.nature) {
            setErrorMessage('Por favor seleccione la naturaleza de la cuenta');
            return;
        }

        // Validar formato del nombre
        const nameRegex = /^[a-zA-Z0-9\s\-_]{1,50}$/;
        if (!nameRegex.test(cuentaContable.customName)) {
            setErrorMessage('El nombre debe tener entre 1 y 50 caracteres, solo alfanuméricos, espacios, guiones y guiones bajos');
            return;
        }

        const url = base_url(['api', 'accounting-accounts']);
        try {
            setLoading(true);
            await fetchHelper.post(url, cuentaContable, {}, 1000);
            
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
                        />

                        <form onSubmit={handleSubmit}>
                            {/* Selección de PUC */}
                            <div className="row">
                                <div className="col mb-6 mt-2">
                                    <InputSelectModal
                                        id="create_pucId"
                                        label="Cuenta PUC"
                                        value={cuentaContable.pucId}
                                        onChange={(value) => {
                                            const selectedPuc = pucs.find(p => p.id === parseInt(value));
                                            setCuentaContable({
                                                ...cuentaContable,
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
                                </div>
                            </div>

                            {/* Nombre Personalizado */}
                            <div className="row">
                                <div className="col mb-6 mt-2">
                                    <InputModal
                                        type="text"
                                        id="create_customName"
                                        label="Nombre Personalizado"
                                        value={cuentaContable.customName}
                                        onChange={(e) => setCuentaContable({ 
                                            ...cuentaContable, 
                                            customName: e.target.value 
                                        })}
                                        error={errors.customName}
                                        placeholder="Ej: Caja general"
                                        required={true}
                                    />
                                </div>
                            </div>

                            {/* Moneda Base */}
                            <div className="row">
                                <div className="col mb-6 mt-2">
                                    <InputSelectModal
                                        id="create_baseCurrency"
                                        label="Moneda Base"
                                        value={cuentaContable.baseCurrency}
                                        onChange={(value) => setCuentaContable({ 
                                            ...cuentaContable, 
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

                            {/* Centro de Costos (Opcional) */}
                            <div className="row">
                                <div className="col mb-6 mt-2">
                                    <InputSelectModal
                                        id="create_costCenterId"
                                        label="Centro de Costos"
                                        value={cuentaContable.costCenterId}
                                        onChange={(value) => setCuentaContable({ 
                                            ...cuentaContable, 
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
                                </div>
                            </div>

                            {/* Regla de Depreciación (Opcional) */}
                            <div className="row">
                                <div className="col mb-6 mt-2">
                                    <InputSelectModal
                                        id="create_depreciationRuleId"
                                        label="Regla de Depreciación"
                                        value={cuentaContable.depreciationRuleId}
                                        onChange={(value) => setCuentaContable({ 
                                            ...cuentaContable, 
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
                                </div>
                            </div>

                            {/* Naturaleza */}
                            <div className="row">
                                <div className="col mb-6 mt-2">
                                    <InputSelectModal
                                        id="create_nature"
                                        label="Naturaleza de la Cuenta"
                                        value={cuentaContable.nature}
                                        onChange={(value) => setCuentaContable({ 
                                            ...cuentaContable, 
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
