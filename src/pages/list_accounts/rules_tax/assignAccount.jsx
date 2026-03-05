import { useEffect, useState } from "react";
import AlertPage from "../../../components/molecules/AlertPage";
import { fetchHelper } from "../../../utils/fetch";
import { base_url } from "../../../utils/functions";
import InputSelectModal from "../../../components/molecules/inputSelectModal";

const AssignAccount = ({ ruler, accountingAccounts, modalRef, modalInstance, dataTableRef, setRulesTaxMessage}) => {

    const [error, setError] = useState({
        message: '',
        type: '',
        show: false,
    });

    const [errors, setErrors] = useState([]);

    const [rulerAccountingAccounts, setRulerAccountingAccounts] = useState({
        rulerTaxId: null,
        accountingAccountIds: [],
    });

    useEffect(() => {
        setRulerAccountingAccounts({
            rulerTaxId: ruler.id,
            accountingAccountIds: ruler.accountingAccountIds,
        });
    }, [ruler]);

    useEffect(() => {
        console.log(ruler);
        console.log(rulerAccountingAccounts);

    }, [rulerAccountingAccounts]);

    const handleSave = async () => {
        try{
            const url = base_url(['api', 'v1', 'ruler-tax', 'accounting-accounts']);
            const response = await fetchHelper.post(url, rulerAccountingAccounts, {}, 500);
            dataTableRef?.current?.ajax.reload();
            modalInstance?.current?.hide();
            setErrors({});
            setError({ message: '', type: '', show: false });
            setRulesTaxMessage({ message: response.msg || response.message || 'Cuenta contable asignada correctamente', type: 'success', show: true });
        } catch (error) {
            console.error('Error al asignar cuenta contable a regla de impuesto:', error);
            const errores = error?.errors;
            if (errores && errores.length > 0) {
                const fieldErrors = {};
                errores.forEach(err => { fieldErrors[err.field] = err.message; });
                setErrors(fieldErrors);
            } else if (error?.msg) {
                setError({ message: error.msg, type: 'danger', show: true });
            }
        }
    }
    return (
        <div className="modal fade" ref={modalRef} id="modalCenter" tabIndex={-1} aria-hidden="true">
            <div className="modal-dialog modal-dialog-centered" role="document">
                <div className="modal-content">
                    <div className="modal-header">
                        <h4 className="modal-title" id="modalCenterTitle">Asignar cuenta contable a regla de impuesto: {ruler.name}</h4>
                        <button
                            type="button"
                            className="btn-close"
                            data-bs-dismiss="modal"
                            aria-label="Close"></button>
                    </div>
                    <div className="modal-body">
                        <AlertPage
                            message={error.message}
                            type={error.type}
                            show={error.show}
                            onChange={() => setError({ message: '', type: '', show: false })}
                        />

                        <div className="row">
                            <div className="col-lg-12 col-md-12 col-sm-12 mb-6 mt-2">
                                <InputSelectModal
                                    id="accountingAccounts"
                                    label="Cuentas contables"
                                    value={rulerAccountingAccounts.accountingAccountIds?.filter(a => a != null && a != undefined && a != '')}
                                    onChange={(value) => {
                                        console.log(value);
                                        setRulerAccountingAccounts({ ...rulerAccountingAccounts, accountingAccountIds: value });
                                        setErrors((prev) => ({
                                            ...prev,
                                            accountingAccountIds: '',
                                        }))
                                    }}
                                    options={accountingAccounts.map(accountingAccount => ({
                                        label: accountingAccount.customName,
                                        id: accountingAccount.id,
                                    }))}
                                    error={errors.accountingAccountIds}
                                    placeholder="Selecciona las cuentas contables"
                                    multiple={true}
                                    required={true}
                                />
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                            <button type="button" className="btn btn-primary" onClick={handleSave}>Guardar</button>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};

export default AssignAccount;