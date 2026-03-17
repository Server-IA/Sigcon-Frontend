import InputModal from '../../../components/molecules/InputModal';
import InputSelectModal from '../../../components/molecules/inputSelectModal';
import AlertPage from '../../../components/molecules/AlertPage';
import { base_url } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';
import { useEffect, useState } from 'react';

const CreatePUC = ({ modalRef, modalInstance, account, setAccount, dataTableRef, setMessage, accountClasses, levels, accountNatures }) => {

    const [errors, setErrors] = useState({});
    const [error, setError] = useState({
        message: '',
        type: '',
        show: false,
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!modalRef.current) return;
        const el = modalRef.current;
        const onHidden = () => {
            setErrors({});
            setError({ message: '', type: '', show: false });
        };
        el.addEventListener('hidden.bs.modal', onHidden);
        return () => el.removeEventListener('hidden.bs.modal', onHidden);
    }, [modalRef]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        const url = base_url(['api', 'v1', 'chart-of-accounts']);
        const payload = {
            code:         account.code         || null,
            name:         account.name         || null,
            accountClass: account.accountClass || null,
            level:        account.level        || null,
            nature:       account.nature       || null,
        };

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
            setError({ message: '', type: '', show: false });
        } catch (error) {
            console.log(error);
            const errores = error?.errors;
            if (errores && errores.length > 0) {
                const fieldErrors = {};
                errores.forEach(err => { fieldErrors[err.field] = err.message; });
                setErrors(fieldErrors);
            } else if (error?.msg) {
                setError({ message: error.msg, type: 'danger', show: true });
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
                            type={error.type}
                            message={error.message}
                            show={error.show}
                            onChange={() => setError({ message: '', type: '', show: false })}
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
                                    onChange={(e) => {
                                        setAccount({ ...account, code: e.target.value });
                                        setErrors(prev => ({ ...prev, code: '' }));
                                    }}
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
                                    onChange={(e) => {
                                        setAccount({ ...account, name: e.target.value });
                                        setErrors(prev => ({ ...prev, name: '' }));
                                    }}
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
                                    onChange={(value) => {
                                        setAccount({ ...account, accountClass: value });
                                        setErrors(prev => ({ ...prev, accountClass: '' }));
                                    }}
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
                                    onChange={(value) => {
                                        setAccount({ ...account, level: value });
                                        setErrors(prev => ({ ...prev, level: '' }));
                                    }}
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
                                    onChange={(value) => {
                                        setAccount({ ...account, nature: value });
                                        setErrors(prev => ({ ...prev, nature: '' }));
                                    }}
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
