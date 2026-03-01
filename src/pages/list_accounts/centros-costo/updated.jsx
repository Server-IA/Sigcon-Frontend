import { useEffect, useState } from 'react';
import { base_url } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';
import InputModal from '../../../components/molecules/InputModal';
import InputSelectModal from '../../../components/molecules/inputSelectModal';
import TextareaModal from '../../../components/molecules/TextareaModal';



const COMPANY_ID_HARDCODED = 79;

const UpdatedCentroCosto = ({ modalRef, modalInstance, centroCosto, setCentroCosto, dataTableRef, setCentroCostoEdit }) => {
    const [errors, setErrors] = useState({});
    const [errorMessage, setErrorMessage] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        const payload = {
            ...centroCosto,
            companyId: centroCosto.companyId ?? COMPANY_ID_HARDCODED,
        };
        const url = base_url(['api', 'v1', 'cost-centers', centroCosto.id]);
        try {
            await fetchHelper.put(url, payload, {}, 500, false);
            setCentroCosto({
                id: '',
                code: '',
                name: '',
                description: '',
                status: '',
                companyId: COMPANY_ID_HARDCODED,
            });
            dataTableRef?.current?.ajax.reload();
            modalInstance?.current?.hide();
            setCentroCostoEdit(true);
            setErrors({});
            setErrorMessage('');
        } catch (error) {
            const errores = error?.errors;
            if (errores && errores.length > 0) {
                const fieldErrors = {};
                errores.forEach((err) => {
                    fieldErrors[err.field] = err.message;
                });
                setErrors(fieldErrors);
            } else if (error?.msg) {
                setErrorMessage(error.msg);
            }
        }
    };

    const handleClear = () => {
        setCentroCosto({
            ...centroCosto,
            name: '',
            description: '',
            status: '',
        });
        setErrors({});
        setErrorMessage('');
    };

    useEffect(() => {
        setErrors({});
        setErrorMessage('');
    }, [centroCosto]);

    return (
        <div className="modal fade" ref={modalRef} tabIndex={-1} aria-hidden="true">
            <div className="modal-dialog modal-dialog-centered modal-lg" role="document">
                <div className="modal-content">
                    <div className="modal-header">
                        <h4 className="modal-title fw-bold">Editar Centro de Costos</h4>
                        <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div className="modal-body">
                        <div className={`alert alert-danger alert-dismissible ${errorMessage ? '' : 'd-none'}`} role="alert">
                            <button type="button" className="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                            <span>{errorMessage}</span>
                        </div>

                        <div className="row">
                            <div className="col-md-6 mb-3">
                                <InputModal
                                    type="text"
                                    id="name_updated"
                                    label="Nombre del Centro de Costo"
                                    value={centroCosto.name ?? ''}
                                    onChange={(e) => setCentroCosto({ ...centroCosto, name: e.target.value })}
                                    error={errors.name}
                                    placeholder="Nombre"
                                    required
                                />
                            </div>
                            <div className="col-md-6 mb-3">
                                <InputModal
                                    type="text"
                                    id="companyId_updated"
                                    label="Identificador de la Empresa"
                                    value={String(centroCosto.companyId ?? COMPANY_ID_HARDCODED)}
                                    readOnly
                                    placeholder="Id empresa"
                                />
                            </div>
                        </div>

                        <div className="row">
                            <div className="col-md-6 mb-3">
                                <InputModal
                                    type="text"
                                    id="code_updated"
                                    label="Código del Centro de Costo"
                                    value={centroCosto.code ?? ''}
                                    onChange={(e) => setCentroCosto({ ...centroCosto, code: e.target.value })}
                                    error={errors.code}
                                    placeholder="EJ: CC001"
                                    required
                                />
                            </div>
                            <div className="col-md-6 mb-3">
                                <InputSelectModal
                                    id="status_updated"
                                    label="Estado"
                                    value={centroCosto.status ?? ''}
                                    onChange={(value) => setCentroCosto({ ...centroCosto, status: value })}
                                    error={errors.status}
                                    placeholder="Seleccione un estado"
                                    options={[
                                        { name: 'Activo', id: 'ACTIVE' },
                                        { name: 'Inactivo', id: 'INACTIVE' },
                                    ]}
                                    required
                                />
                            </div>
                        </div>

                        <div className="row">
                            <div className="col-12 mb-3">
                                <TextareaModal
                                    id="description_updated"
                                    label="Descripción"
                                    value={centroCosto.description ?? ''}
                                    onChange={(e) => setCentroCosto({ ...centroCosto, description: e.target.value })}
                                    error={errors.description}
                                    placeholder="Descripcion opcional del centro de costo"
                                />
                            </div>
                        </div>
                    </div>
                    <div className="modal-footer justify-content-start">
                        <button type="button" className="btn btn-primary" onClick={handleSubmit}>
                            Guardar Cambios
                        </button>
                        <button type="button" className="btn btn-outline-secondary" onClick={handleClear}>
                            Limpiar
                        </button>
                        <button type="button" className="btn btn-danger ms-auto" data-bs-dismiss="modal">
                            Volver
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UpdatedCentroCosto;
