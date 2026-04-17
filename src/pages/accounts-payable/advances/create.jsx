import { useEffect, useState } from 'react';

import InputModal from '../../../components/molecules/InputModal';
import InputSelectModal from '../../../components/molecules/inputSelectModal';
import AlertPage from '../../../components/molecules/AlertPage';
import InputDate from '../../../components/molecules/InputDate';

import { base_url } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';

/**
 * Modal para registrar un Anticipo a Proveedor.
 * Envia POST a /api/v1/ap/advances/store.
 */

const emptyErrors = {
    thirdPartyId: '',
    amount: '',
    advanceDate: '',
    bankAccountId: '',
    notes: '',
};

const emptyRecord = {
    thirdPartyId: '',
    amount: '',
    advanceDate: '',
    bankAccountId: '',
    notes: '',
};

const CreateApAdvance = ({ modalRef, modalInstance, dataTableRef, setMessage }) => {
    const [record, setRecord] = useState({ ...emptyRecord });
    const [errors, setErrors] = useState({ ...emptyErrors });
    const [errorMessage, setErrorMessage] = useState('');
    const [loading, setLoading] = useState(false);

    const [suppliers, setSuppliers] = useState([]);
    const [bankAccounts, setBankAccounts] = useState([]);

    useEffect(() => {
        loadSuppliers();
        loadBankAccounts();
    }, []);

    const loadSuppliers = async () => {
        try {
            const { data } = await fetchHelper.post(
                base_url(['api', 'v1', 'third-parties', 'search']),
                { length: -1, columns: [] },
                {},
                0
            );
            if (Array.isArray(data)) {
                setSuppliers(data.map((t) => ({
                    id: t.id,
                    name: `${t.documentNumber || ''} - ${t.businessName || t.firstName || ''}`.trim(),
                })));
            }
        } catch (e) {
            console.log('Error cargando proveedores:', e);
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
            if (Array.isArray(data)) {
                setBankAccounts(data.map((ba) => ({
                    id: ba.id,
                    name: `${ba.accountName || ''} - ${ba.accountNumber || ''}`.trim(),
                })));
            }
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
            next.thirdPartyId = 'Debe seleccionar un proveedor';
            valid = false;
        }
        if (!record.amount || Number(record.amount) <= 0) {
            next.amount = 'El monto debe ser mayor a cero';
            valid = false;
        }
        if (!record.advanceDate) {
            next.advanceDate = 'La fecha es obligatoria';
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
            bankAccountId: record.bankAccountId ? Number(record.bankAccountId) : null,
            notes: record.notes.trim() || null,
        };

        try {
            setLoading(true);
            await fetchHelper.post(base_url(['api', 'v1', 'ap', 'advances', 'store']), payload, {}, 1000);

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
        <div className="modal fade" ref={modalRef} id="modalCreateApAdvance" tabIndex={-1} aria-hidden="true">
            <div className="modal-dialog modal-lg modal-dialog-centered" role="document">
                <div className="modal-content">
                    <div className="modal-header">
                        <h4 className="modal-title">Registrar Anticipo</h4>
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
                                    id="ap_advance_third_party"
                                    label="Proveedor"
                                    value={String(record.thirdPartyId || '')}
                                    onChange={(value) => setRecord((prev) => ({ ...prev, thirdPartyId: value }))}
                                    error={errors.thirdPartyId}
                                    placeholder="Seleccione proveedor"
                                    options={suppliers}
                                    required
                                />
                            </div>
                            <div className="col-md-6 mb-4 mt-2">
                                <InputModal
                                    type="number"
                                    id="ap_advance_amount"
                                    label="Monto"
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
                                    id="ap_advance_date"
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
                                <InputSelectModal
                                    id="ap_advance_bank_account"
                                    label="Cuenta Bancaria / Caja"
                                    value={String(record.bankAccountId || '')}
                                    onChange={(value) => setRecord((prev) => ({ ...prev, bankAccountId: value }))}
                                    error={errors.bankAccountId}
                                    placeholder="Seleccione cuenta"
                                    options={bankAccounts}
                                />
                            </div>
                        </div>

                        <div className="row">
                            <div className="col-12 mb-4 mt-2">
                                <InputModal
                                    type="text"
                                    id="ap_advance_notes"
                                    label="Notas"
                                    value={record.notes}
                                    onChange={(e) => setRecord((prev) => ({ ...prev, notes: e.target.value }))}
                                    error={errors.notes}
                                    placeholder="Observaciones opcionales"
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

export default CreateApAdvance;
