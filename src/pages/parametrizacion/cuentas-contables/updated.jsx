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

    const initialState = {
        id: '',
        code: '',
        name: '',
        accountClass: '',
        level: '',
        nature: '',
        status: 'ACTIVE',
    };

    // Actualizar estado cuando cambia la cuenta
    useEffect(() => {
        setCuentaUpdated(cuentaContable);
    }, [cuentaContable]);

    const handleSubmit = async (e) => {
        e.preventDefault();

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
            return;
        }
        if (!cuentaUpdated.nature) {
            setErrorMessage('Por favor seleccione la naturaleza de la cuenta');
            return;
        }
        if (!cuentaUpdated.status) {
            setErrorMessage('Por favor seleccione el estado de la cuenta');
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

        const requestBody = {
            code: cuentaUpdated.code.trim(),
            name: cuentaUpdated.name.trim(),
            accountClass: cuentaUpdated.accountClass,
            level: cuentaUpdated.level,
            nature: cuentaUpdated.nature,
            status: cuentaUpdated.status,
        };

        const url = base_url(['api', 'v1', 'chart-of-accounts', cuentaContable.id]);
        try {
            setLoading(true);
            await fetchHelper.put(url, requestBody, {}, 1000);
            
            setCuentaContable(initialState);
            
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

                            {/* Código de la Cuenta */}
                            <div className="row">
                                <div className="col mb-6 mt-2">
                                    <InputModal
                                        type="text"
                                        id="edit_code"
                                        label="Código de la Cuenta"
                                        value={cuentaUpdated.code}
                                        onChange={(e) => setCuentaUpdated({ 
                                            ...cuentaUpdated, 
                                            code: e.target.value 
                                        })}
                                        error={errors.code}
                                        placeholder="Ej: 110505"
                                        required={true}
                                    />
                                </div>
                            </div>

                            {/* Nombre de la Cuenta */}
                            <div className="row">
                                <div className="col mb-6 mt-2">
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
                                    />
                                </div>
                            </div>

                            {/* Clase Contable */}
                            <div className="row">
                                <div className="col mb-6 mt-2">
                                    <InputSelectModal
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
                                        required={true}
                                    />
                                </div>
                            </div>

                            {/* Nivel Jerárquico */}
                            <div className="row">
                                <div className="col mb-6 mt-2">
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
                                        options={NATURE_OPTIONS}
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
