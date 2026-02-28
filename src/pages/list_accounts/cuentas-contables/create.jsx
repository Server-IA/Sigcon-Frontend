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
    const [loading, setLoading] = useState(false);

    const initialState = {
        id: '',
        code: '',
        name: '',
        accountClass: '',
        level: '',
        nature: '',
        status: 'ACTIVE',
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validar campos obligatorios
        if (!cuentaContable.code || cuentaContable.code.trim() === '') {
            setErrorMessage('Por favor diligencie el código de la cuenta');
            return;
        }
        if (!cuentaContable.name || cuentaContable.name.trim() === '') {
            setErrorMessage('Por favor diligencie el nombre de la cuenta');
            return;
        }
        if (!cuentaContable.accountClass) {
            setErrorMessage('Por favor seleccione la clase de la cuenta');
            return;
        }
        if (!cuentaContable.level) {
            setErrorMessage('Por favor seleccione el nivel jerárquico');
            return;
        }
        if (!cuentaContable.nature) {
            setErrorMessage('Por favor seleccione la naturaleza de la cuenta');
            return;
        }

        // Validar formato del código (solo números, máximo 10 dígitos)
        const codeRegex = /^[0-9]{1,10}$/;
        if (!codeRegex.test(cuentaContable.code.trim())) {
            setErrorMessage('El código debe contener solo números (máximo 10 dígitos)');
            return;
        }

        // Validar formato del nombre
        const nameRegex = /^[A-Za-z0-9_\-\s]{1,100}$/;
        if (!nameRegex.test(cuentaContable.name.trim())) {
            setErrorMessage('El nombre debe tener entre 1 y 100 caracteres, solo alfanuméricos, espacios, guiones y guiones bajos');
            return;
        }

        // Construir CreateChartOfAccountDTO según swagger
        const requestBody = {
            code: cuentaContable.code.trim(),
            name: cuentaContable.name.trim(),
            accountClass: cuentaContable.accountClass,
            level: cuentaContable.level,
            nature: cuentaContable.nature,
        };

        // POST /api/v1/chart-of-accounts → 201 Created
        const url = base_url(['api', 'v1', 'chart-of-accounts']);
        try {
            setLoading(true);
            await fetchHelper.post(url, requestBody, {}, 1000);
            
            setCuentaContable(initialState);
            
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
            console.error('Error POST /api/v1/chart-of-accounts:', error);
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
                setErrorMessage('Error al crear la cuenta contable');
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
                            {/* Código de la Cuenta — swagger: pattern ^[0-9]{1,10}$ */}
                            <div className="row">
                                <div className="col mb-6 mt-2">
                                    <InputModal
                                        type="text"
                                        id="create_code"
                                        label="Código de la Cuenta"
                                        value={cuentaContable.code}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 10);
                                            setCuentaContable({ ...cuentaContable, code: val });
                                        }}
                                        error={errors.code}
                                        placeholder="Ej: 110505"
                                        required={true}
                                        maxLength={10}
                                        inputMode="numeric"
                                        pattern="^[0-9]{1,10}$"
                                    />
                                </div>
                            </div>

                            {/* Nombre de la Cuenta — swagger: pattern ^[A-Za-z0-9_\-\s]{1,100}$ */}
                            <div className="row">
                                <div className="col mb-6 mt-2">
                                    <InputModal
                                        type="text"
                                        id="create_name"
                                        label="Nombre de la Cuenta"
                                        value={cuentaContable.name}
                                        onChange={(e) => setCuentaContable({ 
                                            ...cuentaContable, 
                                            name: e.target.value 
                                        })}
                                        error={errors.name}
                                        placeholder="Ej: Caja General"
                                        required={true}
                                        maxLength={100}
                                        pattern="^[A-Za-z0-9_\-\s]{1,100}$"
                                    />
                                </div>
                            </div>

                            {/* Clase Contable */}
                            <div className="row">
                                <div className="col mb-6 mt-2">
                                    <InputSelectModal
                                        id="create_accountClass"
                                        label="Clase Contable"
                                        value={cuentaContable.accountClass}
                                        onChange={(value) => setCuentaContable({ 
                                            ...cuentaContable, 
                                            accountClass: value 
                                        })}
                                        error={errors.accountClass}
                                        placeholder="Seleccionar clase"
                                        options={ACCOUNT_CLASS_OPTIONS}
                                        required={true}
                                    />
                                </div>
                            </div>

                            {/* Nivel Jerárquico */}
                            <div className="row">
                                <div className="col mb-6 mt-2">
                                    <InputSelectModal
                                        id="create_level"
                                        label="Nivel Jerárquico"
                                        value={cuentaContable.level}
                                        onChange={(value) => setCuentaContable({ 
                                            ...cuentaContable, 
                                            level: value 
                                        })}
                                        error={errors.level}
                                        placeholder="Seleccionar nivel"
                                        options={ACCOUNT_LEVEL_OPTIONS}
                                        required={true}
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
                                        options={NATURE_OPTIONS}
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
