import { useState } from "react";
import InputSelectModal from "../../../components/molecules/inputSelectModal";
import AlertPage from "../../../components/molecules/AlertPage";
import InputModal from "../../../components/molecules/InputModal";
import InputDateRange from "../../../components/molecules/InputDateRange";
import { base_url } from "../../../utils/functions";
import { fetchHelper } from "../../../utils/fetch";

const UpdateExchangeRate = ({ dataTableRef, modalRef, modalInstance, exchangeRate, setExchangeRate, setExchangeRateMessage, currencies }) => {

    const [error, setError] = useState({
        message: '',
        type: '',
        show: false,
    });

    const [errors, setErrors] = useState([]);

    const handleSave = async () => {
        let valid = true;
        let errors = [];
        if (!exchangeRate.currencyId) {
            errors.push({ field: 'currencyId', message: 'La moneda a cambiar es requerida' });
        }
        if (!exchangeRate.currencyIso) {
            errors.push({ field: 'currencyIso', message: 'La moneda de cambio es requerida' });
        }
        if (!exchangeRate.exchangeType) {
            errors.push({ field: 'exchangeType', message: 'El tipo de cambio es requerido' });
        }
        if (!exchangeRate.value) {
            errors.push({ field: 'value', message: 'La tasa de cambio es requerida' });
        }
        if (!exchangeRate.startDate) {
            errors.push({ field: 'startDate', message: 'La fecha de inicio es requerida' });
        }
        if (!exchangeRate.endDate) {
            errors.push({ field: 'endDate', message: 'La fecha de fin es requerida' });
        }
        if (errors.length > 0) {
            setErrors(errors);
            return;
        }

        try{

            const url = base_url(['api/v1/exchange-rates', exchangeRate.id]);

            console.log("exchangeRate", exchangeRate);
            const responde = await fetchHelper.put(url, exchangeRate, {}, 1000);

            setExchangeRateMessage({ message: responde.message, type: "success", show: true });

            modalInstance.current.hide();
            dataTableRef.current.draw(false);
            setError([])

        }catch(error){
            console.log(error);
            setError({
                message: error.message || error.msg || "Ocurrió un error al actualizar la tasa de cambio",
                type: 'danger',
                show: true
            });
            return;
        }
    }

    return (
        <div className="modal fade" ref={modalRef} id="modalCenter" tabIndex={-1} aria-hidden="true">
            <div className="modal-dialog modal-dialog-centered" role="document">
                <div className="modal-content">
                    <div className="modal-header">
                        <h4 className="modal-title" id="modalCenterTitle">Actualizar Tasa de Cambio</h4>
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
                            <div className="col-lg-6 col-md-12 col-sm-12 mb-6 mt-2">
                                <InputSelectModal
                                    id="currencyId_update"
                                    label="Moneda a Cambiar"
                                    value={exchangeRate.currencyId}
                                    onChange={(value) => {
                                        setExchangeRate({ ...exchangeRate, currencyId: value })
                                        setErrors((prev) => ({
                                            ...prev,
                                            currencyId: '',
                                        }))
                                    }}
                                    error={errors.currencyId}
                                    placeholder="Moneda a Cambiar"
                                    required={true}
                                    options={currencies.map(currency => ({
                                        id: currency.id,
                                        label: currency.isoCode + ' - ' + currency.name
                                    }))}
                                />
                            </div>

                            <div className="col-lg-6 col-md-12 col-sm-12 mb-6 mt-2">
                                <InputSelectModal
                                    id="currencyIso_update"
                                    label="Moneda de Cambio"
                                    value={exchangeRate.currencyIso}
                                    onChange={(value) => {
                                        setExchangeRate({ ...exchangeRate, currencyIso: value })
                                        setErrors((prev) => ({
                                            ...prev,
                                            currencyIso: '',
                                        }))
                                    }}
                                    error={errors.currencyIso}
                                    placeholder="Moneda de Cambio"
                                    required={true}
                                    options={currencies
                                        .filter(currency => currency.id != exchangeRate.currencyId)
                                        .map(currency => ({
                                            id: currency.id,
                                            label: currency.isoCode + ' - ' + currency.name
                                        }))
                                    }
                                />
                            </div>
                        </div>
                        <div className="row">
                            <div className="col-lg-6 col-md-6 col-sm-12 mb-6 mt-2">
                                <InputSelectModal
                                    id="exchangeType_update"
                                    label="Tipo de cambio"
                                    value={exchangeRate.exchangeType}
                                    onChange={(value) => {
                                        setExchangeRate({ ...exchangeRate, exchangeType: value })
                                        setErrors((prev) => ({
                                            ...prev,
                                            exchangeType: '',
                                        }))
                                    }}
                                    error={errors.exchangeType}
                                    placeholder="Tipo de cambio"
                                    required={true}
                                    options={[{
                                        id: 'OFICIAL',
                                        label: 'Oficial'
                                    }, {
                                        id: 'PREFERENCIAL',
                                        label: 'Preferencial'
                                    }]}
                                />
                            </div>

                            <div className="col-lg-6 col-md-6 col-sm-12 mb-6 mt-2">
                                <InputModal
                                    id="exchangeRate_update"
                                    label="Tasa de cambio"
                                    value={exchangeRate.value}
                                    onChange={(e) => {
                                        setExchangeRate({ ...exchangeRate, value: e.target.value })
                                        setErrors((prev) => ({
                                            ...prev,
                                            value: '',
                                        }))
                                    }}
                                    error={errors.value}
                                    placeholder="Tasa de cambio"
                                    required={true}
                                    type="number"
                                />
                            </div>
                        </div>

                        <div className="row">
                            <div className="col mb-6 mt-2">
                                <InputDateRange
                                    id="dateRange_update"
                                    label="Fecha de vigencia"
                                    placeholder="Fecha de inicio y fin"
                                    dateInit={exchangeRate.startDate}
                                    dateEnd={exchangeRate.endDate}
                                    onChange={(dateInit, dateEnd) => {
                                        if (dateInit && dateEnd) {
                                            let startDate = new Date(dateInit);
                                            let endDate = new Date(dateEnd);

                                            startDate = startDate.toISOString().split('T')[0];
                                            endDate = endDate.toISOString().split('T')[0];

                                            setExchangeRate({ ...exchangeRate, startDate: startDate, endDate: endDate })
                                            setErrors((prev) => ({
                                                ...prev,
                                                startDate: null,
                                                endDate: null,
                                            }))
                                        }
                                    }}
                                    error={errors.startDate}
                                />
                            </div>
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-outline-secondary" data-bs-dismiss="modal">
                            Cerrar
                        </button>
                        <button type="button" className="btn btn-primary" onClick={handleSave}>Guardar</button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default UpdateExchangeRate;