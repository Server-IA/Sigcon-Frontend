import InputModal from '../../../components/molecules/InputModal';
import InputSelectModal from '../../../components/molecules/inputSelectModal';
import AlertPage from '../../../components/molecules/AlertPage';
import { base_url } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';
import { useEffect, useState } from 'react';

const CreatePUC = ({ modalRef, modalInstance, account, setAccount, dataTableRef, setMessage, accountClasses, levels, accountNatures }) => {

    const [errors, setErrors] = useState({});
    const [errorMessage, setErrorMessage] = useState({
        message: '',
        type: '',
        show: false
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setErrors({});
        setErrorMessage({
            message: '',
            type: '',
            show: false
        });
    }, [account]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!account.code || account.code.trim() === '') {
            setErrors({ ...errors, code: 'El código de la cuenta es obligatorio' });
            return;
        }
        if (!/^[0-9]{1,10}$/.test(account.code)) {
            setErrors({ ...errors, code: 'El código solo debe contener números y tener máximo 10 dígitos' });
            return;
        }
        if (!account.name || account.name.trim() === '') {
            setErrors({ ...errors, name: 'El nombre de la cuenta es obligatorio' });
            return;
        }
        if (!/^[A-Za-z0-9_\-\s]{1,100}$/.test(account.name)) {
            setErrors({ ...errors, name: 'El nombre solo puede contener letras, números, guiones y espacios (máximo 100 caracteres)' });
            return;
        }
        if (!account.accountClass) {
            setErrors({ ...errors, accountClass: 'Por favor seleccione la clase de la cuenta' });
            return;
        }
        if (!account.level) {
            setErrors({ ...errors, level: 'Por favor seleccione el nivel jerárquico' });
            return;
        }
        if (!account.nature) {
            setErrors({ ...errors, nature: 'Por favor seleccione la naturaleza de la cuenta' });
            return;
        }

        const url = base_url(['api', 'v1', 'chart-of-accounts']);
        const payload = {
            code: account.code,
            name: account.name,
            accountClass: account.accountClass,
            level: account.level,
            nature: account.nature,
        };
        console.log('DEBUG create payload:', payload);
        try {
            setLoading(true);
            await fetchHelper.post(url, payload, {}, 1000);
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
                message: 'Cuenta PUC creada exitosamente',
                type: 'success',
                show: true,
            });

            setErrors({});
            setErrorMessage({
                message: '',
                type: '',
                show: true
            });
        } catch (error) {
            console.log(error);
            const errores = error?.errors;
            if (errores && errores.length > 0) {
                const fieldErrors = {};
                errores.forEach(err => { fieldErrors[err.field] = err.message; });
                setErrors(fieldErrors);
            } else if (error?.msg) {
                setErrorMessage({ message: error.msg, type: 'danger', show: true });
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
                            type={errorMessage.type}
                            message={errorMessage.message}
                            show={errorMessage.show}
                            onChange={() => setErrorMessage({ message: '', type: '', show: false })}
                            duration={60000}
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
                                    id="puc_level"
                                    label="Nivel jerárquico"
                                    value={account.level}
                                    onChange={(value) => setAccount({ ...account, level: value })}
                                    error={errors.level}
                                    placeholder="Seleccionar nivel"
                                    options={levels}
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
