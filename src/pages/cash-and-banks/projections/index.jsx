import { useState, useEffect, useRef } from 'react';
import DataTableReference from '../../../components/organism/DataTable';
import { fetchHelper } from '../../../utils/fetch';
import { base_url } from '../../../utils/functions';
import AlertPage from '../../../components/molecules/AlertPage';
import GenericFilterModal from '../../../components/organism/GenericFilterModal';
import CreateProjection from './create';
import UpdatedProjection from './updated';

/**
 * Pagina principal de Proyecciones de Flujo de Caja.
 * Permite listar, crear, editar y eliminar proyecciones (BNK-RF-29 a BNK-RF-32).
 */

const API_LIST = ['api', 'v1', 'bnk', 'projections', 'search'];

const STATUS_BADGE = {
    BORRADOR:  'bg-label-secondary',
    APROBADA:  'bg-label-success',
    EJECUTADA: 'bg-label-primary',
    INACTIVA:  'bg-label-warning',
};

const STATUS_LABEL = {
    BORRADOR:  'Borrador',
    APROBADA:  'Aprobada',
    EJECUTADA: 'Ejecutada',
    INACTIVA:  'Inactiva',
};

const TYPE_LABEL = {
    INGRESOS: 'Ingresos',
    EGRESOS:  'Egresos',
    NETA:     'Neta',
};

const PERIODICITY_LABEL = {
    DIARIA:     'Diaria',
    SEMANAL:    'Semanal',
    QUINCENAL:  'Quincenal',
    MENSUAL:    'Mensual',
    BIMESTRAL:  'Bimestral',
    TRIMESTRAL: 'Trimestral',
    SEMESTRAL:  'Semestral',
    ANUAL:      'Anual',
};

const emptyProjection = {
    id: '',
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    periodicity: '',
    projectionType: '',
    initialBalance: '',
    netFlow: '',
    currency: 'COP',
    status: '',
};

const formatCurrency = (val) => {
    if (val === null || val === undefined) return '-';
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 2,
    }).format(val);
};

