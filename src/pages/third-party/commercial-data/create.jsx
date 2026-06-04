import { useState } from 'react';
import InputModal from '../../../components/molecules/InputModal';
import InputSelectModal from '../../../components/molecules/inputSelectModal';
import { base_url } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';

const API_STORE = ['api', 'v1', 'commercial-data'];

const RISK_LEVELS = [
    { id: 'LOW',    label: 'Bajo' },
    { id: 'MEDIUM', label: 'Medio' },
    { id: 'HIGH',   label: 'Alto' },
];

// PT-03 (TER-RF-11): % de provision ECL (NIIF 9) por nivel de riesgo.
const PROVISION_PCT = { LOW: 1, MEDIUM: 5, HIGH: 20 };

/**
 * Modal para registrar datos comerciales de un tercero.
 * @param {Object} props
 * @param {React.Ref} props.modalRef - Referencia al elemento DOM del modal.
 * @param {React.Ref} props.modalInstance - Referencia a la instancia Bootstrap Modal.
 * @param {Object} props.commercialData - Estado del formulario.
 * @param {Function} props.setCommercialData - Setter del estado del formulario.
 * @param {Function} props.onSuccess - Callback invocado tras creacion exitosa.
 * @param {Array} props.paymentTerms - Opciones de terminos de pago [{id, label}].
 * @param {Array} props.currencies - Opciones de monedas [{id, label}].
 */
const CreateCommercialData = ({
    modalRef,
    modalInstance,
    commercialData,
    setCommercialData,
    onSuccess,
    paymentTerms,
    currencies,
}) => {

    const [errors, setErrors] = useState({});
    const [errorMessage, setErrorMessage] = useState('');

    /**
     * Envia el formulario de creacion al backend.
     */
    const handleCreate = async () => {
        // TER-RF-11/12 (doc QA v2, 2026-06-03 / Imagen 3): el limite de credito
        // es OBLIGATORIO, numerico y mayor que cero. Bloquear el guardado en la
        // UI con mensajes claros antes de enviar al backend.
        const rawLimit = String(commercialData.limitCredit ?? '').trim();
        const fe = {};
        if (rawLimit === '') fe.limitCredit = 'Debe diligenciar el límite de crédito';
        else if (!/^\d+(\.\d+)?$/.test(rawLimit)) fe.limitCredit = 'El límite de crédito debe ser un valor numérico';
        else if (Number(rawLimit) <= 0) fe.limitCredit = 'El límite de crédito debe ser mayor que cero';
        if (!commercialData.currencyId) fe.currencyId = 'Debe seleccionar la moneda asociada al límite de crédito';
        if (Object.keys(fe).length > 0) { setErrors(fe); return; }

        try {
            const payload = {
                thirdPartyId: Number(commercialData.thirdPartyId),
                paymentTermId: commercialData.paymentTermId ? Number(commercialData.paymentTermId) : null,
                limitCredit: Number(rawLimit),
                currencyId: commercialData.currencyId ? Number(commercialData.currencyId) : null,
                riskLevel: commercialData.riskLevel || null,
                validityFrom: commercialData.validityFrom || null,
                validityTo: commercialData.validityTo || null,
            };

            await fetchHelper.post(base_url(API_STORE), payload, {}, 1000);

            modalInstance?.current?.hide();
            setErrors({});
            setErrorMessage('');
            if (onSuccess) onSuccess();
        } catch (error) {
            console.error('Error al crear datos comerciales:', error);
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
                        <h4 className="modal-title fw-bold">Registrar Datos Comerciales</h4>
                        <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close" />
                    </div>

                    <div className="modal-body">
                        {/* Alerta de error general */}
                        <div className={`alert alert-danger alert-dismissible ${errorMessage ? '' : 'd-none'}`} role="alert">
                            <button type="button" className="btn-close" onClick={() => setErrorMessage('')} aria-label="Close" />
                            <span>{errorMessage}</span>
                        </div>

                        <div className="row">
                            <div className="col-md-6 mb-4 mt-2">
                                <InputSelectModal
                                    id="cd_paymentTermId_create"
                                    label="Termino de Pago"
                                    value={commercialData.paymentTermId}
                                    onChange={(v) => setCommercialData({ ...commercialData, paymentTermId: v })}
                                    error={errors.paymentTermId}
                                    options={paymentTerms}
                                    placeholder="Seleccione termino de pago"
                                    required={true}
                                />
                            </div>
                            <div className="col-md-6 mb-4 mt-2">
                                <InputModal
                                    type="text"
                                    inputMode="decimal"
                                    id="cd_limitCredit_create"
                                    label="Limite de Credito"
                                    value={commercialData.limitCredit}
                                    onChange={(e) => setCommercialData({ ...commercialData, limitCredit: e.target.value.replace(/[^\d.]/g, '') })}
                                    error={errors.limitCredit}
                                    placeholder="Ej. 5000000"
                                    required={true}
                                />
                            </div>
                        </div>

                        <div className="row">
                            <div className="col-md-6 mb-4 mt-2">
                                <InputSelectModal
                                    id="cd_currencyId_create"
                                    label="Moneda"
                                    value={commercialData.currencyId}
                                    onChange={(v) => setCommercialData({ ...commercialData, currencyId: v })}
                                    error={errors.currencyId}
                                    options={currencies}
                                    placeholder="Seleccione moneda"
                                />
                            </div>
                            <div className="col-md-6 mb-4 mt-2">
                                <InputSelectModal
                                    id="cd_riskLevel_create"
                                    label="Nivel de Riesgo"
                                    value={commercialData.riskLevel}
                                    onChange={(v) => setCommercialData({ ...commercialData, riskLevel: v })}
                                    error={errors.riskLevel}
                                    options={RISK_LEVELS}
                                    placeholder="Seleccione nivel de riesgo"
                                />
                                {commercialData.riskLevel && PROVISION_PCT[commercialData.riskLevel] != null && (
                                    <small className="d-block mt-1 text-info">
                                        % Provisión ECL: {PROVISION_PCT[commercialData.riskLevel]}%
                                    </small>
                                )}
                            </div>
                        </div>

                        <div className="row">
                            <div className="col-md-6 mb-4 mt-2">
                                <InputModal
                                    type="date"
                                    id="cd_validityFrom_create"
                                    label="Vigencia Desde"
                                    value={commercialData.validityFrom}
                                    onChange={(e) => setCommercialData({ ...commercialData, validityFrom: e.target.value })}
                                    error={errors.validityFrom}
                                    placeholder=""
                                />
                            </div>
                            <div className="col-md-6 mb-4 mt-2">
                                <InputModal
                                    type="date"
                                    id="cd_validityTo_create"
                                    label="Vigencia Hasta"
                                    value={commercialData.validityTo}
                                    onChange={(e) => setCommercialData({ ...commercialData, validityTo: e.target.value })}
                                    error={errors.validityTo}
                                    placeholder=""
                                />
                            </div>
                        </div>
                    </div>

                    <div className="modal-footer">
                        <button type="button" className="btn btn-primary" onClick={handleCreate}>
                            Registrar
                        </button>
                        <button type="button" className="btn btn-outline-secondary ms-auto" data-bs-dismiss="modal">
                            Cerrar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreateCommercialData;
