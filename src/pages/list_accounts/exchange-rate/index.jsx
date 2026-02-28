import { useEffect, useRef, useState } from "react";
import AlertPage from "../../../components/molecules/AlertPage";
import DataTableReference from "../../../components/organism/DataTable";
import { base_url } from "../../../utils/functions";
import { fetchHelper } from "../../../utils/fetch";
import CreateExchangeRate from "./create";
import { useSelector } from "react-redux";

const ExchangeRateIndex = () => {

    const userPermissions = useSelector(state => state.user.user)?.permissions?.filter(p => {return p.code.includes('EXCHANGE_RATES')})|| []; // Permisos del usuario

    // Referencias para demas components
    const tableRef = useRef(null);
    const dataTableRef = useRef(null);

    const modalCreateRef = useRef(null);
    const modalCreateInstance = useRef(null);

    const exchangeRateBase = {
        currencyId: null,
        currencyIso: null,
        exchangeType: null,
        value: null,
        startDate: null,
        endDate: null,
        status: null
    }

    const [exchangeRate, setExchangeRate] = useState(exchangeRateBase); // Info para el envio de datos
    const [exchangeRateMessage, setExchangeRateMessage] = useState({
        message: '',
        type: '',
        show: false,
    }); // Info para la alerta de envio de datos
    
    const [search, setSearch] = useState({
        value: '',
        checked: true,
    }); // Info para el filtrado de datos

    const [data, setData] = useState([]); // Info para el datatable

    // Acciones para el datatable
    const actions = [
        { key: 'view', icon: 'ri-eye-line', class: 'btn-label-info', title: 'Ver' },
        { key: 'edit', icon: 'ri-edit-line', class: 'btn-label-primary', title: 'Editar' },
        { key: 'delete', icon: 'ri-delete-bin-5-line', class: 'btn-label-danger', title: 'Eliminar' },
    ];

    // Datos para el datatable
    const columns = [
        {
            title: 'Moneda de origen',
            data: 'currencyExchange.name',
        },
        {
            title: 'Moneda de destino',
            data: 'currencyExchanged.name',
        },
        {
            title: 'Tasa de cambio',
            data: 'value',
        },
        {
            title: 'Fecha de inicio',
            data: 'startDate',
        },
        {
            title: 'Fecha de fin',
            data: 'endDate',
        },
        {
            title: 'Estado',
            data: 'status',
        }
    ];

    // Botones para el datatable
    const buttons = [
        ...(userPermissions.some(p => p.code === 'CREATE_EXCHANGE_RATES' && p.type === 'CREATE') ? [{
            text: '<i class="ri-add-line ri-16px me-sm-2"></i> <span class="d-none d-sm-inline-block">Crear tasa de cambio</span>',
            className: 'btn rounded-pill btn-primary waves-effect mx-2 my-2 ',
            action: async function (e, dt, button, config) {
                openModalCreate()
            }
        }] : [])
    ];

    const [currencies, setCurrencies] = useState([]);

    useEffect(() => {

        const getCurrencies = async () => {
            const url_currency = base_url(['/api/v1/accounting-lists/currency-types/search']);

            const { data } = await fetchHelper.post(url_currency, {length: -1}, {}, 0, false);

            setCurrencies(data);
        }

        getCurrencies();

    }, []);

    const openModalCreate = () => {
        if (!modalCreateInstance.current) {
            modalCreateInstance.current = new window.bootstrap.Modal(modalCreateRef.current);
        }
        setExchangeRate(exchangeRateBase);
        setExchangeRateMessage({
            message: '',
            type: '',
            show: false,
        });
        modalCreateInstance.current.show();
    }

    return (
        <div className="card">
            <h5 className="card-header text-md-start text-center">Taza de Cambio</h5>

            <AlertPage message={exchangeRateMessage.message} type={exchangeRateMessage.type} show={exchangeRateMessage.show} onChange={() => setExchangeRateMessage({
                message: '',
                type: '',
                show: false,
            })} />

            <div className="card-datatable text-nowrap">
                <DataTableReference
                    url_api={['api/v1/exchange-rates/search']}
                    columns={columns}
                    tableRef={tableRef}
                    dataTableRef={dataTableRef}
                    method='POST'
                    buttons={buttons}
                    title='Taza de Cambio'
                    setData={setData}
                    search={search}
                    setSearch={setSearch}
                    filtered={true}
                />
            </div>

            <CreateExchangeRate
                dataTableRef={dataTableRef}
                modalRef={modalCreateRef}
                modalInstance={modalCreateInstance}
                exchangeRate={exchangeRate}
                setExchangeRate={setExchangeRate}
                setExchangeRateMessage={setExchangeRateMessage}
                currencies={currencies}
            />

        </div>
    )
}

export default ExchangeRateIndex;