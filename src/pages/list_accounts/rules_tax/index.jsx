import { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import AlertPage from "../../../components/molecules/AlertPage";
import DataTableReference from "../../../components/organism/DataTable";

import CreateRulesTax from "./create";
import UpdateRulesTax from "./update";
import AssignAccount from "./assignAccount";

import { base_url } from "../../../utils/functions";
import { fetchHelper } from "../../../utils/fetch";

const RulesTaxIndex = () => {

    const userPermissions = useSelector(state => state.user.user)?.permissions?.filter(p => {return p.code.includes('RULER_TAX')})|| []; // Permisos del usuario
    const isAdmin = useSelector(state => state.user.user)?.isAdmin || false; // Verificar si el usuario es admin

    const [accountingAccounts, setAccountingAccounts] = useState([]);
    useEffect(() => {
        setTimeout(() => {
            const fetchAccountingAccounts = async () => {
                const url = base_url(['api/v1/accounting-accounts']);
                const response = await fetchHelper.post(url, {length: -1}, {}, 0);
                setAccountingAccounts(response.data);
            }
            fetchAccountingAccounts();
        }, 1000);
    }, []);

    // Referencias para demas components
    const tableRef = useRef(null);
    const dataTableRef = useRef(null);

    const modalCreateRef = useRef(null);
    const modalCreateInstance = useRef(null);

    const modalUpdateRef = useRef(null);
    const modalUpdateInstance = useRef(null);

    const modalAssignAccountRef = useRef(null);
    const modalAssignAccountInstance = useRef(null);

    const typeRulerTaxOptions = [
        { value: 'TAX', label: 'Impuesto' },
        { value: 'WITHHOLDING', label: 'Retención' },
        { value: 'ADJUSTMENT', label: 'Ajuste' },
    ]

    const statusRulerTaxOptions = [
        { value: 'ACTIVE', label: 'Activo' },
        { value: 'INACTIVE', label: 'Inactivo' },
    ]

    const rulesTaxBase = {
        typeRulerTax: null,
        name: null,
        percentage: null,
        description: '',
        scope: '',
        dateStart: null,
        dateEnd: null,
        companyId: 1
    }

    const [rulesTax, setRulesTax] = useState(rulesTaxBase); // Info para el envio de datos
    const [rulesTaxMessage, setRulesTaxMessage] = useState({
        message: '',
        type: '',
        show: false,
    }); // Info para la alerta de envio de datos

    const [search, setSearch] = useState({
        value: '',
        checked: true
    }); // Info para el filtrado de datos

    const [data, setData] = useState([]); // Info para el datatable

    const openModalCreate = () => {
        if (!modalCreateInstance.current) {
            modalCreateInstance.current = new window.bootstrap.Modal(modalCreateRef.current);
        }
        setRulesTax(rulesTaxBase);
        setRulesTaxMessage({
            message: '',
            type: '',
            show: false,
        });
        modalCreateInstance.current.show();
    }

    const openModalUpdate = () => {
        if (!modalUpdateInstance.current) {
            modalUpdateInstance.current = new window.bootstrap.Modal(modalUpdateRef.current);
        }
        setRulesTaxMessage({
            message: '',
            type: '',
            show: false,
        });
        modalUpdateInstance.current.show();
    }

    const openModalAssignAccount = () => {
        if (!modalAssignAccountInstance.current) {
            modalAssignAccountInstance.current = new window.bootstrap.Modal(modalAssignAccountRef.current);
        }
        setRulesTaxMessage({
            message: '',
            type: '',
            show: false,
        });
        modalAssignAccountInstance.current.show();
    }

    const [columns, setColumns] = useState([
        {
            title: 'Nombre',
            data: 'name',
        },
        {
            title: 'Tarifa',
            data: 'percentage',
            render: (percentage) => {
                return `<span>${percentage != null ? `${Number(percentage).toFixed(2)}%` : '-'}</span>`
            }
        },
        {
            title: 'Descripción',
            data: 'description',
        },
        {
            title: 'Tipo de regla',
            data: 'typeRulerTax',
            searchable: false,
            render: (row) => {
                return `<span>${typeRulerTaxOptions.find(t => t.value === row)?.label}</span>`
            }   
        },
        {
            title: 'Alcance',
            data: 'scope',
        },
        {
            title: 'Fecha de inicio',
            data: 'dateStart',
            searchable: false,
        },
        {
            title: 'Fecha de fin',
            data: 'dateEnd',
            searchable: false,
        },
        {
            title: 'Estado',
            data: 'statusRulerTax',
            searchable: false,
            render: (status) => {
                return `<span class="badge bg-label-${status === 'ACTIVE' ? 'success' : 'danger'}">${status === 'ACTIVE' ? 'Activo' : 'Inactivo'}</span>`
            }
        },
        {
            title: 'Acciones',
            data: 'id',
            searchable: false,
            render: (id) => {
                return `<div class="d-flex gap-1">
                    ${actions.map(a => `
                        <button class="btn btn-sm ${a.class} action-btn"
                            data-action="${a.key}"
                            data-id="${id}"
                            title="${a.title}">
                            <i class="${a.icon}"></i>
                        </button>
                    `).join('')}
                </div>`
            }
        }
    ]); // Info para las columnas del datatable

    const [actions, setActions] = useState([
        ...(userPermissions.some(p => p.code === 'UPDATE_RULER_TAX' && p.type === 'UPDATE') || isAdmin ? [{ key: 'edit', icon: 'ri-edit-line', class: 'btn-label-primary', title: 'Editar' }] : []),
        ...(userPermissions.some(p => p.code === 'DELETE_RULER_TAX' && p.type === 'DELETE') || isAdmin ? [{ key: 'delete', icon: 'ri-delete-bin-5-line', class: 'btn-label-danger', title: 'Eliminar' }] : []),
        ...(userPermissions.some(p => p.code === 'ASSIGN_ACCOUNTING_ACCOUNT_TO_RULER_TAX' && p.type === 'ASSIGN') || isAdmin ? [{ key: 'assign', icon: 'ri-add-line', class: 'btn-label-primary', title: 'Asignar cuenta contable' }] : []),
    ]); // Info para los botones del datatable

    const [buttons, setButtons] = useState([
        ...(userPermissions.some(p => p.code === 'CREATE_RULER_TAX' && p.type === 'CREATE') || isAdmin ? [{
            text: '<i class="ri-add-line ri-16px me-sm-2"></i> <span class="d-none d-sm-inline-block">Crear regla de impuesto</span>    ',
            className: 'btn rounded-pill btn-primary waves-effect mx-2 my-2 ',
            action: async function (e, dt, button, config) {
                setRulesTax(rulesTaxBase);
                setRulesTaxMessage({
                    message: '',
                    type: '',
                    show: false,
                });
                openModalCreate()
            }
        }] : [])
    ]); // Info para los botones del datatable


    useEffect(() => {
        const table = dataTableRef?.current;
        if (!table) return;
        const handler = function () {
            const action = $(this).data('action');
            const id     = Number($(this).data('id'));
            const rulesTaxRef = data.find(r => r.id === id);

            console.log("rulesTaxRef", rulesTaxRef);

            if (!rulesTaxRef) {
                console.warn('Regla de impuesto no encontrada', id);
                return;
            }

            setRulesTax({
                id: rulesTaxRef.id,
                typeRulerTax: rulesTaxRef.typeRulerTax,
                name: rulesTaxRef.name,
                percentage: rulesTaxRef.percentage,
                description: rulesTaxRef.description,
                scope: rulesTaxRef.scope,
                statusRulerTax: rulesTaxRef.statusRulerTax,
                dateStart: rulesTaxRef.dateStart,
                dateEnd: rulesTaxRef.dateEnd,
                companyId: rulesTaxRef.companyId,
                accountingAccountIds: rulesTaxRef.accountingAccountIds,
            });

            switch (action) {
                case 'edit':
                    openModalUpdate();
                    break;

                case 'delete':
                    window.Swal.fire({
                        title: '¿Estás seguro?',
                        text: 'Esta acción no se puede deshacer',
                        icon: 'warning',
                        showCancelButton: true,
                        confirmButtonText: 'Sí, eliminar',
                        cancelButtonText: 'Cancelar',
                        allowOutsideClick: false,
                        customClass: {
                            confirmButton: 'btn btn-primary me-3 waves-effect waves-light',
                            cancelButton: 'btn btn-outline-secondary waves-effect',
                        },
                    }).then(async(result) => {
                        if (result.isConfirmed) {
                            try {
                                const url = base_url(['api/v1/ruler-tax', id]);
                                const response = await fetchHelper.delete(url, {}, {}, 500);

                                setRulesTaxMessage({
                                    message: response.message || response.msg || 'Regla de impuesto eliminada correctamente',
                                    type: 'success',
                                    show: true,
                                });

                                dataTableRef.current.ajax.reload();


                            }catch(error) {
                                setRulesTaxMessage({
                                    message: error.message || error.msg || 'Error al eliminar la regla de impuesto',
                                    type: 'error',
                                    show: true,
                                });
                            }
                        }
                    });
                    break;

                case 'assign':
                    openModalAssignAccount();
                    break;
                default:
                    console.warn('Acción no válida', action);
                    break;
            }
        }
        table.on('click', '.action-btn', handler);
        return () => { table.off('click', '.action-btn', handler); };
    }, [data]);


    return (
        <div className="card">
            <h5 className="card-header text-md-start text-center">Reglas Tributarias</h5>

            <AlertPage message={rulesTaxMessage.message} type={rulesTaxMessage.type} show={rulesTaxMessage.show} onChange={() => setRulesTaxMessage({
                message: '',
                type: '',
                show: false
            })} />

            <div className="card-datatable text-nowrap">
                <DataTableReference
                    url_api={['api/v1/ruler-tax/search']}
                    columns={columns}
                    title='Reglas Tributarias'
                    tableRef={tableRef}
                    dataTableRef={dataTableRef}
                    method='POST'
                    buttons={buttons}
                    search={search}
                    setSearch={setSearch}
                    filtered={true}
                    setData={setData}
                />
            </div>
            {
              userPermissions.some(p => p.code === 'CREATE_RULER_TAX' && p.type === 'CREATE') || isAdmin && <CreateRulesTax
                rulesTax={rulesTax}
                setRulesTax={setRulesTax}
                typeRulerTaxOptions={typeRulerTaxOptions}
                modalRef={modalCreateRef}
                modalInstance={modalCreateInstance}
                dataTableRef={dataTableRef}
                setRulesTaxMessage={setRulesTaxMessage}
              />  
            }

            {
                userPermissions.some(p => p.code === 'UPDATE_RULER_TAX' && p.type === 'UPDATE') || isAdmin && <UpdateRulesTax
                    rulesTax={rulesTax}
                    setRulesTax={setRulesTax}
                    typeRulerTaxOptions={typeRulerTaxOptions}
                    statusRulerTaxOptions={statusRulerTaxOptions}
                    modalRef={modalUpdateRef}
                    modalInstance={modalUpdateInstance}
                    dataTableRef={dataTableRef}
                    setRulesTaxMessage={setRulesTaxMessage}
                />
            }

            {
                userPermissions.some(p => p.code === 'ASSIGN_ACCOUNTING_ACCOUNT_TO_RULER_TAX' && p.type === 'ASSIGN') || isAdmin && <AssignAccount
                    ruler={rulesTax}
                    accountingAccounts={accountingAccounts}
                    modalRef={modalAssignAccountRef}
                    modalInstance={modalAssignAccountInstance}
                    dataTableRef={dataTableRef}
                    setRulesTaxMessage={setRulesTaxMessage}
                />
            }
        </div>

    )
}

export default RulesTaxIndex;