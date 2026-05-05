import { useEffect, useState } from 'react';
import { base_url } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';
import InputModal from '../../../components/molecules/InputModal';
import InputSelectModal from '../../../components/molecules/inputSelectModal';
import TextareaModal from '../../../components/molecules/TextareaModal';
import AlertPage from '../../../components/molecules/AlertPage';

const API_STORE = ['api', 'v1', 'cost-centers', 'store'];

// HU-CFG-17 E3 (2026-04-27): formato del codigo. Solo alfanumerico ASCII +
// guion bajo y guion. Rechaza Ñ, tildes, +, espacios, signos.
const CODE_REGEX = /^[A-Z0-9_-]{1,20}$/;
// HU-CFG-17 MT-2 + CFG-19 MT-01: rechazo basico de tags HTML/XSS en texto.
const NO_HTML_REGEX = /[<>]/;

const CreateCentroCosto = ({ modalRef, modalInstance, centroCosto, setCentroCosto, dataTableRef, setCentroCostoCreate }) => {
    const [errors, setErrors] = useState({});
    const [errorMessage, setErrorMessage] = useState('');

    // HU-CFG-RF-17 (Bloque AQ, 2026-05-04): el form no expone "Estado" (input comentado),
    // pero el backend lo exige obligatorio. Default a 'ACTIVE' para que tras Limpiar +
    // re-llenar + Guardar el payload nunca llegue con status vacio.
    const initialState = {
        id: '',
        code: '',
        name: '',
        description: '',
        status: 'ACTIVE',
    };

    // HU-CFG-17 (2026-04-27): validacion previa al submit.
    const validate = () => {
        const next = {};
        const name = (centroCosto.name || '').trim();
        const code = (centroCosto.code || '').trim();
        const description = (centroCosto.description || '').trim();
        if (!name) next.name = 'El nombre es obligatorio';
        else if (NO_HTML_REGEX.test(name)) next.name = 'El nombre no puede contener < o >';
        if (!code) next.code = 'El codigo es obligatorio';
        else if (!CODE_REGEX.test(code)) next.code = 'El codigo solo admite letras (A-Z), numeros, _ y - (max 20 chars)';
        if (description && NO_HTML_REGEX.test(description)) next.description = 'La descripcion no puede contener < o >';
        setErrors(next);
        return Object.keys(next).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;
        const payload = {
            ...centroCosto,
            name: (centroCosto.name || '').trim(),
            code: (centroCosto.code || '').trim(),
            description: (centroCosto.description || '').trim(),
            // HU-CFG-RF-17 (Bloque AQ): defensa contra status vacio tras Limpiar.
            status: centroCosto.status || 'ACTIVE',
        };
        const url = base_url(API_STORE);
        try {
            await fetchHelper.post(url, payload, {}, 1000);
            setCentroCosto(initialState);
            dataTableRef?.current?.ajax.reload();
            modalInstance?.current?.hide();
            setCentroCostoCreate(true);
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
        setCentroCosto(initialState);
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
                        <h4 className="modal-title fw-bold">Crear Centro de Costos</h4>
                        <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div className="modal-body">

                        <AlertPage
                            message={errorMessage}
                            type="danger"
                            show={errorMessage ? true : false}
                            onChange={() => setErrorMessage('')}
                        />

                        <div className="row">
                            <div className="col-lg-6 col-md-12 col-sm-12 mb-3">
                                <InputModal
                                    type="text"
                                    id="name"
                                    label="Nombre del Centro de Costo"
                                    value={centroCosto.name}
                                    onChange={(e) => {
                                        setCentroCosto({ ...centroCosto, name: e.target.value });
                                        setErrors({ ...errors, name: null });
                                    }}
                                    error={errors.name}
                                    placeholder="Nombre"
                                    required
                                />
                            </div>

                            <div className="col-lg-6 col-md-12 col-sm-12 mb-3">
                                <InputModal
                                    type="text"
                                    id="code"
                                    label="Código del Centro de Costo"
                                    value={centroCosto.code}
                                    onChange={(e) => {
                                        // HU-CFG-17 E3: sanitizar en vivo. Solo permitir
                                        // caracteres del CODE_REGEX. El resto se descarta.
                                        const cleaned = (e.target.value || '')
                                            .toUpperCase()
                                            .replace(/[^A-Z0-9_-]/g, '');
                                        setCentroCosto({ ...centroCosto, code: cleaned });
                                        setErrors({ ...errors, code: null });
                                    }}
                                    error={errors.code}
                                    placeholder="EJ: CC001"
                                    maxLength={20}
                                    required
                                />
                            </div>
                            {/* <div className="col-md-6 mb-3">
                                <InputSelectModal
                                    id="status_create"
                                    label="Estado"
                                    value={centroCosto.status}
                                    onChange={(value) => setCentroCosto({ ...centroCosto, status: value })}
                                    error={errors.status}
                                    placeholder="Seleccione un estado"
                                    options={[
                                        { name: 'Activo', id: 'ACTIVE' },
                                        { name: 'Inactivo', id: 'INACTIVE' },
                                    ]}
                                    required
                                />
                            </div> */}
                        </div>

                        <div className="row">
                            <div className="col-12 mb-3">
                                <TextareaModal
                                    id="description"
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
                            Guardar Centro de Costos
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

export default CreateCentroCosto;
