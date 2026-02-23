import InputModal from '../../../components/molecules/InputModal';
import InputSelectModal from '../../../components/molecules/inputSelectModal';
import AlertPage from '../../../components/molecules/AlertPage';
import { base_url } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';
import { useEffect, useState } from 'react';

const UpdatedPUC = ({ modalRef, modalInstance, account, setAccount, dataTableRef, setMessage, accountClasses, hierarchyLevels, accountNatures, accountStatuses }) => {

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

                        <div className="row">
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
                        </div>

                        <div className="row">
                            <div className="col mb-6 mt-2">
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
                        </div>

                        <div className="row">
                            <div className="col mb-6 mt-2">
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
                                    id="puc_hierarchyLevel_update"
                                    label="Nivel jerárquico"
                                    value={accountUpdated.hierarchyLevel}
                                    onChange={(value) => setAccountUpdated({ ...accountUpdated, hierarchyLevel: value })}
                                    error={errors.hierarchyLevel}
                                    placeholder="Seleccionar nivel"
                                    options={hierarchyLevels}
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
                            <div className="col-md-6 mb-6 mt-2">
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
