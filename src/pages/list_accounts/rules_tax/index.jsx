import { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import AlertPage from "../../../components/molecules/AlertPage";
import DataTableReference from "../../../components/organism/DataTable";
import GenericFilterModal from "../../../components/organism/GenericFilterModal";

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
                const response = await fetchHelper.post(url, {length: -1, columns: [
                    { data:"pucAccount.code",
                        searchable: true,
                        search:{
                          value:"23%,24%",
                          regex:true
                        }
                    }
                ]}, {}, 0);
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

    const filterRef = useRef(null);
    const filterInstance = useRef(null);

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
        accountingAccountId: null,
        // Base gravable (motor UVT del Estatuto Tributario). Solo aplica para
        // TypeRulerTax = WITHHOLDING. Si vienen null, el motor no omite por tope.
        minAmountUvt: null,
        uvtValueYear: null
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
            name: 'name',
        },
        {
            title: 'Tarifa',
            data: 'percentage',
            name: 'percentage',
            render: (percentage) => {
                return `<span>${percentage != null ? `${Number(percentage).toFixed(2)}%` : '-'}</span>`
            }
        },
        {
            title: 'Descripción',
            data: 'description',
            name: 'description',
        },
        {
            title: 'Tipo de regla',
            data: 'typeRulerTax',
            name: 'typeRulerTax',
            render: (row) => {
                return `<span>${typeRulerTaxOptions.find(t => t.value === row)?.label}</span>`
            }
        },
        {
            title: 'Alcance',
            data: 'scope',
            name: 'scope',
        },
        {
            // HU-CFG-RF-10 E1: columna requerida por la HU. Antes estaba ausente.
            title: 'Cuenta contable',
            data: 'accountingAccount',
            searchable: false,
            orderable: false,
            render: (acc) => {
                if (!acc) return '<span class="text-muted">—</span>';
                const code = acc?.pucAccount?.code || '';
                const name = acc?.customName || acc?.pucAccount?.name || '';
                return `${code}${code && name ? ' - ' : ''}${name}`;
            }
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
            name: 'statusRulerTax',
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
        {
            text: '<i class="ri-filter-line ri-16px me-sm-2"></i> <span class="d-none d-sm-inline-block">Filtrar</span>',
            className: 'btn rounded-pill btn-secondary waves-effect mx-1 my-2',
            action: () => {
                if (!filterInstance.current) filterInstance.current = new window.bootstrap.Modal(filterRef.current);
                filterInstance.current.show();
            }
        },
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
                // QA Bloque AU+ (2026-05-07) Bug 1: el listado solo expone
                // accountingAccount (objeto), no accountingAccountId plano.
                // Antes el state quedaba con id=null y el backend rechazaba
                // con "La cuenta contable es requerida" aunque el dropdown
                // mostrara el nombre. Fallback al id del objeto.
                accountingAccountId: rulesTaxRef.accountingAccountId ?? rulesTaxRef.accountingAccount?.id ?? null,
                accountingAccount: rulesTaxRef.accountingAccount,
                // Base gravable (motor UVT del Estatuto Tributario)
                minAmountUvt: rulesTaxRef.minAmountUvt ?? null,
                uvtValueYear: rulesTaxRef.uvtValueYear ?? null,
            });

            switch (action) {
                case 'edit':
                    openModalUpdate();
                    break;

                case 'delete':
                    // HU-CFG-RF-12 E5: el motivo de eliminacion es OBLIGATORIO
                    // (>= 10 chars). Antes el flujo era una sola confirmacion sin
                    // pedir motivo, lo que dejaba el audit log sin trazabilidad.
                    window.Swal.fire({
                        title: '¿Eliminar regla tributaria?',
                        html: 'Esta acción inactiva la regla y queda registrada en auditoría.<br/><br/>Ingrese el motivo (mínimo 10 caracteres):',
                        icon: 'warning',
                        input: 'textarea',
                        inputAttributes: { 'aria-label': 'Motivo de eliminacion', minlength: 10, maxlength: 500 },
                        inputValidator: (v) => {
                            if (!v || v.trim().length < 10) return 'El motivo debe tener al menos 10 caracteres';
                            if (v.length > 500) return 'Máximo 500 caracteres';
                            return null;
                        },
                        showCancelButton: true,
                        confirmButtonText: 'Sí, eliminar',
                        cancelButtonText: 'Cancelar',
                        allowOutsideClick: false,
                        confirmButtonColor: '#dc3545',
                        customClass: {
                            confirmButton: 'btn btn-danger me-3 waves-effect waves-light',
                            cancelButton: 'btn btn-outline-secondary waves-effect',
                        },
                    }).then(async(result) => {
                        if (result.isConfirmed) {
                            try {
                                const reason = (result.value || '').trim();
                                const url = base_url(['api/v1/ruler-tax', id], { reason });
                                const response = await fetchHelper.delete(url, {}, {}, 500);

                                setRulesTaxMessage({
                                    message: response.message || response.msg || 'La regla tributaria ha sido eliminada exitosamente',
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

    useEffect(() => {
        console.log("rulesTax", rulesTax);
    }, [rulesTax]);

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
            
              <CreateRulesTax
                rulesTax={rulesTax}
                setRulesTax={setRulesTax}
                typeRulerTaxOptions={typeRulerTaxOptions}
                modalRef={modalCreateRef}
                modalInstance={modalCreateInstance}
                dataTableRef={dataTableRef}
                setRulesTaxMessage={setRulesTaxMessage}
              />  
            

            <UpdateRulesTax
                    rulesTax={rulesTax}
                    setRulesTax={setRulesTax}
                    typeRulerTaxOptions={typeRulerTaxOptions}
                    statusRulerTaxOptions={statusRulerTaxOptions}
                    modalRef={modalUpdateRef}
                    modalInstance={modalUpdateInstance}
                    dataTableRef={dataTableRef}
                    setRulesTaxMessage={setRulesTaxMessage}
                />

            <AssignAccount
                    ruler={rulesTax}
                    accountingAccounts={accountingAccounts}
                    modalRef={modalAssignAccountRef}
                    modalInstance={modalAssignAccountInstance}
                    dataTableRef={dataTableRef}
                    setRulesTaxMessage={setRulesTaxMessage}
                />

            <GenericFilterModal
                filterRef={filterRef}
                filterInstance={filterInstance}
                dataTableRef={dataTableRef}
                title="Filtrar Reglas Tributarias"
                columns={[
                    { column: 'name:name',           label: 'Nombre' },
                    { column: 'percentage:name',     label: 'Tarifa (%)', type: 'number' },
                    { column: 'scope:name',          label: 'Alcance' },
                    { column: 'typeRulerTax:name',   label: 'Tipo', type: 'select', options: typeRulerTaxOptions.map(o => ({ id: o.value, label: o.label })) },
                    { column: 'statusRulerTax:name', label: 'Estado', type: 'select', options: statusRulerTaxOptions.map(o => ({ id: o.value, label: o.label })) },
                ]}
            />
        </div>

    )
}

export default RulesTaxIndex;