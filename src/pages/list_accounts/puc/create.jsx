import InputModal from '../../../components/molecules/InputModal';
import InputSelectModal from '../../../components/molecules/inputSelectModal';
import AlertPage from '../../../components/molecules/AlertPage';
import { base_url } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';
import { useEffect, useState } from 'react';

const CreatePUC = ({ modalRef, modalInstance, account, setAccount, dataTableRef, setMessage, accountClasses, hierarchyLevels, accountNatures }) => {

    const [errors, setErrors] = useState({});
    const [errorMessage, setErrorMessage] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setErrors({});
        setErrorMessage('');
    }, [account]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!account.code || account.code.trim() === '') {
            setErrorMessage('El código de la cuenta es obligatorio');
            return;
        }
        if (!account.name || account.name.trim() === '') {
            setErrorMessage('El nombre de la cuenta es obligatorio');
            return;
        }
        if (!account.accountClass) {
            setErrorMessage('Por favor seleccione la clase de la cuenta');
            return;
        }
        if (!account.hierarchyLevel) {
            setErrorMessage('Por favor seleccione el nivel jerárquico');
            return;
        }
        if (!account.nature) {
            setErrorMessage('Por favor seleccione la naturaleza de la cuenta');
            return;
        }

        const url = base_url(['api', 'puc-catalog']);
        try {
            setLoading(true);
            // TODO: descomentar cuando el endpoint esté disponible
            // await fetchHelper.post(url, account, {}, 1000);
            // dataTableRef?.current?.ajax.reload();

            // Temporal: insertar fila en la tabla mientras no hay endpoint
            dataTableRef?.current?.row.add({ ...account, id: Date.now() }).draw();

            setAccount({
                id: '',
                idPuc: null,
                code: '',
                name: '',
                accountClass: '',
                hierarchyLevel: '',
                nature: '',
                status: 'ACTIVE',
            });

            modalInstance?.current?.hide();

            setMessage({
                message: 'Cuenta PUC creada exitosamente',
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
        <div className="modal fade" ref={modalRef} id="modalCreatePUC" tabIndex={-1} aria-hidden="true">
            <div className="modal-dialog modal-lg modal-dialog-centered" role="document">
                <div className="modal-content">
                    <div className="modal-header">
                        <h4 className="modal-title">Crear Cuenta PUC</h4>
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
                                    id="puc_code"
                                    label="Código"
                                    placeholder="Ej. 1105"
                                    value={account.code}
                                    onChange={(e) => setAccount({ ...account, code: e.target.value })}
                                    error={errors.code}
                                    required
                                />
                            </div>
                        </div>

                        <div className="row">
                            <div className="col mb-6 mt-2">
                                <InputModal
                                    type="text"
                                    id="puc_name"
                                    label="Nombre"
                                    placeholder="Ej. Caja"
                                    value={account.name}
                                    onChange={(e) => setAccount({ ...account, name: e.target.value })}
                                    error={errors.name}
                                    required
                                />
                            </div>
                        </div>

                        <div className="row">
                            <div className="col mb-6 mt-2">
                                <InputSelectModal
                                    id="puc_accountClass"
                                    label="Clase de la cuenta"
                                    value={account.accountClass}
                                    onChange={(value) => setAccount({ ...account, accountClass: value })}
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
                                    id="puc_hierarchyLevel"
                                    label="Nivel jerárquico"
                                    value={account.hierarchyLevel}
                                    onChange={(value) => setAccount({ ...account, hierarchyLevel: value })}
                                    error={errors.hierarchyLevel}
                                    placeholder="Seleccionar nivel"
                                    options={hierarchyLevels}
                                    required
                                />
                            </div>
                            <div className="col mb-6 mt-2">
                                <InputSelectModal
                                    id="puc_nature"
                                    label="Naturaleza"
                                    value={account.nature}
                                    onChange={(value) => setAccount({ ...account, nature: value })}
                                    error={errors.nature}
                                    placeholder="Seleccionar naturaleza"
                                    options={accountNatures}
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
                            {loading ? 'Guardando...' : 'Crear Cuenta PUC'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </>;
};

export default CreatePUC;
