import { useState, useEffect, useRef } from 'react';

import DataTableReference from "../../../components/organism/DataTable";
import CreateDepreciationRule from "./create";
import UpdatedDepreciationRule from "./updated";

import { base_url } from "../../../utils/functions";
import { fetchHelper } from "../../../utils/fetch";
import AlertPage from '../../../components/molecules/AlertPage';
import FilterDepreciationRule from "./filter";
import { useSelector } from 'react-redux';

const IndexDepreciationRules = () => {

    const userPermissions = useSelector(state => state.user.user)?.permissions?.filter(p => {return p.code.includes('DEPRECIATION_RULE')})|| []; // Permisos del usuario
    const isAdmin = useSelector(state => state.user.user)?.isAdmin || false; // Verificar si el usuario es admin

    const tableRef = useRef(null);
    const dataTableRef = useRef(null);

    const filterRef = useRef(null);
    const filterInstance = useRef(null);

    const modalCreateRef = useRef(null);
    const modalCreateInstance = useRef(null);

    const modalUpdateRef = useRef(null);
    const modalUpdateInstance = useRef(null);

    const [data, setData] = useState([]);
    const [clickEdit, setClickEdit] = useState(false);

    const [ruleCreate, setRuleCreate] = useState(false);
    const [ruleEdit, setRuleEdit] = useState(false);
    const [ruleDelete, setRuleDelete] = useState(false);

    const [search, setSearch] = useState({
        value: '',
        checked: true,
    });

    const emptyRule = {
        id: '',
        name: '',
        depreciationType: '',
        accountId: '',
        accountName: '',
        depreciationRate: '',
        usefulLife: '',
        residualValue: '',
        effectiveDate: '',
        calculationBase: '',
        parameters: '',
        exception: '',
        applicableNorm: '',
        status: 'ACTIVE',
    };

    const [rule, setRule] = useState(emptyRule);

    const url = ['api', 'v1', 'depreciation-rules', 'search'];

    // QA Listas Contables (2026-06-02): los enum reales del backend son
    // DECREASING y MINIMUN_USEFUL_LIFE (no DECLINING_BALANCE / MINIMUM_*). Antes
    // el render caia al valor crudo para esos dos tipos.
    const DEPRECIATION_TYPE_LABELS = {
        LINEAR: 'Lineal',
        DECREASING: 'Decreciente',
        ACCELERATED: 'Acelerada',
        PRODUCTION_UNITS: 'Unidades de producción',
        MINIMUN_USEFUL_LIFE: 'Vida útil mínima',
    };

    const actions = [
        ...(userPermissions.some(p => p.code === 'UPDATE_DEPRECIATION_RULE' && p.type === 'UPDATE') || isAdmin ? [{ key: 'edit', icon: 'ri-edit-line', class: 'btn-label-primary', title: 'Editar' }] : []),
        ...(userPermissions.some(p => p.code === 'DELETE_DEPRECIATION_RULE' && p.type === 'DELETE') || isAdmin ? [{ key: 'delete', icon: 'ri-delete-bin-5-line', class: 'btn-label-danger', title: 'Eliminar' }] : []),
    ];

    const columns = [
        { title: 'ID', data: 'id', searchable: false },
        { title: 'Nombre', data: 'name', name: 'name' },
        {
            // QA Listas Contables (2026-06-02): `name` = depretationType (atributo
            // real de la entidad, con el typo historico). Antes 'depreciationType'
            // no resolvia y el filtro por tipo se descartaba en silencio.
            title: 'Tipo de depreciación', data: 'depretationType', name: 'depretationType',
            render: (val) => DEPRECIATION_TYPE_LABELS[val] ?? val ?? '-'
        },
        // QA Listas Contables (2026-06-02): filtrar por id de la cuenta (relacion
        // accountingAccount.id). Antes 'accountName' no existia en la entidad y
        // el filtro se ignoraba. `data` queda en el path del DTO para el render.
        { title: 'Cuenta contable', data: 'accountingAccountDTO.customName', name: 'accountingAccount.id', render: (val) => val ?? '-' },
        {
            title: 'Tasa (%)', data: 'depretationRate', name: 'depreciationRate',
            render: (val) => val != null ? `${Number(val).toFixed(2)}%` : '-'
        },
        { title: 'Vida útil (años)', data: 'usefulLifeYears', name: 'usefulLife', render: (val) => val ?? '-' },
        {
            title: 'Valor residual', data: 'residualValue', name: 'residualValue',
            render: (val) => val != null ? Number(val).toFixed(2) : '-'
        },
        // HU-CFG-RF-14 E1: la HU pide "Fecha de creacion" (no la fecha de
        // vigencia). Mostramos createdAt formateado y dejamos effectiveDate
        // disponible como dato secundario en el detalle.
        {
            title: 'Fecha de creación', data: 'createdAt', name: 'createdAt',
            render: (val) => val ? String(val).slice(0, 10) : '-'
        },
        {
            title: 'Estado', data: 'status', name: 'status',
            render: (status) => status === 'ACTIVE'
                ? `<span class="badge bg-label-success">Activa</span>`
                : `<span class="badge bg-label-danger">Inactiva</span>`
        },
        {
            title: 'Acciones', data: 'id', searchable: false,
            render: (id) => `
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
            `
        },
    ];

    const openModalCreate = () => {
        if (!modalCreateInstance.current) {
            modalCreateInstance.current = new window.bootstrap.Modal(modalCreateRef.current);
        }
        setRule(emptyRule);
        modalCreateInstance.current.show();
    };

    const openModalUpdate = () => {
        if (!modalUpdateInstance.current) {
            modalUpdateInstance.current = new window.bootstrap.Modal(modalUpdateRef.current);
        }
        modalUpdateInstance.current.show();
    };

    const buttons = [
        {
            text: '<i class="ri-filter-line ri-16px me-sm-2"></i> <span class="d-none d-sm-inline-block">Filtrar</span>',
            className: 'btn rounded-pill btn-secondary waves-effect mx-2 my-2',
            action: function () {
                if (!filterInstance.current) {
                    filterInstance.current = new window.bootstrap.Modal(filterRef.current);
                }
                filterInstance.current.show();
            }
        },
        ...(userPermissions.some(p => p.code === 'CREATE_DEPRECIATION_RULE' && p.type === 'CREATE') || isAdmin ? [{
            text: '<i class="ri-add-line ri-16px me-sm-2"></i> <span class="d-none d-sm-inline-block">Crear Regla de Depreciación</span>',
            className: 'btn rounded-pill btn-primary waves-effect mx-2 my-2',
            action: function () { openModalCreate(); }
        }] : []),
    ];

    useEffect(() => {
        if (!clickEdit) return;
        openModalUpdate();
        setClickEdit(false);
    }, [clickEdit]);

    useEffect(() => {
        const table = dataTableRef?.current;
        if (!table) return;

        const handler = function () {
            const action = $(this).data('action');
            const id = Number($(this).data('id'));
            const ruleRef = data.find(m => m.id === id);

            if (!ruleRef) {
                console.warn('Regla de depreciación no encontrada', id);
                return;
            }

            switch (action) {
                case 'edit':
                    setRule({
                        id: ruleRef.id ?? '',
                        name: ruleRef.name ?? '',
                        depretationType: ruleRef.depretationType ?? '',
                        accountId: ruleRef.accountId ?? '',
                        accountName: ruleRef.accountingAccountDTO.customName ?? '',
                        depretationRate: ruleRef.depretationRate ?? '',
                        usefulLifeYears: ruleRef.usefulLifeYears ?? '',
                        residualValue: ruleRef.residualValue ?? '',
                        effectiveDate: ruleRef.effectiveDate ?? '',
                        calculationBase: ruleRef.descriptionStructured?.calculationBase ?? '',
                        parameters: ruleRef.descriptionStructured?.parameters ?? '',
                        exception: ruleRef.descriptionStructured?.exception ?? '',
                        applicableNorm: ruleRef.descriptionStructured?.applicableNorm ?? '',
                        status: ruleRef.status ?? 'ACTIVE',
                    });
                    setClickEdit(true);
                    break;

                case 'delete':
                    // Paso 1: confirmación
                    window.Swal.fire({
                        title: '¿Está seguro?',
                        text: `¿Está seguro de eliminar la regla "${ruleRef.name}"?`,
                        icon: 'warning',
                        showCancelButton: true,
                        confirmButtonText: 'Sí, continuar',
                        cancelButtonText: 'Cancelar',
                    }).then((result) => {
                        if (!result.isConfirmed) return;

                        // Paso 2: motivo de eliminación
                        window.Swal.fire({
                            title: 'Motivo de eliminación',
                            text: 'Ingrese el motivo por el cual elimina esta regla de depreciación:',
                            input: 'textarea',
                            inputPlaceholder: 'Escriba el motivo aquí...',
                            inputAttributes: { 'aria-label': 'Motivo de eliminación' },
                            showCancelButton: true,
                            confirmButtonText: 'Eliminar',
                            cancelButtonText: 'Cancelar',
                            preConfirm: (motivo) => {
                                if (!motivo || motivo.trim() === '') {
                                    window.Swal.showValidationMessage('No ingresó el motivo de eliminación');
                                }
                                return motivo;
                            }
                        }).then(async (motivo) => {
                            if (!motivo.isConfirmed) return;

                            try {
                                const deleteUrl = base_url(['api/v1/depreciation-rules', 'delete', id], { reason: motivo.value });
                                await fetchHelper.delete(deleteUrl, {}, {}, 500, false);
                                dataTableRef?.current?.ajax.reload();
                                setRuleDelete(true);
                            } catch (error) {
                                console.error(error);
                                window.Swal.fire({
                                    title: 'Error',
                                    text: error?.msg || 'Error al eliminar la regla de depreciación',
                                    icon: 'error',
                                    confirmButtonText: 'Cerrar',
                                    showCancelButton: false,
                                    allowOutsideClick: false,
                                });
                            }
                        });
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
                <h5 className="card-header text-md-start text-center">Reglas de Depreciación</h5>

                <AlertPage type="success" message="La regla de depreciación ha sido creada exitosamente." show={ruleCreate} onChange={() => setRuleCreate(false)} />
                <AlertPage type="success" message="La regla de depreciación fue actualizada exitosamente." show={ruleEdit} onChange={() => setRuleEdit(false)} />
                <AlertPage type="success" message="La regla de depreciación ha sido eliminada exitosamente." show={ruleDelete} onChange={() => setRuleDelete(false)} />

                <div className="card-datatable text-nowrap">
                    <DataTableReference
                        url_api={url}
                        columns={columns}
                        tableRef={tableRef}
                        dataTableRef={dataTableRef}
                        method='POST'
                        buttons={buttons}
                        title='Reglas de Depreciación'
                        setData={setData}
                        search={search}
                        setSearch={setSearch}
                        filtered={true}
                    />
                </div>

                <FilterDepreciationRule
                    filterRef={filterRef}
                    filterInstance={filterInstance}
                    dataTableRef={dataTableRef}
                />
            </div>

            <CreateDepreciationRule
                modalRef={modalCreateRef}
                modalInstance={modalCreateInstance}
                rule={rule}
                setRule={setRule}
                dataTableRef={dataTableRef}
                setRuleCreate={setRuleCreate}
            />

            <UpdatedDepreciationRule
                modalRef={modalUpdateRef}
                modalInstance={modalUpdateInstance}
                rule={rule}
                setRule={setRule}
                dataTableRef={dataTableRef}
                setRuleEdit={setRuleEdit}
            />
        </>
    );
};

export default IndexDepreciationRules;
