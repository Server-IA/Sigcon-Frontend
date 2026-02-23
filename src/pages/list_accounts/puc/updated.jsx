import '../../../styles/vendor/animate-css/animate.css';
import { base_url } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';
import { useEffect, useState } from 'react';
import AlertPage from '../../../components/molecules/AlertPage';

const ACCOUNT_CLASSES = [
    { id: 'ASSET',              label: 'Activo' },
    { id: 'LIABILITY',          label: 'Pasivo' },
    { id: 'EQUITY',             label: 'Patrimonio' },
    { id: 'INCOME',             label: 'Ingresos' },
    { id: 'EXPENSE',            label: 'Gastos' },
    { id: 'COST_OF_SALES',      label: 'Costos de venta' },
    { id: 'COST_OF_PRODUCTION', label: 'Costos de producción o de operación' },
    { id: 'ORDER_DEBIT',        label: 'Cuentas de orden deudoras' },
    { id: 'ORDER_CREDIT',       label: 'Cuentas de orden acreedoras' },
];

const HIERARCHY_LEVELS = [
    { id: 'GROUP',    label: 'Grupo' },
    { id: 'SUBGROUP', label: 'Subgrupo' },
];

const ACCOUNT_NATURES = [
    { id: 'DEBIT',  label: 'Deudora' },
    { id: 'CREDIT', label: 'Acreedora' },
];

const ACCOUNT_STATUSES = [
    { id: 'ACTIVE',   label: 'Activa' },
    { id: 'INACTIVE', label: 'Inactiva' },
];

