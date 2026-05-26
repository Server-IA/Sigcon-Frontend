import { useState, useEffect, useRef } from 'react';
import DataTableReference from '../../../components/organism/DataTable';
import { fetchHelper } from '../../../utils/fetch';
import { base_url } from '../../../utils/functions';
import AlertPage from '../../../components/molecules/AlertPage';
import GenericFilterModal from '../../../components/organism/GenericFilterModal';
import CreateCashAudit from './create';

import { statusBadge } from '../../../utils/statusLabels';
/**
 * Pagina principal de Arqueos de Caja (BNK-RF-17 a BNK-RF-20).
 * Permite listar, crear, aprobar y cerrar arqueos de caja.
 */

const API_LIST = ['api', 'v1', 'cash-audits'];

const STATUS_BADGE = {
    BORRADOR:    'bg-label-primary',
    ABIERTO:     'bg-label-primary',
    EN_REVISION: 'bg-label-warning',
    APROBADO:    'bg-label-success',
    RECHAZADO:   'bg-label-danger',
    CERRADO:     'bg-label-secondary',
    ANULADO:     'bg-label-dark',
};

const STATUS_LABEL = {
    BORRADOR:    'Borrador',
    ABIERTO:     'Borrador',
    EN_REVISION: 'En Revision',
    APROBADO:    'Aprobado',
    RECHAZADO:   'Rechazado',
    CERRADO:     'Cerrado',
    ANULADO:     'Anulado',
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
    const [itemDelete, setItemDelete]   = useState(false);
    const [itemVoid, setItemVoid]       = useState(false);
    const [itemError, setItemError]     = useState(false);
    const [errorMessage, setErrorMessage] = useState('Error al procesar la operacion.');

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
                return statusBadge(val);
            },
        },
        {
            title: 'Acciones', data: 'id', searchable: false,
            render: (id, _type, row) => {
                const estado = row.status;
                let btns = '';

                // QA HU-042: BORRADOR/RECHAZADO -> envia a revision o elimina
                const isDraftOrRejected = estado === 'BORRADOR' || estado === 'ABIERTO' || estado === 'RECHAZADO';
                if (isDraftOrRejected) {
                    btns += `
                        <button class="btn btn-sm btn-label-info action-btn" data-action="submit-review" data-id="${id}" title="Enviar a revision (HU-042)">
                            <i class="ri-send-plane-line"></i>
                        </button>
                        <button class="btn btn-sm btn-label-danger action-btn" data-action="delete" data-id="${id}" title="Eliminar arqueo en borrador">
                            <i class="ri-delete-bin-line"></i>
                        </button>`;
                }
                // QA HU-043: EN_REVISION -> aprobar o rechazar
                if (estado === 'EN_REVISION') {
                    btns += `
                        <button class="btn btn-sm btn-label-success action-btn" data-action="approve" data-id="${id}" title="Aprobar arqueo (HU-043)">
                            <i class="ri-check-line"></i>
                        </button>
                        <button class="btn btn-sm btn-label-warning action-btn" data-action="reject" data-id="${id}" title="Rechazar (HU-043)">
                            <i class="ri-close-line"></i>
                        </button>`;
                }
                if (estado === 'APROBADO' || estado === 'CERRADO') {
                    btns += `
                        <button class="btn btn-sm btn-label-warning action-btn" data-action="void" data-id="${id}" title="Anular arqueo aprobado">
                            <i class="ri-close-circle-line"></i>
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
                case 'submit-review': {
                    // QA HU-042: cajero envia arqueo BORRADOR a supervisor.
                    window.Swal.fire({
                        title: 'Enviar arqueo a revision',
                        html: `¿Confirma enviar el arqueo <strong>#${row.id}</strong> a revision del supervisor?<br/><br/>Una vez enviado, el cajero ya no podra editarlo hasta que sea aprobado o rechazado.`,
                        icon: 'question',
                        showCancelButton: true,
                        showDenyButton: false,
                        confirmButtonText: 'Si, enviar',
                        cancelButtonText: 'Cancelar',
                    }).then(async (result) => {
                        if (!result.isConfirmed) return;
                        try {
                            await fetchHelper.post(
                                base_url(['api', 'v1', 'cash-audits', row.id, 'submit-review']),
                                {}, {}, 1000, true
                            );
                            dataTableRef?.current?.ajax?.reload?.();
                            setItemApprove(true);
                        } catch (error) {
                            window.Swal.fire({ icon: 'error', title: 'No se pudo enviar a revision',
                                text: error?.msg || error?.message || 'Error desconocido' });
                        }
                    });
                    break;
                }
                case 'reject': {
                    // QA HU-043: supervisor rechaza arqueo EN_REVISION con motivo.
                    window.Swal.fire({
                        title: 'Rechazar arqueo',
                        html: `Va a rechazar el arqueo <strong>#${row.id}</strong> y devolverlo al cajero.<br/><br/>Indique el motivo (minimo 10 caracteres):`,
                        icon: 'warning',
                        input: 'textarea',
                        inputAttributes: { minlength: 10, maxlength: 500 },
                        inputValidator: (v) => {
                            if (!v || v.trim().length < 10) return 'El motivo debe tener al menos 10 caracteres';
                            return null;
                        },
                        showCancelButton: true,
                        showDenyButton: false,
                        confirmButtonText: 'Si, rechazar',
                        cancelButtonText: 'Cancelar',
                        confirmButtonColor: '#d33',
                    }).then(async (result) => {
                        if (!result.isConfirmed) return;
                        try {
                            await fetchHelper.post(
                                base_url(['api', 'v1', 'cash-audits', row.id, 'reject']),
                                { reason: result.value }, {}, 1000, true
                            );
                            dataTableRef?.current?.ajax?.reload?.();
                            setItemApprove(true);
                        } catch (error) {
                            window.Swal.fire({ icon: 'error', title: 'No se pudo rechazar',
                                text: error?.msg || error?.message || 'Error desconocido' });
                        }
                    });
                    break;
                }
                case 'approve': {
                    window.Swal.fire({
                        title: 'Aprobar arqueo',
                        html: `¿Esta seguro de aprobar el arqueo <strong>#${row.id}</strong> de la caja <strong>${row.cashName}</strong>?`,
                        icon: 'question',
                        showCancelButton: true,
                        showDenyButton: false,
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
                case 'delete': {
                    window.Swal.fire({
                        title: 'Eliminar arqueo en BORRADOR',
                        html: `Va a eliminar fisicamente el arqueo <strong>#${row.id}</strong> de la caja <strong>${row.cashName}</strong>.<br/><br/>Ingrese el motivo (minimo 10 caracteres):`,
                        icon: 'warning',
                        input: 'textarea',
                        inputAttributes: { 'aria-label': 'Motivo de eliminacion', minlength: 10, maxlength: 500 },
                        inputValidator: (v) => {
                            if (!v || v.trim().length < 10) return 'El motivo debe tener al menos 10 caracteres';
                            if (v.length > 500) return 'Maximo 500 caracteres';
                            return null;
                        },
                        showCancelButton: true,
                        showDenyButton: false,
                        confirmButtonText: 'Si, eliminar',
                        cancelButtonText: 'Cancelar',
                        confirmButtonColor: '#dc3545',
                    }).then(async (result) => {
                        if (!result.isConfirmed) return;
                        try {
                            await fetchHelper.delete(
                                base_url(['api', 'v1', 'cash-audits', row.id]),
                                { reason: result.value.trim() },
                                {}, 1000, true
                            );
                            dataTableRef?.current?.ajax?.reload?.();
                            setItemDelete(true);
                        } catch (error) {
                            setErrorMessage(error?.msg || error?.message || 'Error al eliminar el arqueo.');
                            setItemError(true);
                        }
                    });
                    break;
                }
                case 'void': {
                    window.Swal.fire({
                        title: 'Anular arqueo APROBADO',
                        html: `Va a anular logicamente el arqueo <strong>#${row.id}</strong>. El historial se conserva.<br/><br/>Ingrese el motivo (minimo 50 caracteres):`,
                        icon: 'warning',
                        input: 'textarea',
                        inputAttributes: { 'aria-label': 'Motivo de anulacion', minlength: 50, maxlength: 1000 },
                        inputValidator: (v) => {
                            if (!v || v.trim().length < 50) return 'El motivo debe tener al menos 50 caracteres';
                            if (v.length > 1000) return 'Maximo 1000 caracteres';
                            return null;
                        },
                        showCancelButton: true,
                        showDenyButton: false,
                        confirmButtonText: 'Si, anular',
                        cancelButtonText: 'Cancelar',
                        confirmButtonColor: '#ffc107',
                    }).then(async (result) => {
                        if (!result.isConfirmed) return;
                        try {
                            await fetchHelper.post(
                                base_url(['api', 'v1', 'cash-audits', row.id, 'void']),
                                { reason: result.value.trim() },
                                {}, 1000, true
                            );
                            dataTableRef?.current?.ajax?.reload?.();
                            setItemVoid(true);
                        } catch (error) {
                            setErrorMessage(error?.msg || error?.message || 'Error al anular el arqueo.');
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
                        showDenyButton: false,
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
                <AlertPage type="success" message="Arqueo eliminado exitosamente."    show={itemDelete}  onChange={() => setItemDelete(false)} />
                <AlertPage type="success" message="Arqueo anulado exitosamente. El historial se conserva." show={itemVoid} onChange={() => setItemVoid(false)} />
                <AlertPage type="danger"  message={errorMessage}                       show={itemError}   onChange={() => setItemError(false)} />

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
                        { id: 'BORRADOR', label: 'Borrador' },
                        { id: 'EN_REVISION', label: 'En Revision' },
                        { id: 'APROBADO', label: 'Aprobado' },
                        { id: 'RECHAZADO', label: 'Rechazado' },
                        { id: 'CERRADO', label: 'Cerrado' },
                        { id: 'ANULADO', label: 'Anulado' },
                    ]},
                ]}
            />
        </>
    );
};

export default IndexCashAudits;