const IndexProjections = () => {
    const tableRef            = useRef(null);
    const dataTableRef        = useRef(null);
    const modalCreateRef      = useRef(null);
    const modalCreateInstance = useRef(null);
    const modalUpdateRef      = useRef(null);
    const modalUpdateInstance = useRef(null);
    const filterRef           = useRef(null);
    const filterInstance      = useRef(null);

    const [data, setData]                   = useState([]);
    const [projection, setProjection]       = useState({ ...emptyProjection });
    const [search, setSearch]               = useState({ value: '', checked: true });
    const [itemCreate, setItemCreate]       = useState(false);
    const [itemEdit, setItemEdit]           = useState(false);
    const [itemDelete, setItemDelete]       = useState(false);
    const [itemError, setItemError]         = useState(false);

    const columns = [
        { title: 'Id', data: 'id', searchable: false },
        { title: 'Nombre', data: 'name', name: 'name' },
        {
            title: 'Tipo', data: 'projectionType', name: 'projectionType',
            render: (val) => TYPE_LABEL[val] ?? val ?? '-',
        },
        {
            title: 'Periodicidad', data: 'periodicity', name: 'periodicity',
            render: (val) => PERIODICITY_LABEL[val] ?? val ?? '-',
        },
        {
            title: 'Saldo Inicial', data: 'initialBalance', searchable: false,
            render: (val) => formatCurrency(val),
        },
        {
            title: 'Flujo Neto', data: 'netFlow', searchable: false,
            render: (val) => formatCurrency(val),
        },
        {
            title: 'Saldo Final', data: 'finalBalance', searchable: false,
            render: (val) => formatCurrency(val),
        },
        {
            title: 'Estado', data: 'status', name: 'status',
            render: (val) => {
                const badge = STATUS_BADGE[val] || 'bg-label-secondary';
                const label = STATUS_LABEL[val] || val || '-';
                return `<span class="badge ${badge}">${label}</span>`;
            },
        },
        {
            title: 'Acciones', data: 'id', searchable: false,
            // QA HU-030/031/059: botones segun estado.
            render: (id, _t, row) => {
                const status = row?.status;
                let btns = '';
                // BORRADOR: editar, aprobar, eliminar
                if (status === 'BORRADOR') {
                    btns += `
                        <button class="btn btn-sm btn-label-primary action-btn" data-action="edit" data-id="${id}" title="Editar">
                            <i class="ri-edit-line"></i>
                        </button>
                        <button class="btn btn-sm btn-label-success action-btn" data-action="approve" data-id="${id}" title="Aprobar (HU-030)">
                            <i class="ri-check-line"></i>
                        </button>
                        <button class="btn btn-sm btn-label-danger action-btn" data-action="delete" data-id="${id}" title="Eliminar">
                            <i class="ri-delete-bin-5-line"></i>
                        </button>`;
                }
                // APROBADA: marcar como ejecutada o inactivar
                if (status === 'APROBADA') {
                    btns += `
                        <button class="btn btn-sm btn-label-info action-btn" data-action="execute" data-id="${id}" title="Marcar como EJECUTADA (HU-059)">
                            <i class="ri-flag-line"></i>
                        </button>
                        <button class="btn btn-sm btn-label-warning action-btn" data-action="inactivate" data-id="${id}" title="Inactivar (HU-031)">
                            <i class="ri-close-circle-line"></i>
                        </button>`;
                }
                if (!btns) {
                    btns = '<span class="text-muted small fst-italic">Sin acciones</span>';
                }
                return `<div class="d-flex gap-1 flex-wrap">${btns}</div>`;
            },
        },
    ];

    const openModalCreate = () => {
        setProjection({ ...emptyProjection });
        if (!modalCreateInstance.current) {
            modalCreateInstance.current = new window.bootstrap.Modal(modalCreateRef.current);
        }
        modalCreateInstance.current.show();
    };

    const buttons = [
        {
            text: '<i class="ri-filter-line ri-16px me-sm-2"></i> <span class="d-none d-sm-inline-block">Filtrar</span>',
            className: 'btn rounded-pill btn-secondary waves-effect mx-1 my-2',
            action: () => {
                if (!filterInstance.current) filterInstance.current = new window.bootstrap.Modal(filterRef.current);
                filterInstance.current.show();
            }
        },
        {
            text: '<i class="ri-add-line ri-16px me-sm-2"></i><span class="d-none d-sm-inline-block">Crear Proyeccion</span>',
            className: 'btn rounded-pill btn-primary waves-effect mx-2 my-2',
            action: () => openModalCreate(),
        },
    ];

    useEffect(() => {
        const table = dataTableRef?.current;
        if (!table) return;

        const handler = function () {
            const action = $(this).data('action');
            const id     = Number($(this).data('id'));
            const row    = data.find(m => m.id === id);
            if (!row) return;

            switch (action) {
                case 'edit': {
                    setProjection({
                        id:             row.id             ?? '',
                        name:           row.name           ?? '',
                        description:    row.description    ?? '',
                        startDate:      row.startDate      ?? '',
                        endDate:        row.endDate        ?? '',
                        periodicity:    row.periodicity    ?? '',
                        projectionType: row.projectionType ?? '',
                        initialBalance: row.initialBalance ?? '',
                        netFlow:        row.netFlow        ?? '',
                        currency:       row.currency       ?? 'COP',
                        status:         row.status         ?? '',
                    });
                    if (!modalUpdateInstance.current) {
                        modalUpdateInstance.current = new window.bootstrap.Modal(modalUpdateRef.current);
                    }
                    modalUpdateInstance.current.show();
                    break;
                }
                case 'approve': {
                    // QA HU-030/031: BORRADOR -> APROBADA
                    window.Swal.fire({
                        title: 'Aprobar proyeccion',
                        html: `¿Aprobar la proyeccion <strong>${row.name}</strong>?<br/><br/>Una vez aprobada solo podra modificarse con motivo y luego marcarse como EJECUTADA.`,
                        icon: 'question',
                        showCancelButton: true,
                        confirmButtonText: 'Si, aprobar',
                        cancelButtonText: 'Cancelar',
                    }).then(async (result) => {
                        if (!result.isConfirmed) return;
                        try {
                            await fetchHelper.post(
                                base_url(['api', 'v1', 'bnk', 'projections', row.id, 'approve']),
                                {}, {}, 1000, true,
                            );
                            dataTableRef?.current?.ajax?.reload?.();
                            setItemApprove(true);
                        } catch (error) {
                            window.Swal.fire({ icon: 'error', title: 'No se pudo aprobar',
                                text: error?.msg || error?.message || 'Error desconocido' });
                        }
                    });
                    break;
                }
                case 'execute': {
                    // QA HU-059: APROBADA -> EJECUTADA (terminal)
                    window.Swal.fire({
                        title: 'Marcar como EJECUTADA',
                        html: `¿La proyeccion <strong>${row.name}</strong> ya se realizo? Estado terminal — no podra revertirse.`,
                        icon: 'question',
                        showCancelButton: true,
                        confirmButtonText: 'Si, ejecutada',
                        cancelButtonText: 'Cancelar',
                    }).then(async (result) => {
                        if (!result.isConfirmed) return;
                        try {
                            await fetchHelper.post(
                                base_url(['api', 'v1', 'bnk', 'projections', row.id, 'execute']),
                                {}, {}, 1000, true,
                            );
                            dataTableRef?.current?.ajax?.reload?.();
                            setItemApprove(true);
                        } catch (error) {
                            window.Swal.fire({ icon: 'error', title: 'No se pudo marcar como ejecutada',
                                text: error?.msg || error?.message || 'Error desconocido' });
                        }
                    });
                    break;
                }
                case 'inactivate': {
                    // QA HU-031: APROBADA -> INACTIVA
                    window.Swal.fire({
                        title: 'Inactivar proyeccion',
                        html: `¿Inactivar la proyeccion <strong>${row.name}</strong>? Conserva el historial.`,
                        icon: 'warning',
                        showCancelButton: true,
                        confirmButtonText: 'Si, inactivar',
                        cancelButtonText: 'Cancelar',
                        confirmButtonColor: '#f0ad4e',
                    }).then(async (result) => {
                        if (!result.isConfirmed) return;
                        try {
                            await fetchHelper.patch(
                                base_url(['api', 'v1', 'bnk', 'projections', row.id, 'inactivate']),
                                {}, {}, 1000, true,
                            );
                            dataTableRef?.current?.ajax?.reload?.();
                            setItemDelete(true);
                        } catch (error) {
                            window.Swal.fire({ icon: 'error', title: 'No se pudo inactivar',
                                text: error?.msg || error?.message || 'Error desconocido' });
                        }
                    });
                    break;
                }
                case 'delete': {
                    window.Swal.fire({
                        title: 'Eliminar proyeccion',
                        html: `¿Esta seguro de eliminar la proyeccion <strong>${row.name}</strong>?`,
                        icon: 'warning',
                        showCancelButton: true,
                        confirmButtonText: 'Si, eliminar',
                        cancelButtonText: 'Cancelar',
                        confirmButtonColor: '#d33',
                    }).then(async (result) => {
                        if (!result.isConfirmed) return;
                        try {
                            await fetchHelper.delete(
                                base_url(['api', 'v1', 'bnk', 'projections', row.id]),
                                {}, 1000
                            );
                            dataTableRef?.current?.ajax?.reload?.();
                            setItemDelete(true);
                        } catch (error) {
                            // QA HU-029 E1: usar el mensaje real del backend en
                            // lugar del generico "Error al procesar la operacion".
                            const realMsg = error?.msg || error?.message || error?.error
                                || 'Error al procesar la operación.';
                            window.Swal.fire({
                                icon: 'error',
                                title: 'No se pudo eliminar',
                                text: realMsg,
                            });
                            setItemError(true);
                        }
                    });
                    break;
                }
                default:
                    break;
            }
        };

        table.on('click', '.action-btn', handler);
        return () => table.off('click', '.action-btn', handler);
    }, [data]);

    return (
        <>
            <div className="card">
                <h5 className="card-header text-md-start text-center">Proyecciones de Flujo de Caja</h5>

                <AlertPage type="success" message="Proyeccion registrada exitosamente."   show={itemCreate} onChange={() => setItemCreate(false)} />
                <AlertPage type="success" message="Proyeccion actualizada exitosamente."   show={itemEdit}   onChange={() => setItemEdit(false)} />
                <AlertPage type="success" message="Proyeccion eliminada exitosamente."     show={itemDelete} onChange={() => setItemDelete(false)} />
                <AlertPage type="danger"  message="Error al procesar la operacion."        show={itemError}  onChange={() => setItemError(false)} />

                <div className="card-datatable text-nowrap">
                    <DataTableReference
                        url_api={API_LIST}
                        columns={columns}
                        tableRef={tableRef}
                        dataTableRef={dataTableRef}
                        method="POST"
                        buttons={buttons}
                        title="Proyecciones de Flujo de Caja"
                        setData={setData}
                        search={search}
                        setSearch={setSearch}
                        filtered={true}
                        lengthMenu={[10, 25, 50]}
                    />
                </div>
            </div>

            <CreateProjection
                modalRef={modalCreateRef}
                modalInstance={modalCreateInstance}
                projection={projection}
                setProjection={setProjection}
                dataTableRef={dataTableRef}
                setItemCreate={setItemCreate}
            />

            <UpdatedProjection
                modalRef={modalUpdateRef}
                modalInstance={modalUpdateInstance}
                projection={projection}
                setProjection={setProjection}
                dataTableRef={dataTableRef}
                setItemEdit={setItemEdit}
            />

            <GenericFilterModal
                filterRef={filterRef}
                filterInstance={filterInstance}
                dataTableRef={dataTableRef}
                title="Filtrar Proyecciones"
                columns={[
                    { column: 'name:name', label: 'Nombre' },
                    { column: 'projectionType:name', label: 'Tipo', type: 'select', options: [
                        { id: 'INGRESOS', label: 'Ingresos' },
                        { id: 'EGRESOS', label: 'Egresos' },
                        { id: 'NETA', label: 'Neta' },
                    ]},
                    { column: 'periodicity:name', label: 'Periodicidad', type: 'select', options: [
                        { id: 'DIARIA', label: 'Diaria' },
                        { id: 'SEMANAL', label: 'Semanal' },
                        { id: 'QUINCENAL', label: 'Quincenal' },
                        { id: 'MENSUAL', label: 'Mensual' },
                        { id: 'BIMESTRAL', label: 'Bimestral' },
                        { id: 'TRIMESTRAL', label: 'Trimestral' },
                        { id: 'SEMESTRAL', label: 'Semestral' },
                        { id: 'ANUAL', label: 'Anual' },
                    ]},
                    { column: 'status:name', label: 'Estado', type: 'select', options: [
                        { id: 'BORRADOR', label: 'Borrador' },
                        { id: 'APROBADA', label: 'Aprobada' },
                        { id: 'EJECUTADA', label: 'Ejecutada' },
                        { id: 'INACTIVA', label: 'Inactiva' },
                    ]},
                ]}
            />
        </>
    );
};

export default IndexProjections;
