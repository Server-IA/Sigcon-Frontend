import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import InputModal from "../../components/molecules/InputModal";
import InputModalSelect from "../../components/molecules/inputSelectModal";
import { base_url } from "../../utils/functions";
import { fetchHelper } from "../../utils/fetch";

const CreateInvoice = () => {

    const { type } = useParams();
    const [errors, setErrors] = useState({});

    const [paymentForms, setPaymentForms] = useState([]);
    const [thirdParties, setThirdParties] = useState([]);

    const INVOICE_TYPES = {
        purchase: { name: 'compra', code: 'fc'}
    };

    const loadData = async () => {
        const [paymentFormsResponse, thirdPartiesResponse] = await Promise.all([
            await fetchHelper.post(base_url(['api/v1/resources/payment-forms']), {length: -1}, {}, 0, false),
            await fetchHelper.post(base_url(['api/v1/third-parties/search']), {length: -1}, {}, 0, false),
        ]);

        if (paymentFormsResponse.code === 200) {
            console.log(paymentFormsResponse.data);
            setPaymentForms(paymentFormsResponse.data);
        }
        if (thirdPartiesResponse.code === 200) {
            setThirdParties(thirdPartiesResponse.data);
        }
    }

    const invoiceBase = {
        paymentFormId: null,
        paymentMethodId: null,
        thirdPartyId: null,
        resolutionInvoice: null,
        invoiceDate: null,
        invoiceDueDay: null,
        notes: null,
        lineInvoices: [],
    };

    const [invoice, setInvoice] = useState({});

    useEffect(() => {
        setInvoice({ ...invoiceBase });
        loadData();
    }, []);

    return (
        <>

            <div className="card-body">
                <div className="row">
                    <div className="col-12">
                        <div className="card">
                            <div className="card-body">
                                <h5 className="card-title">Crear Factura de {INVOICE_TYPES[type].name}</h5>
                                <hr />
                                <div className="row">
                                    <div className="col-lg-4 col-md-12 col-sm-12">
                                        <InputModal
                                            label="Número de Factura"
                                            name="resolutionInvoice"
                                            type="text"
                                            placeholder="Ingrese el número de factura"
                                            value={invoice.resolutionInvoice}
                                            onChange={e => setInvoice({ ...invoice, resolutionInvoice: e.target.value })}
                                            error={errors.resolutionInvoice}
                                            required={true}
                                        />
                                    </div>
                                    <div className="col-lg-4 col-md-12 col-sm-12">
                                        <InputModalSelect
                                            label="Forma de Pago"
                                            name="paymentFormId"
                                            options={paymentForms}
                                            value={invoice.paymentFormId}
                                            onChange={value => {
                                                setInvoice({ ...invoice, paymentFormId: value })
                                                setErrors({ ...errors, paymentFormId: null })
                                            }}
                                            error={errors.paymentFormId}
                                            required={true}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default CreateInvoice;

