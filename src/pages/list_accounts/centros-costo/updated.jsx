import { useEffect, useState } from 'react';
import { base_url } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';
import InputModal from '../../../components/molecules/InputModal';
import InputSelectModal from '../../../components/molecules/inputSelectModal';
import TextareaModal from '../../../components/molecules/TextareaModal';



const COMPANY_ID_HARDCODED = 79;

const UpdatedCentroCosto = ({ modalRef, modalInstance, centroCosto, setCentroCosto, dataTableRef, setCentroCostoEdit, readOnly = false }) => {
    const sfx = readOnly ? 'view' : 'updated'; // sufijo único por instancia para evitar conflicto de IDs con Select2
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
                id: null,
                code: null,
                name: null,
                description: null,
                status: 'ACTIVE',
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
            name: null,
            description: null,
            status: 'ACTIVE',
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
                        <h4 className="modal-title fw-bold">{readOnly ? 'Ver Centro de Costos' : 'Editar Centro de Costos'}</h4>
                        <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div className="modal-body">
                        <div className={`alert alert-danger alert-dismissible ${errorMessage ? '' : 'd-none'}`} role="alert">
                            <button type="button" className="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                            <span>{errorMessage}</span>
                        </div>

                        <div className="row">
                            <div className="col mb-3">
                                <InputModal
                                    type="text"
                                    id={`name_${sfx}`}
                                    label="Nombre del Centro de Costo"
                                    value={centroCosto.name ?? ''}
                                    onChange={(e) => !readOnly && setCentroCosto({ ...centroCosto, name: e.target.value })}
                                    error={!readOnly ? errors.name : undefined}
                                    placeholder="Nombre"
                                    required={!readOnly}
                                    readOnly={readOnly}
                                />
                            </div>
                            {/* <div className="col-md-6 mb-3">
                                <InputModal
                                    type="text"
                                    id="companyId_updated"
                                    label="Identificador de la Empresa"
                                    value={String(centroCosto.companyId ?? COMPANY_ID_HARDCODED)}
                                    readOnly
                                    placeholder="Id empresa"
                                />
                            </div> */}
                        </div>

                        <div className="row">
                            <div className="col-lg-6 col-md-12 col-sm-12 mb-3">
                                <InputModal
                                    type="text"
                                    id={`code_${sfx}`}
                                    label="Código del Centro de Costo"
                                    value={centroCosto.code ?? ''}
                                    onChange={(e) => {
                                        if (readOnly) return;
                                        setCentroCosto({ ...centroCosto, code: e.target.value.toUpperCase().trim().replace(/ /g, '') });
                                        setErrors({ ...errors, code: null });
                                    }}
                                    error={!readOnly ? errors.code : undefined}
                                    placeholder="EJ: CC001"
                                    required={!readOnly}
                                    readOnly={readOnly}
                                />
                            </div>
                            <div className="col-lg-6 col-md-12 col-sm-12 mb-3">
                                <InputSelectModal
                                    id={`status_${sfx}`}
                                    label="Estado"
                                    value={centroCosto.status ?? ''}
                                    onChange={(value) => !readOnly && setCentroCosto({ ...centroCosto, status: value })}
                                    error={!readOnly ? errors.status : undefined}
                                    placeholder="Seleccione un estado"
                                    options={[
                                        { name: 'Activo', id: 'ACTIVE' },
                                        { name: 'Inactivo', id: 'INACTIVE' },
                                    ]}
                                    required={!readOnly}
                                    disabled={readOnly}
                                />
                            </div>
                        </div>

                        <div className="row">
                            <div className="col-12 mb-3">
                                <TextareaModal
                                    id={`description_${sfx}`}
                                    label="Descripción"
                                    value={centroCosto.description ?? ''}
                                    onChange={(e) => !readOnly && setCentroCosto({ ...centroCosto, description: e.target.value })}
                                    error={!readOnly ? errors.description : undefined}
                                    placeholder="Descripcion opcional del centro de costo"
                                    readOnly={readOnly}
                                />
                            </div>
                        </div>
                    </div>
                    <div className="modal-footer justify-content-start">
                        {!readOnly && (
                            <>
                                <button type="button" className="btn btn-primary" onClick={handleSubmit}>
                                    Guardar Cambios
                                </button>
                                <button type="button" className="btn btn-outline-secondary" onClick={handleClear}>
                                    Limpiar
                                </button>
                            </>
                        )}
                        <button type="button" className={`btn btn-danger ${readOnly ? '' : 'ms-auto'}`} data-bs-dismiss="modal">
                            {readOnly ? 'Cerrar' : 'Volver'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UpdatedCentroCosto;
