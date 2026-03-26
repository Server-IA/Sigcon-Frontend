import { useEffect, useState } from 'react';

import InputModal from '../../../components/molecules/InputModal';
import InputSelectModal from '../../../components/molecules/inputSelectModal';
import TextareaModal from '../../../components/molecules/TextareaModal';
import AlertPage from '../../../components/molecules/AlertPage';

import { base_url } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';

// Endpoint oficial para crear chequeras.
const CREATE_URL = ['api', 'v1', 'checkbooks'];

// Limites de UX para evitar entradas excesivas.
const MAX_CHECKBOOK_NUMBER = 20;
const MAX_ISSUING_BANK = 120;
const MAX_OBSERVATIONS = 500;

// Errores por campo para retroalimentacion visual.
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

// Convierte a entero cuando aplique.
const toInt = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
};

const CreateCheckbook = ({
    modalRef,
    modalInstance,
    record,
    setRecord,
    dataTableRef,
    setMessage,
    accountOptions = [],
}) => {

    // Estado local de errores y carga.
    const [errors, setErrors] = useState({ ...emptyErrors });
    const [errorMessage, setErrorMessage] = useState('');
    const [loading, setLoading] = useState(false);

    // Limpia errores cuando cambia el record.
    useEffect(() => {
        setErrors({ ...emptyErrors });
        setErrorMessage('');
    }, [record]);

    // Valida solo experiencia de usuario (campos vacios/formato).
    const validate = () => {
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

    // Ejecuta POST de creacion.
    const handleSubmit = async () => {
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
            const url = base_url(CREATE_URL);
            await fetchHelper.post(url, payload, {}, 1000, false);

            dataTableRef?.current?.ajax.reload();
            modalInstance?.current?.hide();

            setRecord({
                id: null,
                bankAccountId: '',
                bankAccountLabel: '',
                checkbookNumber: '',
                issuingBank: '',
                checkStartNumber: '',
                checkEndNumber: '',
                receivedDate: '',
                activationDate: '',
                status: 'ACTIVA',
                observations: '',
            });

            setMessage({
                type: 'success',
                show: true,
                message: 'Chequera registrada exitosamente',
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
                setErrorMessage(error?.msg || 'Error al registrar la chequera');
            }
        } finally {
            setLoading(false);
        }
    };

    // Limpia campos del formulario.
    const handleClear = () => {
        setRecord({
            ...record,
            bankAccountId: '',
            checkbookNumber: '',
            issuingBank: '',
            checkStartNumber: '',
            checkEndNumber: '',
            receivedDate: '',
            activationDate: '',
            status: 'ACTIVA',
            observations: '',
        });
        setErrors({ ...emptyErrors });
        setErrorMessage('');
    };

    return (
        <div className="modal fade" ref={modalRef} id="modalCreateCheckbook" tabIndex={-1} aria-hidden="true">
            <div className="modal-dialog modal-lg modal-dialog-centered" role="document">
                <div className="modal-content">
                    <div className="modal-header">
                        <h4 className="modal-title">Nueva Chequera</h4>
                        <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close" />
                    </div>

                    <div className="modal-body">
                        <AlertPage message={errorMessage} type="danger" show={errorMessage !== ''} />

                        {/* Cuenta bancaria: si hay opciones, se usa select; si no, ID manual. */}
                        <div className="row">
                            <div className="col-12 mb-4 mt-2">
                                {accountOptions.length > 0 ? (
                                    <InputSelectModal
                                        id="checkbook_bank_account_create"
                                        label="Cuenta bancaria"
                                        value={String(record.bankAccountId || '')}
                                        onChange={(value) => setRecord(prev => ({ ...prev, bankAccountId: value }))}
                                        error={errors.bankAccountId}
                                        placeholder="Seleccione cuenta bancaria"
                                        options={accountOptions}
                                        required
                                    />
                                ) : (
                                    <InputModal
                                        type="number"
                                        id="checkbook_bank_account_create_manual"
                                        label="ID cuenta bancaria"
                                        value={record.bankAccountId}
                                        onChange={(event) => setRecord(prev => ({ ...prev, bankAccountId: event.target.value }))}
                                        error={errors.bankAccountId}
                                        placeholder="Ingrese el ID interno de la cuenta"
                                        min={1}
                                        required
                                    />
                                )}
                            </div>
                        </div>

                        {/* Numero de chequera + banco emisor. */}
                        <div className="row">
                            <div className="col-md-6 mb-4 mt-2">
                                <InputModal
                                    type="text"
                                    id="checkbook_number_create"
                                    label="Numero de chequera"
                                    value={record.checkbookNumber}
                                    onChange={(event) => setRecord(prev => ({ ...prev, checkbookNumber: event.target.value }))}
                                    error={errors.checkbookNumber}
                                    maxLength={MAX_CHECKBOOK_NUMBER}
                                    required
                                />
                            </div>
                            <div className="col-md-6 mb-4 mt-2">
                                <InputModal
                                    type="text"
                                    id="checkbook_issuing_bank_create"
                                    label="Banco emisor"
                                    value={record.issuingBank}
                                    onChange={(event) => setRecord(prev => ({ ...prev, issuingBank: event.target.value }))}
                                    error={errors.issuingBank}
                                    maxLength={MAX_ISSUING_BANK}
                                    required
                                />
                            </div>
                        </div>

                        {/* Rango de cheques. */}
                        <div className="row">
                            <div className="col-md-6 mb-4 mt-2">
                                <InputModal
                                    type="number"
                                    id="checkbook_start_create"
                                    label="Cheque inicial"
                                    value={record.checkStartNumber}
                                    onChange={(event) => setRecord(prev => ({ ...prev, checkStartNumber: event.target.value }))}
                                    error={errors.checkStartNumber}
                                    min={1}
                                    required
                                />
                            </div>
                            <div className="col-md-6 mb-4 mt-2">
                                <InputModal
                                    type="number"
                                    id="checkbook_end_create"
                                    label="Cheque final"
                                    value={record.checkEndNumber}
                                    onChange={(event) => setRecord(prev => ({ ...prev, checkEndNumber: event.target.value }))}
                                    error={errors.checkEndNumber}
                                    min={1}
                                    required
                                />
                            </div>
                        </div>

                        {/* Fechas de recepcion y activacion. */}
                        <div className="row">
                            <div className="col-md-6 mb-4 mt-2">
                                <InputModal
                                    type="date"
                                    id="checkbook_received_date_create"
                                    label="Fecha de recepcion"
                                    value={record.receivedDate}
                                    onChange={(event) => setRecord(prev => ({ ...prev, receivedDate: event.target.value }))}
                                    error={errors.receivedDate}
                                    required
                                />
                            </div>
                            <div className="col-md-6 mb-4 mt-2">
                                <InputModal
                                    type="date"
                                    id="checkbook_activation_date_create"
                                    label="Fecha activacion"
                                    value={record.activationDate}
                                    onChange={(event) => setRecord(prev => ({ ...prev, activationDate: event.target.value }))}
                                    error={errors.activationDate}
                                    required
                                />
                            </div>
                        </div>

                        {/* Estado. */}
                        <div className="row">
                            <div className="col-md-6 mb-4 mt-2">
                                <InputSelectModal
                                    id="checkbook_status_create"
                                    label="Estado"
                                    value={record.status}
                                    onChange={(value) => setRecord(prev => ({ ...prev, status: value }))}
                                    error={errors.status}
                                    placeholder="Seleccione estado"
                                    options={[
                                        { id: 'ACTIVA', name: 'Activa' },
                                        { id: 'AGOTADA', name: 'Agotada' },
                                        { id: 'ANULADA', name: 'Anulada' },
                                        { id: 'BLOQUEADA', name: 'Bloqueada' },
                                    ]}
                                    required
                                />
                            </div>
                        </div>

                        {/* Observaciones. */}
                        <div className="row">
                            <TextareaModal
                                id="checkbook_observations_create"
                                label="Observaciones"
                                value={record.observations}
                                onChange={(event) => setRecord(prev => ({ ...prev, observations: event.target.value }))}
                                error={errors.observations}
                                placeholder="Observaciones opcionales"
                            />
                        </div>
                    </div>

                    <div className="modal-footer">
                        <button
                            type="button"
                            className="btn btn-primary ms-auto"
                            onClick={handleSubmit}
                            disabled={loading}>
                            {loading ? 'Guardando...' : 'Guardar'}
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
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreateCheckbook;

