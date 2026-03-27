import { useEffect, useState } from 'react';

import InputModal from '../../../components/molecules/InputModal';
import InputSelectModal from '../../../components/molecules/inputSelectModal';
import TextareaModal from '../../../components/molecules/TextareaModal';
import AlertPage from '../../../components/molecules/AlertPage';
import InputDate from '../../../components/molecules/InputDate';

import { base_url } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';

// Endpoint oficial para actualizar chequeras por ID.
const UPDATE_URL = (id) => ['api', 'v1', 'checkbooks', id];

// Limites de UX para campos de texto.
const MAX_CHECKBOOK_NUMBER = 20;
const MAX_ISSUING_BANK = 120;
const MAX_OBSERVATIONS = 500;

// Mapa de errores por campo.
const emptyErrors = {
    bankAccountId: '',
    checkbookNumber: '',
    issuingBank: '',
    checkStartNumber: '',
    checkEndNumber: '',
    receivedDate: '',
    activationDate: '',
    status: '',
    observations: '',
};

// Convierte a entero para payload numérico.
const toInt = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
};

const UpdatedCheckbook = ({
    modalRef,
    modalInstance,
    record,
    setRecord,
    dataTableRef,
    setMessage,
    statuses = [],
    accountOptions = [],
    readOnly = false,
    modalId = 'modalUpdateCheckbook',
}) => {

    // Estado local del formulario.
    const [errors, setErrors] = useState({ ...emptyErrors });
    const [errorMessage, setErrorMessage] = useState('');
    const [loading, setLoading] = useState(false);

    // Limpia errores cuando cambia registro.
    useEffect(() => {
        setErrors({ ...emptyErrors });
        setErrorMessage('');
    }, [record]);

    // Valida solo en modo edición.
    const validate = () => {
        if (readOnly) return true;

        const nextErrors = { ...emptyErrors };
        let valid = true;

        const bankAccountId = toInt(record.bankAccountId);
        const checkbookNumber = String(record.checkbookNumber || '').trim();
        const issuingBank = String(record.issuingBank || '').trim();
        const checkStartNumber = toInt(record.checkStartNumber);
        const checkEndNumber = toInt(record.checkEndNumber);
        const receivedDate = record.receivedDate;
        const activationDate = record.activationDate;
        const status = String(record.status || '').trim();
        const observations = String(record.observations || '');

        if (!record.id) {
            setErrorMessage('No se puede actualizar: identificador invalido');
            return false;
        }
        if (!bankAccountId) {
            nextErrors.bankAccountId = 'La cuenta bancaria es obligatoria';
            valid = false;
        }
        if (!checkbookNumber) {
            nextErrors.checkbookNumber = 'El numero de chequera es obligatorio';
            valid = false;
        } else if (checkbookNumber.length > MAX_CHECKBOOK_NUMBER) {
            nextErrors.checkbookNumber = `Maximo ${MAX_CHECKBOOK_NUMBER} caracteres`;
            valid = false;
        }
        if (!issuingBank) {
            nextErrors.issuingBank = 'El banco emisor es obligatorio';
            valid = false;
        } else if (issuingBank.length > MAX_ISSUING_BANK) {
            nextErrors.issuingBank = `Maximo ${MAX_ISSUING_BANK} caracteres`;
            valid = false;
        }
        if (!checkStartNumber || checkStartNumber <= 0) {
            nextErrors.checkStartNumber = 'Ingrese un numero valido';
            valid = false;
        }
        if (!checkEndNumber || checkEndNumber <= 0) {
            nextErrors.checkEndNumber = 'Ingrese un numero valido';
            valid = false;
        }
        if (!receivedDate) {
            nextErrors.receivedDate = 'La fecha de recepcion es obligatoria';
            valid = false;
        }
        if (!activationDate) {
            nextErrors.activationDate = 'La fecha de activacion es obligatoria';
            valid = false;
        }
        if (!status) {
            nextErrors.status = 'El estado es obligatorio';
            valid = false;
        }
        if (observations.length > MAX_OBSERVATIONS) {
            nextErrors.observations = `Maximo ${MAX_OBSERVATIONS} caracteres`;
            valid = false;
        }

        setErrors(nextErrors);
        return valid;
    };

    // Ejecuta PUT solo en modo edición.
    const handleSubmit = async () => {
        if (readOnly) return;
        if (!validate()) return;

        const payload = {
            bankAccountId: toInt(record.bankAccountId),
            checkbookNumber: String(record.checkbookNumber).trim(),
            issuingBank: String(record.issuingBank).trim(),
            checkStartNumber: toInt(record.checkStartNumber),
            checkEndNumber: toInt(record.checkEndNumber),
            receivedDate: record.receivedDate,
            activationDate: record.activationDate,
            status: record.status,
            observations: String(record.observations || '').trim(),
        };

        try {
            setLoading(true);
            const url = base_url(UPDATE_URL(record.id));
            await fetchHelper.put(url, payload, {}, 1000, false);

            dataTableRef?.current?.ajax.reload();
            modalInstance?.current?.hide();

            setMessage({
                type: 'success',
                show: true,
                message: 'Chequera actualizada exitosamente',
            });
        } catch (error) {
            const backendErrors = error?.errors;
            if (backendErrors?.length > 0) {
                const nextErrors = { ...emptyErrors };
                backendErrors.forEach(item => {
                    nextErrors[item.field] = item.message;
                });
                setErrors(nextErrors);
            } else {
                setErrorMessage(error?.msg || 'Error al actualizar la chequera');
            }
        } finally {
            setLoading(false);
        }
    };

    // Limpia estado visual de errores.
    const handleClear = () => {
        setErrors({ ...emptyErrors });
        setErrorMessage('');
    };

    return (
        <div className="modal fade" ref={modalRef} id={modalId} tabIndex={-1} aria-hidden="true">
            <div className="modal-dialog modal-lg modal-dialog-centered" role="document">
                <div className="modal-content">
                    <div className="modal-header">
                        <h4 className="modal-title">{readOnly ? 'Detalle de Chequera' : 'Actualizar Chequera'}</h4>
                        <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close" />
                    </div>

                    <div className="modal-body">
                        <AlertPage message={errorMessage} type="danger" show={errorMessage !== ''} />

                        {/* ID Cuenta bancaria editable? en edición y bloqueada en vista. */}
                        <div className="row">
                            <div className="col-12 mb-4 mt-2">
                                {accountOptions.length > 0 ? (
                                    <InputSelectModal
                                        id={`${modalId}_bank_account`}
                                        label="Cuenta bancaria"
                                        value={String(record.bankAccountId || '')}
                                        onChange={(value) => setRecord(prev => ({ ...prev, bankAccountId: value }))}
                                        error={errors.bankAccountId}
                                        placeholder="Seleccione cuenta bancaria"
                                        options={accountOptions}
                                        required
                                        disabled={readOnly}
                                    />
                                ) : (
                                    <InputModal
                                        type="number"
                                        id={`${modalId}_bank_account_manual`}
                                        label="cuenta bancaria"
                                        value={record.bankAccountId}
                                        onChange={(event) => setRecord(prev => ({ ...prev, bankAccountId: event.target.value }))}
                                        error={errors.bankAccountId}
                                        placeholder="Ingrese el ID interno de la cuenta"
                                        min={1}
                                        required
                                        disabled={readOnly}
                                        readOnly={readOnly}
                                    />
                                )}
                            </div>
                        </div>

                        {/* Numero y banco emisor. */}
                        <div className="row">
                            <div className="col-md-6 mb-4 mt-2">
                                <InputModal
                                    type="text"
                                    id={`${modalId}_number`}
                                    label="Numero de chequera"
                                    value={record.checkbookNumber}
                                    onChange={(event) => setRecord(prev => ({ ...prev, checkbookNumber: event.target.value }))}
                                    error={errors.checkbookNumber}
                                    maxLength={MAX_CHECKBOOK_NUMBER}
                                    required
                                    disabled={readOnly}
                                    readOnly={readOnly}
                                />
                            </div>
                            <div className="col-md-6 mb-4 mt-2">
                                <InputModal
                                    type="text"
                                    id={`${modalId}_issuing_bank`}
                                    label="Banco emisor"
                                    value={record.issuingBank}
                                    onChange={(event) => setRecord(prev => ({ ...prev, issuingBank: event.target.value }))}
                                    error={errors.issuingBank}
                                    maxLength={MAX_ISSUING_BANK}
                                    required
                                    disabled={readOnly}
                                    readOnly={readOnly}
                                />
                            </div>
                        </div>

                        {/* Rango de cheques. */}
                        <div className="row">
                            <div className="col-md-6 mb-4 mt-2">
                                <InputModal
                                    type="number"
                                    id={`${modalId}_start`}
                                    label="Cheque inicial"
                                    value={record.checkStartNumber}
                                    onChange={(event) => setRecord(prev => ({ ...prev, checkStartNumber: event.target.value }))}
                                    error={errors.checkStartNumber}
                                    min={1}
                                    required
                                    disabled={readOnly}
                                    readOnly={readOnly}
                                />
                            </div>
                            <div className="col-md-6 mb-4 mt-2">
                                <InputModal
                                    type="number"
                                    id={`${modalId}_end`}
                                    label="Cheque final"
                                    value={record.checkEndNumber}
                                    onChange={(event) => setRecord(prev => ({ ...prev, checkEndNumber: event.target.value }))}
                                    error={errors.checkEndNumber}
                                    min={1}
                                    required
                                    disabled={readOnly}
                                    readOnly={readOnly}
                                />
                            </div>
                        </div>

                        {/* Fechas con InputDate en edición y texto readonly en vista. */}
                        <div className="row">
                            <div className="col-md-6 mb-4 mt-2">
                                {readOnly ? (
                                    <InputModal
                                        type="text"
                                        id={`${modalId}_received_date_view`}
                                        label="Fecha de recepcion"
                                        value={record.receivedDate}
                                        onChange={() => {}}
                                        disabled
                                        readOnly
                                    />
                                ) : (
                                    <InputDate
                                        id={`${modalId}_received_date`}
                                        label="Fecha de recepcion"
                                        date={record.receivedDate}
                                        onChange={(date) => setRecord(prev => ({ ...prev, receivedDate: date || '' }))}
                                        error={errors.receivedDate}
                                        placeholder="yyyy-mm-dd"
                                        dateFormat="Y-m-d"
                                        required
                                    />
                                )}
                            </div>
                            <div className="col-md-6 mb-4 mt-2">
                                {readOnly ? (
                                    <InputModal
                                        type="text"
                                        id={`${modalId}_activation_date_view`}
                                        label="Fecha activacion"
                                        value={record.activationDate}
                                        onChange={() => {}}
                                        disabled
                                        readOnly
                                    />
                                ) : (
                                    <InputDate
                                        id={`${modalId}_activation_date`}
                                        label="Fecha activacion"
                                        date={record.activationDate}
                                        onChange={(date) => setRecord(prev => ({ ...prev, activationDate: date || '' }))}
                                        error={errors.activationDate}
                                        placeholder="yyyy-mm-dd"
                                        dateFormat="Y-m-d"
                                        required
                                    />
                                )}
                            </div>
                        </div>

                        {/* Estado. */}
                        <div className="row">
                            <div className="col-md-6 mb-4 mt-2">
                                <InputSelectModal
                                    id={`${modalId}_status`}
                                    label="Estado"
                                    value={record.status}
                                    onChange={(value) => setRecord(prev => ({ ...prev, status: value }))}
                                    error={errors.status}
                                    placeholder="Seleccione estado"
                                    options={statuses}
                                    required
                                    disabled={readOnly}
                                />
                            </div>
                        </div>

                        {/* Observaciones editable o solo lectura según modo. */}
                        <div className="row">
                            {readOnly ? (
                                <div className="col-12 mb-4 mt-2">
                                    <label className="form-label">Observaciones</label>
                                    <textarea
                                        className="form-control"
                                        value={record.observations || '-'}
                                        readOnly
                                        disabled
                                        rows={3}
                                    />
                                </div>
                            ) : (
                                <TextareaModal
                                    id={`${modalId}_observations`}
                                    label="Observaciones"
                                    value={record.observations}
                                    onChange={(event) => setRecord(prev => ({ ...prev, observations: event.target.value }))}
                                    error={errors.observations}
                                    placeholder="Observaciones opcionales"
                                />
                            )}
                        </div>
                    </div>

                    <div className="modal-footer">
                        {readOnly ? (
                            <button
                                type="button"
                                className="btn btn-outline-secondary ms-auto"
                                data-bs-dismiss="modal">
                                Cerrar
                            </button>
                        ) : (
                            <>
                                <button
                                    type="button"
                                    className="btn btn-primary ms-auto"
                                    onClick={handleSubmit}
                                    disabled={loading}>
                                    {loading ? 'Guardando...' : 'Guardar cambios'}
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-danger"
                                    onClick={handleClear}
                                    disabled={loading}>
                                    Limpiar
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-outline-secondary"
                                    data-bs-dismiss="modal"
                                    disabled={loading}>
                                    Volver
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UpdatedCheckbook;

