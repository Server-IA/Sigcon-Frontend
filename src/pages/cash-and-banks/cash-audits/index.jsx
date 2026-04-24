import { useState, useEffect, useRef } from 'react';
import DataTableReference from '../../../components/organism/DataTable';
import { fetchHelper } from '../../../utils/fetch';
import { base_url } from '../../../utils/functions';
import AlertPage from '../../../components/molecules/AlertPage';
import GenericFilterModal from '../../../components/organism/GenericFilterModal';
import CreateCashAudit from './create';

/**
 * Pagina principal de Arqueos de Caja (BNK-RF-17 a BNK-RF-20).
 * Permite listar, crear, aprobar y cerrar arqueos de caja.
 */

const API_LIST = ['api', 'v1', 'cash-audits'];

const STATUS_BADGE = {
    ABIERTO:     'bg-label-primary',
    EN_REVISION: 'bg-label-warning',
    APROBADO:    'bg-label-success',
    CERRADO:     'bg-label-secondary',
};

const STATUS_LABEL = {
    ABIERTO:     'Abierto',
    EN_REVISION: 'En Revision',
    APROBADO:    'Aprobado',
    CERRADO:     'Cerrado',
};

const formatCurrency = (val) => {
    if (val === null || val === undefined) return '-';
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 2,
    }).format(val);
};

const IndexCashAudits = () => {
    const tableRef            = useRef(null);
    const dataTableRef        = useRef(null);
    const modalCreateRef      = useRef(null);
    const modalCreateInstance = useRef(null);
    const filterRef           = useRef(null);
    const filterInstance      = useRef(null);

    const [data, setData]               = useState([]);
    const [search, setSearch]           = useState({ value: '', checked: true });
    const [itemCreate, setItemCreate]   = useState(false);
    const [itemApprove, setItemApprove] = useState(false);
    const [itemClose, setItemClose]     = useState(false);
    const [itemError, setItemError]     = useState(false);

    const columns = [
        { title: 'Id', data: 'id', searchable: false },
        { title: 'Caja', data: 'cashName', name: 'cash.cashName' },
        { title: 'Fecha', data: 'auditDate', name: 'auditDate', searchable: false },
        {
            title: 'Saldo Sistema', data: 'systemBalance', searchable: false,
            render: (val) => formatCurrency(val),
        },
        {
            title: 'Saldo Fisico', data: 'physicalBalance', searchable: false,
            render: (val) => formatCurrency(val),
        },
        {
            title: 'Diferencia', data: 'difference', searchable: false,
            render: (val) => {
                if (val === null || val === undefined) return '-';
                const num = Number(val);
                const formatted = formatCurrency(Math.abs(num));
                if (num > 0) return `<span class="text-success">+${formatted}</span>`;
                if (num < 0) return `<span class="text-danger">${formatCurrency(num)}</span>`;
                return `<span class="text-muted">${formatted}</span>`;
            },
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
            render: (id, _type, row) => {
                const estado = row.status;
                let btns = '';

                if (estado === 'ABIERTO') {
                    btns += `
                        <button class="btn btn-sm btn-label-success action-btn" data-action="approve" data-id="${id}" title="Aprobar arqueo">
                            <i class="ri-check-line"></i>
                        </button>`;
                }
                if (estado === 'APROBADO') {
                    btns += `
                        <button class="btn btn-sm btn-label-secondary action-btn" data-action="close" data-id="${id}" title="Cerrar arqueo">
                            <i class="ri-lock-line"></i>
                        </button>`;
                }

                return `<div class="d-flex gap-1 flex-wrap">${btns}</div>`;
            },
        },
    ];

    const openModalCreate = () => {
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
            text: '<i class="ri-add-line ri-16px me-sm-2"></i><span class="d-none d-sm-inline-block">Nuevo Arqueo</span>',
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
                case 'approve': {
                    window.Swal.fire({
                        title: 'Aprobar arqueo',
                        html: `¿Esta seguro de aprobar el arqueo <strong>#${row.id}</strong> de la caja <strong>${row.cashName}</strong>?`,
                        icon: 'question',
                        showCancelButton: true,
                        confirmButtonText: 'Si, aprobar',
                        cancelButtonText: 'Cancelar',
                        confirmButtonColor: '#28a745',
                    }).then(async (result) => {
                        if (!result.isConfirmed) return;
                        try {
                            await fetchHelper.post(
                                base_url(['api', 'v1', 'cash-audits', row.id, 'approve']),
                                {}, {}, 1000, true
                            );
                            dataTableRef?.current?.ajax?.reload?.();
                            setItemApprove(true);
                        } catch (error) {
                            setItemError(true);
                        }
                    });
                    break;
                }
                case 'close': {
                    window.Swal.fire({
                        title: 'Cerrar arqueo',
                        html: `¿Esta seguro de cerrar el arqueo <strong>#${row.id}</strong>? Esta accion es irreversible.`,
                        icon: 'warning',
                        showCancelButton: true,
                        confirmButtonText: 'Si, cerrar',
                        cancelButtonText: 'Cancelar',
                        confirmButtonColor: '#6c757d',
                    }).then(async (result) => {
                        if (!result.isConfirmed) return;
                        try {
                            await fetchHelper.post(
                                base_url(['api', 'v1', 'cash-audits', row.id, 'close']),
                                {}, {}, 1000, true
                            );
                            dataTableRef?.current?.ajax?.reload?.();
                            setItemClose(true);
                        } catch (error) {
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
                <h5 className="card-header text-md-start text-center">Arqueos de Caja</h5>

                <AlertPage type="success" message="Arqueo registrado exitosamente."   show={itemCreate}  onChange={() => setItemCreate(false)} />
                <AlertPage type="success" message="Arqueo aprobado exitosamente."     show={itemApprove} onChange={() => setItemApprove(false)} />
                <AlertPage type="success" message="Arqueo cerrado exitosamente."      show={itemClose}   onChange={() => setItemClose(false)} />
                <AlertPage type="danger"  message="Error al procesar la operacion."   show={itemError}   onChange={() => setItemError(false)} />

                <div className="card-datatable text-nowrap">
                    <DataTableReference
                        url_api={API_LIST}
                        columns={columns}
                        tableRef={tableRef}
                        dataTableRef={dataTableRef}
                        method="POST"
                        buttons={buttons}
                        title="Arqueos de Caja"
                        setData={setData}
                        search={search}
                        setSearch={setSearch}
                        filtered={true}
                        lengthMenu={[10, 25, 50]}
                    />
                </div>
            </div>

            <CreateCashAudit
                modalRef={modalCreateRef}
                modalInstance={modalCreateInstance}
                dataTableRef={dataTableRef}
                setItemCreate={setItemCreate}
            />

            <GenericFilterModal
                filterRef={filterRef}
                filterInstance={filterInstance}
                dataTableRef={dataTableRef}
                title="Filtrar Arqueos de Caja"
                columns={[
                    { column: 'cash.cashName:name', label: 'Caja' },
                    { column: 'auditDate:name', label: 'Fecha', type: 'date' },
                    { column: 'status:name', label: 'Estado', type: 'select', options: [
                        { id: 'ABIERTO', label: 'Abierto' },
                        { id: 'EN_REVISION', label: 'En Revision' },
                        { id: 'APROBADO', label: 'Aprobado' },
                        { id: 'CERRADO', label: 'Cerrado' },
                    ]},
                ]}
            />
        </>
    );
};

export default IndexCashAudits;
