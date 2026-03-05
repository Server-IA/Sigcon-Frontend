import { useEffect, useRef, useState } from "react";
import DataTableReference from "../../../components/organism/DataTable";
import AlertPage from "../../../components/molecules/AlertPage";
import { base_url } from "../../../utils/functions";
import { useSelector } from "react-redux";
import CurrencyCreated from "./created";
import CurrencyEdit from "./edit";
import { fetchHelper } from "../../../utils/fetch";

const CurrencyIndex = () => {

    const userPermissions = useSelector(state => state.user.user)?.permissions?.filter(p => {return p.code.includes('CURRENCY_TYPE')})|| []; // Permisos del usuario
    const isAdmin = useSelector(state => state.user.user)?.isAdmin || false; // Verificar si el usuario es admin

    const [message, setMessage] = useState({ message: '', type: '', show: false });
    const [search, setSearch] = useState({
        checked: true,
        value: '',
    });
    const currencyBase = {
        isoCode: '',
        name: '',
        status: 'ACTIVE',
    }

    const [currency, setCurrency] = useState(currencyBase);
    const [data, setData] = useState([]);

    // Referencias
    const tableRef = useRef(null);
    const dataTableRef = useRef(null);
    const modalCreateRef = useRef(null);
    const modalCreateInstance = useRef(null);
    const modalEditRef = useRef(null);
    const modalEditInstance = useRef(null);
    
    const openModalCreate = () => {
        if (!modalCreateInstance.current) {
            modalCreateInstance.current = new window.bootstrap.Modal(modalCreateRef.current);
        }
        setCurrency(currencyBase);
        setMessage({ message: '', type: '', show: false });
        modalCreateInstance.current.show();
    }

    const openModalEdit = () => {
        if (!modalEditInstance.current) {
            modalEditInstance.current = new window.bootstrap.Modal(modalEditRef.current);
        }
        setMessage({ message: '', type: '', show: false });
        modalEditInstance.current.show();
    }

    // Datos DataTable
    const buttons = [
            ...(userPermissions.some(p => p.code === 'CREATE_CURRENCY_TYPE' && p.type === 'CREATE') || isAdmin ?  [{
            text: '<i class="ri-add-line ri-16px me-sm-2"></i> <span class="d-none d-sm-inline-block">Crear tipo de moneda</span>',
            className: 'btn rounded-pill btn-primary waves-effect mx-2 my-2 ',
            action: async function (e, dt, button, config) {
                openModalCreate()
            }
        }] : [])
    ];
    const actions = [
        ...(userPermissions.some(p => p.code === 'UPDATE_CURRENCY_TYPE' && p.type === 'UPDATE') || isAdmin ? [
            { key: 'edit', icon: 'ri-edit-line', class: 'btn-label-primary', title: 'Editar' }
        ] : []),
        ...(userPermissions.some(p => p.code === 'DELETE_CURRENCY_TYPE' && p.type === 'DELETE') || isAdmin ? [
            { key: 'delete', icon: 'ri-delete-bin-line', class: 'btn-label-danger', title: 'Eliminar' }
        ] : [])
    ];
    const columns = [
        {title: 'Código', data: 'isoCode'},
        {title: 'Nombre', data: 'name'},
        {title: 'Estado', data: 'status', render: (status) => status === 'ACTIVE'
            ? `<span class="badge bg-label-success">Activa</span>`
            : `<span class="badge bg-label-danger">Inactiva</span>`
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

    useEffect(() => {
        const table = dataTableRef?.current;
        if (!table) return;

        const handler = function () {
            const action = $(this).data('action');
            const id     = Number($(this).data('id'));
            const currencyRef = data.find(m => m.id === id);

            if (!currencyRef) {
                console.warn('Tipo de moneda no encontrada', id);
                return;
            }

            setCurrency({
                id:              currencyRef.id              ?? '',
                isoCode:         currencyRef.isoCode         ?? '',
                name:            currencyRef.name            ?? '',
                status:          currencyRef.status          ?? 'ACTIVE',
            });

            switch (action) {
                case 'edit':
                    openModalEdit();
                    break;

                case 'delete':
                    window.Swal.fire({
                        title: '¿Está seguro?',
                        text: `¿Está seguro de eliminar el tipo de moneda "${currencyRef.name} (${currencyRef.isoCode})"?`,
                        icon: 'warning',
                        showCancelButton: true,
                        confirmButtonText: 'Sí, continuar',
                        cancelButtonText: 'Cancelar',
                    }).then(async (result) => {
                        if (!result.isConfirmed) return;
                        try {
                            const deleteUrl = base_url(['api', 'v1', 'accounting-lists', 'currency-types', id]);
                            await fetchHelper.delete(deleteUrl, {}, {}, 500, false);
                            dataTableRef?.current?.ajax.reload();
                            setMessage({
                                message: 'Tipo de moneda eliminada exitosamente',
                                type: 'success',
                                show: true,
                            });
                        } catch (error) {
                            console.error(error);
                            window.Swal.fire({
                                title: 'Error',
                                text: error?.msg || 'Error al eliminar el tipo de moneda',
                                icon: 'error',
                                confirmButtonText: 'Cerrar',
                                showCancelButton: false,
                                allowOutsideClick: false,
                            });
                        }
                    });
                    break;

                default:
                    console.warn('Acción no válida', action);
                    break;
            }
        };

        table.on('click', '.action-btn', handler);
        return () => { table.off('click', '.action-btn', handler); };
    }, [data]);



    return (
        <>
            <div className="card">
                <h5 className="card-header text-md-start text-center">Tipos de Monedas</h5>

                <AlertPage type={message.type} message={message.message} show={message.show} onChange={() => setMessage({ message: '', type: '', show: false })} />

                <div className="card-datatable text-nowrap">
                    <DataTableReference
                        url_api={['api', 'v1', 'accounting-lists', 'currency-types', 'search']}
                        columns={columns}
                        tableRef={tableRef}
                        dataTableRef={dataTableRef}
                        method='POST'
                        buttons={buttons}
                        title='Tipos de Monedas'
                        setData={setData}
                        search={search}
                        setSearch={setSearch}
                        filtered={true}
                    />
                </div>
            </div>

            {
                userPermissions.some(p => p.code === 'CREATE_CURRENCY_TYPE' && p.type === 'CREATE') || isAdmin && (
                    <CurrencyCreated
                        dataTableRef={dataTableRef}
                        modalRef={modalCreateRef}
                        modalInstance={modalCreateInstance}
                        currency={currency}
                        setCurrency={setCurrency}
                        setMessage={setMessage}
                    />
                )
            }

            {
                userPermissions.some(p => p.code === 'UPDATE_CURRENCY_TYPE' && p.type === 'UPDATE') || isAdmin && (
                    <CurrencyEdit
                        dataTableRef={dataTableRef}
                        modalRef={modalEditRef}
                        modalInstance={modalEditInstance}
                        currency={currency}
                        setCurrency={setCurrency}
                        setMessage={setMessage}
                    />
                )
            }
        </>
    )
};

export default CurrencyIndex;