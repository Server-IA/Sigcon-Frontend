import { useState, useEffect } from 'react';

import InputModal from '../../../components/molecules/InputModal';
import InputSelectModal from '../../../components/molecules/inputSelectModal';

import { base_url } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';

// ─── Constantes ────────────────────────────────────────────────────────────────
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

// ─── Componente principal ───────────────────────────────────────────────────────
const UpdatedPUC = ({ modalRef, modalInstance, account, setAccount, dataTableRef, setPucEdit }) => {

    const [errors, setErrors]             = useState({});
    const [errorMessage, setErrorMessage] = useState('');
    const [accountUpdated, setAccountUpdated] = useState({
        id: '',
        officialCode: '',
        name: '',
        accountClass: '',
        hierarchyLevel: '',
        nature: '',
        status: 'ACTIVE',
        hasTransactions: false,
    });

    // Sincronizar datos cuando el modal se abre con una cuenta nueva
    useEffect(() => {
        setAccountUpdated({
            id:             account.id             ?? '',
            officialCode:   account.officialCode   ?? '',
            name:           account.name           ?? '',
            accountClass:   account.accountClass   ?? '',
            hierarchyLevel: account.hierarchyLevel ?? '',
            nature:         account.nature         ?? '',
            status:         account.status         ?? 'ACTIVE',
            hasTransactions: account.hasTransactions ?? false,
        });
        setErrors({});
        setErrorMessage('');
    }, [account]);

    // ── Enviar actualización ──
    const handleUpdate = async () => {
        try {
            const url = base_url(['list_accounts', 'puc', 'updateAccount', accountUpdated.id]);
            await fetchHelper.put(url, accountUpdated, {}, 1000);

            setAccount({
                id: '',
                officialCode: '',
                name: '',
                accountClass: '',
                hierarchyLevel: '',
                nature: '',
                status: 'ACTIVE',
                hasTransactions: false,
            });

            dataTableRef?.current?.ajax.reload();
            modalInstance?.current?.hide();
            setPucEdit(true);
            setErrors({});
            setErrorMessage('');
        } catch (error) {
            console.error('Error al actualizar cuenta PUC:', error);
            const errores = error?.errors;
            if (errores && errores.length > 0) {
                const fieldErrors = {};
                errores.forEach(err => { fieldErrors[err.field] = err.message; });
                setErrors(fieldErrors);
            } else if (error?.msg) {
                setErrorMessage(error.msg);
            }
        }
    };

    return (
        <div className="modal fade" ref={modalRef} tabIndex={-1} aria-hidden="true">
            <div className="modal-dialog modal-lg modal-dialog-centered" role="document">
                <div className="modal-content">
                    <div className="modal-header">
                        <h4 className="modal-title">Editar Cuenta PUC</h4>
                        <button
                            type="button"
                            className="btn-close"
                            data-bs-dismiss="modal"
                            aria-label="Close"
                        />
                    </div>

                    <div className="modal-body">

                        {/* Alert de error general */}
                        <div className={`alert alert-danger alert-dismissible ${errorMessage === '' ? 'd-none' : ''}`} role="alert">
                            <button
                                type="button"
                                className="btn-close"
                                onClick={() => setErrorMessage('')}
                                aria-label="Close"
                            />
                            <span>{errorMessage}</span>
                        </div>

                        {/* Fila 1: ID (solo lectura) + Código Oficial */}
                        <div className="row">
                            <div className="col-md-4 mb-4 mt-2">
                                {/*
                                    El ID es solo lectura y bloqueado.
                                    El cursor cambia a "not-allowed" al pasar sobre él,
                                    indicando visualmente que no es editable.
                                */}
                                <div style={{ cursor: 'not-allowed' }}>
                                    <InputModal
                                        type="text"
                                        id="puc_id_update"
                                        label="Identificador único PUC"
                                        value={accountUpdated.id}
                                        onChange={() => {}}
                                        error=""
                                        placeholder=""
                                        disabled={true}
                                        readOnly={true}
                                    />
                                </div>
                            </div>

                            <div className="col-md-8 mb-4 mt-2">
                                {/*
                                    El Código Oficial se bloquea si la cuenta ya tiene
                                    transacciones asociadas (hasTransactions === true).
                                    En ese caso el campo se deshabilita y el cursor
                                    muestra restricción de acceso.
                                */}
                                <div style={{ cursor: accountUpdated.hasTransactions ? 'not-allowed' : 'auto' }}>
                                    <InputModal
                                        type="text"
                                        id="puc_officialCode_update"
                                        label="Código oficial de la cuenta"
                                        value={accountUpdated.officialCode}
                                        onChange={(e) => setAccountUpdated({ ...accountUpdated, officialCode: e.target.value })}
                                        error={errors.officialCode}
                                        placeholder="Ej. 1105"
                                        required={true}
                                        disabled={accountUpdated.hasTransactions}
                                        readOnly={accountUpdated.hasTransactions}
                                    />
                                </div>
                                {accountUpdated.hasTransactions && (
                                    <small className="text-warning">
                                        <i className="ri-error-warning-line me-1"></i>
                                        No se puede modificar el código: la cuenta PUC está asociada a transacciones registradas en el sistema.
                                    </small>
                                )}
                            </div>
                        </div>

                        {/* Fila 2: Nombre */}
                        <div className="row">
                            <div className="col-md-12 mb-4 mt-2">
                                <InputModal
                                    type="text"
                                    id="puc_name_update"
                                    label="Nombre de la cuenta"
                                    value={accountUpdated.name}
                                    onChange={(e) => setAccountUpdated({ ...accountUpdated, name: e.target.value })}
                                    error={errors.name}
                                    placeholder="Ej. Caja"
                                    required={true}
                                />
                            </div>
                        </div>

                        {/* Fila 3: Clase */}
                        <div className="row">
                            <div className="col-md-12 mb-4 mt-2">
                                <InputSelectModal
                                    id="puc_accountClass_update"
                                    label="Clase de la cuenta"
                                    value={accountUpdated.accountClass}
                                    onChange={(value) => setAccountUpdated({ ...accountUpdated, accountClass: value })}
                                    error={errors.accountClass}
                                    placeholder="Seleccione la clase"
                                    options={ACCOUNT_CLASSES}
                                    required={true}
                                />
                            </div>
                        </div>

                        {/* Fila 4: Nivel jerárquico + Naturaleza */}
                        <div className="row">
                            <div className="col-md-6 mb-4 mt-2">
                                <InputSelectModal
                                    id="puc_hierarchyLevel_update"
                                    label="Nivel jerárquico"
                                    value={accountUpdated.hierarchyLevel}
                                    onChange={(value) => setAccountUpdated({ ...accountUpdated, hierarchyLevel: value })}
                                    error={errors.hierarchyLevel}
                                    placeholder="Seleccione el nivel"
                                    options={HIERARCHY_LEVELS}
                                    required={true}
                                />
                            </div>
                            <div className="col-md-6 mb-4 mt-2">
                                <InputSelectModal
                                    id="puc_nature_update"
                                    label="Naturaleza de la cuenta"
                                    value={accountUpdated.nature}
                                    onChange={(value) => setAccountUpdated({ ...accountUpdated, nature: value })}
                                    error={errors.nature}
                                    placeholder="Seleccione la naturaleza"
                                    options={ACCOUNT_NATURES}
                                    required={true}
                                />
                            </div>
                        </div>

                        {/* Fila 5: Estado (editable solo en edición) */}
                        <div className="row">
                            <div className="col-md-6 mb-4 mt-2">
                                <InputSelectModal
                                    id="puc_status_update"
                                    label="Estado de la cuenta"
                                    value={accountUpdated.status}
                                    onChange={(value) => setAccountUpdated({ ...accountUpdated, status: value })}
                                    error={errors.status}
                                    placeholder="Seleccione el estado"
                                    options={ACCOUNT_STATUSES}
                                    required={true}
                                />
                            </div>
                        </div>

                    </div>{/* /modal-body */}

                    <div className="modal-footer">
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={handleUpdate}
                        >
                            Guardar cambios
                        </button>
                        <button
                            type="button"
                            className="btn btn-outline-secondary ms-auto"
                            data-bs-dismiss="modal"
                        >
                            Cerrar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UpdatedPUC;
