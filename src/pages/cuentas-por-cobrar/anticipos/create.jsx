import { useEffect, useState } from 'react';

import InputModal from '../../../components/molecules/InputModal';
import InputSelectModal from '../../../components/molecules/inputSelectModal';
import AlertPage from '../../../components/molecules/AlertPage';
import InputDate from '../../../components/molecules/InputDate';

import { base_url } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';

/**
 * Modal para registrar un nuevo Anticipo de cliente.
 * Envia POST a /api/v1/ar/advances. Cubre HU AR-09.
 */

const emptyErrors = {
    thirdPartyId: '',
    amount: '',
    advanceDate: '',
    advanceReference: '',
    bankAccountId: '',
    bankMovementId: '',
    notes: '',
};

const emptyRecord = {
    thirdPartyId: '',
    amount: '',
    advanceDate: '',
    advanceReference: '',
    bankAccountId: '',
    bankMovementId: '',
    notes: '',
};

const CreateArAdvance = ({ modalRef, modalInstance, dataTableRef, setMessage }) => {
    const [record, setRecord] = useState({ ...emptyRecord });
    const [errors, setErrors] = useState({ ...emptyErrors });
    const [errorMessage, setErrorMessage] = useState('');
    const [loading, setLoading] = useState(false);

    const [thirdParties, setThirdParties] = useState([]);
    const [bankAccounts, setBankAccounts] = useState([]);

    useEffect(() => {
        loadThirdParties();
        loadBankAccounts();
    }, []);

    const loadThirdParties = async () => {
        try {
            const { data } = await fetchHelper.post(
                // catalogo de terceros
                base_url(['api', 'v1', 'third-parties', 'search']),
                { length: -1, columns: [] },
                {},
                0
            );
            const list = Array.isArray(data) ? data : data?.data || [];
            setThirdParties(list.map((tp) => ({
                id: tp.id,
                name: `${tp.nit || ''} - ${tp.businessName || ''}`.trim(),
            })));
        } catch (e) {
            console.log('Error cargando terceros:', e);
        }
    };

    const loadBankAccounts = async () => {
        try {
            const { data } = await fetchHelper.post(
                base_url(['api', 'v1', 'bank-accounts', 'search']),
                { length: -1, columns: [] },
                {},
                0
            );
            const list = Array.isArray(data) ? data : data?.data || [];
            setBankAccounts(list.map((ba) => ({
                id: ba.id,
                name: `${ba.accountName || ''} - ${ba.accountNumber || ''}`.trim(),
            })));
        } catch (e) {
            console.log('Error cargando cuentas bancarias:', e);
        }
    };

    useEffect(() => {
        setErrors({ ...emptyErrors });
        setErrorMessage('');
    }, [record]);

    const validate = () => {
        const next = { ...emptyErrors };
        let valid = true;

        if (!record.thirdPartyId) {
            next.thirdPartyId = 'Debe seleccionar un cliente';
            valid = false;
        }
        if (!record.amount || Number(record.amount) <= 0) {
            next.amount = 'El monto debe ser mayor a cero';
            valid = false;
        }
        if (!record.advanceDate) {
            next.advanceDate = 'La fecha del anticipo es obligatoria';
            valid = false;
        }

        setErrors(next);
        return valid;
    };

    const handleSubmit = async () => {
        if (!validate()) return;

        const payload = {
            thirdPartyId: Number(record.thirdPartyId),
            amount: Number(record.amount),
            advanceDate: record.advanceDate,
            advanceReference: record.advanceReference.trim() || null,
            bankAccountId: record.bankAccountId ? Number(record.bankAccountId) : null,
            bankMovementId: record.bankMovementId ? Number(record.bankMovementId) : null,
            notes: record.notes.trim() || null,
        };

        try {
            setLoading(true);
            await fetchHelper.post(base_url(['api', 'v1', 'ar', 'advances']), payload, {}, 1000);

            dataTableRef?.current?.ajax.reload();
            modalInstance?.current?.hide();
            setRecord({ ...emptyRecord });
            setMessage({ type: 'success', show: true, message: 'Anticipo registrado exitosamente.' });
        } catch (error) {
            const backendErrors = error?.errors;
            if (Array.isArray(backendErrors) && backendErrors.length > 0) {
                const next = { ...emptyErrors };
                backendErrors.forEach((item) => {
                    if (item.field) next[item.field] = item.message;
                });
                setErrors(next);
            } else {
                setErrorMessage(error?.msg || 'Error al registrar el anticipo.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleClear = () => {
        setRecord({ ...emptyRecord });
        setErrors({ ...emptyErrors });
        setErrorMessage('');
    };

    return (
        <div className="modal fade" ref={modalRef} id="modalCreateArAdvance" tabIndex={-1} aria-hidden="true">
            <div className="modal-dialog modal-lg modal-dialog-centered" role="document">
                <div className="modal-content">
                    <div className="modal-header">
                        <h4 className="modal-title">Registrar Anticipo de Cliente</h4>
                        <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close" />
                    </div>

                    <div className="modal-body">
                        <AlertPage
                            message={errorMessage}
                            type="danger"
                            show={errorMessage !== ''}
                            onChange={() => setErrorMessage('')}
                        />

                        <div className="row">
                            <div className="col-md-6 mb-4 mt-2">
                                <InputSelectModal
                                    id="ar_adv_third"
                                    label="Cliente"
                                    value={String(record.thirdPartyId || '')}
                                    onChange={(value) => setRecord((prev) => ({ ...prev, thirdPartyId: value }))}
                                    error={errors.thirdPartyId}
                                    placeholder="Seleccione cliente"
                                    options={thirdParties}
                                    required
                                />
                            </div>
                            <div className="col-md-6 mb-4 mt-2">
                                <InputModal
                                    type="number"
                                    id="ar_adv_amount"
                                    label="Monto del Anticipo"
                                    value={record.amount}
                                    onChange={(e) => setRecord((prev) => ({ ...prev, amount: e.target.value }))}
                                    error={errors.amount}
                                    placeholder="0.00"
                                    min={0}
                                    required
                                />
                            </div>
                        </div>

                        <div className="row">
                            <div className="col-md-6 mb-4 mt-2">
                                <InputDate
                                    id="ar_adv_date"
                                    label="Fecha del Anticipo"
                                    date={record.advanceDate}
                                    onChange={(date) => setRecord((prev) => ({ ...prev, advanceDate: date || '' }))}
                                    error={errors.advanceDate}
                                    placeholder="yyyy-mm-dd"
                                    dateFormat="Y-m-d"
                                    required
                                />
                            </div>
                            <div className="col-md-6 mb-4 mt-2">
                                <InputModal
                                    type="text"
                                    id="ar_adv_reference"
                                    label="Referencia"
                                    value={record.advanceReference}
                                    onChange={(e) => setRecord((prev) => ({ ...prev, advanceReference: e.target.value }))}
                                    error={errors.advanceReference}
                                    placeholder="Numero de referencia"
                                />
                            </div>
                        </div>

                        <div className="row">
                            <div className="col-md-6 mb-4 mt-2">
                                <InputSelectModal
                                    id="ar_adv_bank"
                                    label="Cuenta Bancaria"
                                    value={String(record.bankAccountId || '')}
                                    onChange={(value) => setRecord((prev) => ({ ...prev, bankAccountId: value }))}
                                    error={errors.bankAccountId}
                                    placeholder="Seleccione cuenta"
                                    options={bankAccounts}
                                />
                            </div>
                            <div className="col-md-6 mb-4 mt-2">
                                <InputModal
                                    type="number"
                                    id="ar_adv_bank_movement"
                                    label="ID Movimiento Bancario"
                                    value={record.bankMovementId}
                                    onChange={(e) => setRecord((prev) => ({ ...prev, bankMovementId: e.target.value }))}
                                    error={errors.bankMovementId}
                                    placeholder="Id del movimiento origen"
                                />
                            </div>
                        </div>

                        <div className="row">
                            <div className="col-12 mb-4 mt-2">
                                <InputModal
                                    type="text"
                                    id="ar_adv_notes"
                                    label="Notas"
                                    value={record.notes}
                                    onChange={(e) => setRecord((prev) => ({ ...prev, notes: e.target.value }))}
                                    error={errors.notes}
                                    placeholder="Observaciones"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="modal-footer">
                        <button type="button" className="btn btn-primary ms-auto" onClick={handleSubmit} disabled={loading}>
                            {loading ? 'Guardando...' : 'Guardar'}
                        </button>
                        <button type="button" className="btn btn-danger" onClick={handleClear} disabled={loading}>
                            Limpiar
                        </button>
                        <button type="button" className="btn btn-outline-secondary" data-bs-dismiss="modal" disabled={loading}>
                            Volver
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreateArAdvance;