const UpdatedPUC = ({ modalRef, modalInstance, account, setAccount, dataTableRef, setMessage }) => {

    const [errors, setErrors]             = useState({});
    const [errorMessage, setErrorMessage] = useState('');
    const [loading, setLoading]           = useState(false);
    const [accountUpdated, setAccountUpdated] = useState({
        id: '',
        code: '',
        name: '',
        accountClass: '',
        hierarchyLevel: '',
        nature: '',
        status: 'ACTIVE',
        hasTransactions: false,
    });

    useEffect(() => {
        setAccountUpdated({
            id:              account.id             ?? '',
            code:            account.code           ?? '',
            name:            account.name           ?? '',
            accountClass:    account.accountClass   ?? '',
            hierarchyLevel:  account.hierarchyLevel ?? '',
            nature:          account.nature         ?? '',
            status:          account.status         ?? 'ACTIVE',
            hasTransactions: account.hasTransactions ?? false,
        });
        setErrors({});
        setErrorMessage('');
    }, [account]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!accountUpdated.code || accountUpdated.code.trim() === '') {
            setErrorMessage('El código de la cuenta es obligatorio');
            return;
        }
        if (!accountUpdated.name || accountUpdated.name.trim() === '') {
            setErrorMessage('El nombre de la cuenta es obligatorio');
            return;
        }
        if (!accountUpdated.accountClass) {
            setErrorMessage('Por favor seleccione la clase de la cuenta');
            return;
        }
        if (!accountUpdated.hierarchyLevel) {
            setErrorMessage('Por favor seleccione el nivel jerárquico');
            return;
        }
        if (!accountUpdated.nature) {
            setErrorMessage('Por favor seleccione la naturaleza de la cuenta');
            return;
        }

        const url = base_url(['api', 'puc-catalog', accountUpdated.id]);
        try {
            setLoading(true);
            // TODO: descomentar cuando el endpoint esté disponible
            // await fetchHelper.put(url, accountUpdated, {}, 1000);
            // dataTableRef?.current?.ajax.reload();

            // Temporal: actualizar fila en la tabla mientras no hay endpoint
            dataTableRef?.current?.rows().every(function () {
                if (this.data().id === accountUpdated.id) {
                    this.data({ ...this.data(), ...accountUpdated }).draw(false);
                }
            });

            setAccount({
                id: '',
                code: '',
                name: '',
                accountClass: '',
                hierarchyLevel: '',
                nature: '',
                status: 'ACTIVE',
                hasTransactions: false,
            });

            modalInstance?.current?.hide();

            setMessage({
                message: 'Cuenta PUC actualizada exitosamente',
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
                errores.forEach(err => { fieldErrors[err.field] = err.message; });
                setErrors(fieldErrors);
            } else if (error?.msg) {
                setErrorMessage(error.msg);
            }
        } finally {
            setLoading(false);
        }
    };

    return <>
        <div className="modal fade" ref={modalRef} id="modalUpdatePUC" tabIndex={-1} aria-hidden="true">
            <div className="modal-dialog modal-lg modal-dialog-centered" role="document">
                <div className="modal-content">
                    <div className="modal-header">
                        <h4 className="modal-title">Editar Cuenta PUC</h4>
                        <button
                            type="button"
                            className="btn-close"
                            data-bs-dismiss="modal"
                            aria-label="Close">
                        </button>
                    </div>

                    <div className="modal-body">
                        <AlertPage
                            message={errorMessage}
                            type="danger"
                            show={errorMessage !== ''}
                        />
                        <form onSubmit={handleSubmit}>

                            {/* ID (solo lectura) */}
                            <div className="row mb-3">
                                <div className="col-12">
                                    <label htmlFor="puc_id_update" className="form-label">
                                        Identificador
                                    </label>
                                    <input
                                        type="text"
                                        id="puc_id_update"
                                        className="form-control"
                                        value={accountUpdated.id}
                                        disabled
                                        readOnly
                                    />
                                </div>
                            </div>

                            {/* Código */}
                            <div className="row mb-3">
                                <div className="col-12">
                                    <label htmlFor="puc_code_update" className="form-label">
                                        Código <span className="text-danger">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        id="puc_code_update"
                                        className={`form-control ${errors.code ? 'is-invalid' : ''}`}
                                        placeholder="Ej. 1105"
                                        value={accountUpdated.code}
                                        onChange={(e) => setAccountUpdated({ ...accountUpdated, code: e.target.value })}
                                        disabled={accountUpdated.hasTransactions}
                                        readOnly={accountUpdated.hasTransactions}
                                    />
                                    {accountUpdated.hasTransactions && (
                                        <small className="text-warning">
                                            <i className="ri-error-warning-line me-1"></i>
                                            No se puede modificar el código: la cuenta está asociada a transacciones registradas.
                                        </small>
                                    )}
                                    {errors.code && <div className="invalid-feedback d-block">{errors.code}</div>}
                                </div>
                            </div>

                            {/* Nombre */}
                            <div className="row mb-3">
                                <div className="col-12">
                                    <label htmlFor="puc_name_update" className="form-label">
                                        Nombre <span className="text-danger">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        id="puc_name_update"
                                        className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                                        placeholder="Ej. Caja"
                                        value={accountUpdated.name}
                                        onChange={(e) => setAccountUpdated({ ...accountUpdated, name: e.target.value })}
                                    />
                                    {errors.name && <div className="invalid-feedback d-block">{errors.name}</div>}
                                </div>
                            </div>

                            {/* Clase */}
                            <div className="row mb-3">
                                <div className="col-12">
                                    <label htmlFor="puc_accountClass_update" className="form-label">
                                        Clase de la cuenta <span className="text-danger">*</span>
                                    </label>
                                    <select
                                        id="puc_accountClass_update"
                                        className={`form-control ${errors.accountClass ? 'is-invalid' : ''}`}
                                        value={accountUpdated.accountClass}
                                        onChange={(e) => setAccountUpdated({ ...accountUpdated, accountClass: e.target.value })}
                                    >
                                        <option value="">-- Seleccionar clase --</option>
                                        {ACCOUNT_CLASSES.map(c => (
                                            <option key={c.id} value={c.id}>{c.label}</option>
                                        ))}
                                    </select>
                                    {errors.accountClass && <div className="invalid-feedback d-block">{errors.accountClass}</div>}
                                </div>
                            </div>

                            {/* Nivel jerárquico + Naturaleza */}
                            <div className="row mb-3">
                                <div className="col-md-6">
                                    <label htmlFor="puc_hierarchyLevel_update" className="form-label">
                                        Nivel jerárquico <span className="text-danger">*</span>
                                    </label>
                                    <select
                                        id="puc_hierarchyLevel_update"
                                        className={`form-control ${errors.hierarchyLevel ? 'is-invalid' : ''}`}
                                        value={accountUpdated.hierarchyLevel}
                                        onChange={(e) => setAccountUpdated({ ...accountUpdated, hierarchyLevel: e.target.value })}
                                    >
                                        <option value="">-- Seleccionar nivel --</option>
                                        {HIERARCHY_LEVELS.map(h => (
                                            <option key={h.id} value={h.id}>{h.label}</option>
                                        ))}
                                    </select>
                                    {errors.hierarchyLevel && <div className="invalid-feedback d-block">{errors.hierarchyLevel}</div>}
                                </div>
                                <div className="col-md-6">
                                    <label htmlFor="puc_nature_update" className="form-label">
                                        Naturaleza <span className="text-danger">*</span>
                                    </label>
                                    <select
                                        id="puc_nature_update"
                                        className={`form-control ${errors.nature ? 'is-invalid' : ''}`}
                                        value={accountUpdated.nature}
                                        onChange={(e) => setAccountUpdated({ ...accountUpdated, nature: e.target.value })}
                                    >
                                        <option value="">-- Seleccionar naturaleza --</option>
                                        {ACCOUNT_NATURES.map(n => (
                                            <option key={n.id} value={n.id}>{n.label}</option>
                                        ))}
                                    </select>
                                    {errors.nature && <div className="invalid-feedback d-block">{errors.nature}</div>}
                                </div>
                            </div>

                            {/* Estado */}
                            <div className="row mb-3">
                                <div className="col-md-6">
                                    <label htmlFor="puc_status_update" className="form-label">
                                        Estado <span className="text-danger">*</span>
                                    </label>
                                    <select
                                        id="puc_status_update"
                                        className={`form-control ${errors.status ? 'is-invalid' : ''}`}
                                        value={accountUpdated.status}
                                        onChange={(e) => setAccountUpdated({ ...accountUpdated, status: e.target.value })}
                                    >
                                        <option value="">-- Seleccionar estado --</option>
                                        {ACCOUNT_STATUSES.map(s => (
                                            <option key={s.id} value={s.id}>{s.label}</option>
                                        ))}
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
                            disabled={loading}>
                            {loading ? 'Guardando...' : 'Guardar cambios'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </>;
};

export default UpdatedPUC;
