import InputModal from '../../../components/molecules/InputModal';
import InputSelectModal from '../../../components/molecules/inputSelectModal';
import AlertPage from '../../../components/molecules/AlertPage';
import { base_url } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';
import { useEffect, useState } from 'react';

const UpdatedPUC = ({ modalRef, modalInstance, account, setAccount, dataTableRef, setMessage, accountClasses, levels, accountNatures, accountStatuses }) => {

    const [errors, setErrors]             = useState({});
    const [errorMessage, setErrorMessage] = useState({
        message: '',
        type: '',
        show: false
    });
    const [loading, setLoading]           = useState(false);
    const [accountUpdated, setAccountUpdated] = useState({
        id: '',
        code: '',
        name: '',
        accountClass: '',
        level: '',
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
            level:           account.level           ?? '',
            nature:          account.nature         ?? '',
            status:          account.status         ?? 'ACTIVE',
            hasTransactions: account.hasTransactions ?? false,
        });
        setErrors({});
        setErrorMessage({
            message: '',
            type: '',
            show: false
        });
    }, [account]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!accountUpdated.code || accountUpdated.code.trim() === '') {
            setErrorsMessage({field: 'code', message: 'El código de la cuenta es obligatorio'});
            return;
        }
        if (!/^[0-9]{1,10}$/.test(accountUpdated.code)) {
            setErrorsMessage({field: 'code', message: 'El código solo debe contener números y tener máximo 10 dígitos'});
            return;
        }
        if (!accountUpdated.name || accountUpdated.name.trim() === '') {
            setErrorsMessage({field: 'name', message: 'El nombre de la cuenta es obligatorio'});
            return;
        }
        // QA-BLOQUE-AO (2026-04-29): regex permisivo. Antes rechazaba parentesis y
        // acentos, lo cual bloqueaba editar cualquier cuenta PUC seedeada (todos los
        // nombres del PUC Colombia tienen formato "X (codigo)" con tildes/(). Mismo
        // patron del fix de cuentas-contables (Bloque Q).
        if (!/^[a-zA-Z0-9 áéíóúÁÉÍÓÚñÑüÜ()._,\-]{1,100}$/.test(accountUpdated.name)) {
            setErrorsMessage({field: 'name', message: 'El nombre puede contener letras, numeros, espacios, guiones, parentesis, puntos y comas (maximo 100 caracteres)'});
            return;
        }
        if (!accountUpdated.accountClass) {
            setErrorsMessage({field: 'accountClass', message: 'Por favor seleccione la clase de la cuenta'});
            return;
        }
        if (!accountUpdated.level) {
            setErrorsMessage({field: 'level', message: 'Por favor seleccione el nivel jerárquico'});
            return;
        }
        if (!accountUpdated.nature) {
            setErrorsMessage({field: 'nature', message: 'Por favor seleccione la naturaleza de la cuenta'});
            return;
        }
        if (!accountUpdated.status) {
            setErrorsMessage({field: 'status', message: 'Por favor seleccione el estado de la cuenta'});
            return;
        }

        const url = base_url(['api', 'v1', 'chart-of-accounts', accountUpdated.id]);
        const payload = {
            code:         accountUpdated.code,
            name:         accountUpdated.name,
            accountClass: accountUpdated.accountClass,
            level:        accountUpdated.level,
            nature:       accountUpdated.nature,
            status:       accountUpdated.status,
        };
        console.log('DEBUG update payload:', payload);
        try {
            setLoading(true);
            await fetchHelper.put(url, payload, {}, 1000);
            dataTableRef?.current?.ajax.reload();

            setAccount({
                id: '',
                code: '',
                name: '',
                accountClass: '',
                level: '',
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
            setErrorMessage({
                message: '',
                type: '',
                show: false
            });
        } catch (error) {
            console.log(error);
            const errores = error?.errors;
            if (errores && errores.length > 0) {
                const fieldErrors = {};
                errores.forEach(err => { fieldErrors[err.field] = err.message; });
                setErrors(fieldErrors);
            } else if (error?.msg) {
                setErrorMessage({
                    message: error.msg,
                    type: 'danger',
                    show: true
                });
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
                            message={errorMessage.message}
                            type={errorMessage.type}
                            show={errorMessage.show}
                            onChange={() => setErrorMessage({message: '', type: '', show: false})}
                        />

                        {/* <div className="row">
                            <div className="col mb-6 mt-2">
                                <InputModal
                                    type="text"
                                    id="puc_id_update"
                                    label="Identificador"
                                    placeholder=""
                                    value={accountUpdated.id}
                                    onChange={() => {}}
                                    disabled
                                    readOnly
                                />
                            </div>
                        </div> */}

                        <div className="row">
                            <div className="col-lg-6 col-md-6 col-sm-12 mb-6 mt-2">
                                <InputModal
                                    type="text"
                                    id="puc_code_update"
                                    label="Código"
                                    placeholder="Ej. 1105"
                                    value={accountUpdated.code}
                                    onChange={(e) => setAccountUpdated({ ...accountUpdated, code: e.target.value })}
                                    error={errors.code}
                                    disabled={accountUpdated.hasTransactions}
                                    readOnly={accountUpdated.hasTransactions}
                                    required
                                />
                                {accountUpdated.hasTransactions && (
                                    <small className="text-warning">
                                        <i className="ri-error-warning-line me-1"></i>
                                        No se puede modificar el código: la cuenta está asociada a transacciones registradas.
                                    </small>
                                )}
                            </div>
                            
                            <div className="col-lg-6 col-md-6 col-sm-12 mb-6 mt-2">
                                <InputModal
                                    type="text"
                                    id="puc_name_update"
                                    label="Nombre"
                                    placeholder="Ej. Caja"
                                    value={accountUpdated.name}
                                    onChange={(e) => setAccountUpdated({ ...accountUpdated, name: e.target.value })}
                                    error={errors.name}
                                    required
                                />
                            </div>
                        </div>

                        <div className="row">
                            <div className="col mb-6 mt-2">
                                <InputSelectModal
                                    id="puc_accountClass_update"
                                    label="Clase de la cuenta"
                                    value={accountUpdated.accountClass}
                                    onChange={(value) => setAccountUpdated({ ...accountUpdated, accountClass: value })}
                                    error={errors.accountClass}
                                    placeholder="Seleccionar clase"
                                    options={accountClasses}
                                    required
                                />
                            </div>
                        </div>

                        <div className="row">
                            <div className="col mb-6 mt-2">
                                <InputSelectModal
                                    id="puc_level_update"
                                    label="Nivel jerárquico"
                                    value={accountUpdated.level}
                                    onChange={(value) => setAccountUpdated({ ...accountUpdated, level: value })}
                                    error={errors.level}
                                    placeholder="Seleccionar nivel"
                                    options={levels}
                                    required
                                />
                            </div>
                            <div className="col mb-6 mt-2">
                                <InputSelectModal
                                    id="puc_nature_update"
                                    label="Naturaleza"
                                    value={accountUpdated.nature}
                                    onChange={(value) => setAccountUpdated({ ...accountUpdated, nature: value })}
                                    error={errors.nature}
                                    placeholder="Seleccionar naturaleza"
                                    options={accountNatures}
                                    required
                                />
                            </div>
                        </div>

                        <div className="row">
                            <div className="col mb-6 mt-2">
                                <InputSelectModal
                                    id="puc_status_update"
                                    label="Estado"
                                    value={accountUpdated.status}
                                    onChange={(value) => setAccountUpdated({ ...accountUpdated, status: value })}
                                    error={errors.status}
                                    placeholder="Seleccionar estado"
                                    options={accountStatuses}
                                    required
                                />
                            </div>
                        </div>

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
