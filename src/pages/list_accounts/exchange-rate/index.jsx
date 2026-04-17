import { useEffect, useRef, useState } from "react";
import AlertPage from "../../../components/molecules/AlertPage";
import DataTableReference from "../../../components/organism/DataTable";
import { base_url } from "../../../utils/functions";
import { fetchHelper } from "../../../utils/fetch";
import CreateExchangeRate from "./create";
import { useSelector } from "react-redux";
import UpdateExchangeRate from "./update";

const ExchangeRateIndex = () => {

    const userPermissions = useSelector(state => state.user.user)?.permissions?.filter(p => {return p.code.includes('EXCHANGE_RATES')})|| []; // Permisos del usuario
    const isAdmin = useSelector(state => state.user.user)?.isAdmin || false; // Verificar si el usuario es admin

    // Referencias para demas components
    const tableRef = useRef(null);
    const dataTableRef = useRef(null);

    const modalCreateRef = useRef(null);
    const modalCreateInstance = useRef(null);

    const modalUpdateRef = useRef(null);
    const modalUpdateInstance = useRef(null);

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
        // { key: 'view', icon: 'ri-eye-line', class: 'btn-label-info', title: 'Ver' },
        ...(userPermissions.some(p => p.code === 'UPDATE_EXCHANGE_RATES' && p.type === 'UPDATE') || isAdmin ? [{ key: 'edit', icon: 'ri-edit-line', class: 'btn-label-primary', title: 'Editar' }] : []),
        ...(userPermissions.some(p => p.code === 'DELETE_EXCHANGE_RATES' && p.type === 'DELETE') || isAdmin ? [{ key: 'delete', icon: 'ri-delete-bin-5-line', class: 'btn-label-danger', title: 'Eliminar' }] : []),
    ];

    // Datos para el datatable
    const columns = [
        {
            title: 'Moneda de origen',
            data: 'currencyExchange.name',
            searchable: false,
            orderable: false,
            defaultContent: '-',
        },
        {
            title: 'Moneda de destino',
            data: 'currencyExchanged.name',
            searchable: false,
            orderable: false,
            defaultContent: '-',
        },
        {
            title: 'Tasa de cambio',
            data: 'value',
        },
        {
            title: 'Fecha de inicio',
            data: 'startDate',
            searchable: false
        },
        {
            title: 'Fecha de fin',
            data: 'endDate',
            searchable: false
        },
        {
            title: 'Estado',
            data: 'status',
        },
        {title: 'Acciones', width: '100px', data: 'id', render: (id) => `
            <div class="d-flex gap-1">
                ${actions.map(a => `
                    <button class="btn btn-sm ${a.class} action-btn"
                        data-action="${a.key}"
                        data-id="${id}"
                        title="${a.title}">
                        <i class="${a.icon}"></i>
                    </button>
                `).join('')}
            </div>    
        `, searchable: false},
    ];

    // Botones para el datatable
    const buttons = [
        ...(userPermissions.some(p => p.code === 'CREATE_EXCHANGE_RATES' && p.type === 'CREATE') || isAdmin ? [{
            text: '<i class="ri-add-line ri-16px me-sm-2"></i> <span class="d-none d-sm-inline-block">Crear tasa de cambio</span>',
            className: 'btn rounded-pill btn-primary waves-effect mx-2 my-2 ',
            action: async function (e, dt, button, config) {
                setExchangeRate(exchangeRateBase);
                setExchangeRateMessage({
                    message: '',
                    type: '',
                    show: false,
                });
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

    useEffect(() => {
        
        const table = dataTableRef?.current;
        if (!table) return;
        const handler = function () {
            const action = $(this).data('action');
            const id     = Number($(this).data('id'));
            const exchangeRateRef = data.find(e => e.id === id);

            console.log("exchangeRateRef", exchangeRateRef);

            if (!exchangeRateRef) {
                console.warn('Tasa de cambio no encontrada', id);
                return;
            }

            setExchangeRate({
                id: exchangeRateRef.id,
                currencyId: exchangeRateRef.currencyExchange.id,
                currencyIso: exchangeRateRef.currencyExchanged.id,
                exchangeType: exchangeRateRef.exchangeType,
                value: exchangeRateRef.value,
                startDate: exchangeRateRef.startDate,
                endDate: exchangeRateRef.endDate,
                status: exchangeRateRef.status,
            });
            switch (action) {
                case 'edit':
                    openModalUpdate(id);
                    break;

                case 'delete':
                    window.Swal.fire({
                        title: '¿Está seguro?',
                        text: `¿Está seguro de eliminar la tasa de cambio?`,
                        cancelButtonText: 'Cancelar',
                        customClass: {
                            confirmButton: 'btn btn-primary waves-effect',
                            cancelButton: 'btn btn-danger waves-effect'
                        }

                        
                    }).then(async (result) => {
                        if (!result.isConfirmed) return;
                        try {
                            const deleteUrl = base_url(['api', 'v1', 'exchange-rates', id]);
                            const { message } = await fetchHelper.delete(deleteUrl, {}, {}, 1000);
                            setExchangeRateMessage({ message: message, type: 'success', show: true });
                            dataTableRef.current.draw(false);
                        } catch (error) {
                            console.log(error);
                            setExchangeRateMessage({ message: error.message || error.msg || "Ocurrió un error al eliminar la tasa de cambio", type: 'danger', show: true });
                        }
                    });
                    break;
                default:
                    console.warn('Acción no válida', action);
                    break;
            }
        }
        
        table.on('click', '.action-btn', handler);
        return () => { table.off('click', '.action-btn', handler); };
    }, [data]);

    const openModalUpdate = (id) => {
        if (!modalUpdateInstance.current) {
            modalUpdateInstance.current = new window.bootstrap.Modal(modalUpdateRef.current);
        }
        


        setExchangeRateMessage({
            message: '',
            type: '',
            show: false,
        });
        modalUpdateInstance.current.show();
    }
    return (
        <div className="card">
            <h5 className="card-header text-md-start text-center">Tasa de Cambio</h5>

            <AlertPage message={exchangeRateMessage.message} type={exchangeRateMessage.type} show={exchangeRateMessage.show} onChange={() => setExchangeRateMessage({
                message: '',
                type: '',
                show: false
            })} />

            <div className="card-datatable text-nowrap">
                <DataTableReference
                    url_api={['api/v1/exchange-rates/search']}
                    columns={columns}
                    tableRef={tableRef}
                    dataTableRef={dataTableRef}
                    method='POST'
                    buttons={buttons}
                    title='Tasa de Cambio'
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

            <UpdateExchangeRate
                dataTableRef={dataTableRef}
                modalRef={modalUpdateRef}
                modalInstance={modalUpdateInstance}
                exchangeRate={exchangeRate}
                setExchangeRate={setExchangeRate}
                setExchangeRateMessage={setExchangeRateMessage}
                currencies={currencies}
            />

        </div>
    )
}

export default ExchangeRateIndex;