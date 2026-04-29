import { useState, useEffect, useRef, useMemo } from 'react';

import DataTableReference from '../../../components/organism/DataTable';
import AlertPage from '../../../components/molecules/AlertPage';
import GenericFilterModal from '../../../components/organism/GenericFilterModal';

import { base_url } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';

/**
 * HU-AP-22 (2026-04-28): Submodulo de Devoluciones de Mercancia.
 *
 * Reutiliza la entidad GoodsReceipt (recepciones) y muestra:
 * - Recepciones rechazadas (status=REJECTED) - operacion ya realizada
 * - Recepciones recibidas que pueden devolverse (status=RECEIVED, sin factura asociada)
 *
 * El backend expone POST /api/v1/ap/receipts/{id}/reject con motivo (>=20 chars).
 *
 * Por requerimiento del usuario "no hace un modulo nuevo, puede ser un submodulo",
 * NO crea una entidad nueva. El historial de devoluciones se rastrea en los
 * mismos campos rejected_at / rejected_by / rejection_reason de GoodsReceipt.
 */

const STATUS_BADGE = {
    RECEIVED: 'bg-label-success',
    REJECTED: 'bg-label-danger',
    RETURNED: 'bg-label-warning',
};

const STATUS_LABEL = {
    RECEIVED: 'Recibido',
    REJECTED: 'Devuelto',
    RETURNED: 'Devuelto',
    PARTIAL: 'Parcial',
    PENDING: 'Pendiente',
};

const IndexGoodsReturns = () => {
    const tableRef = useRef(null);
    const dataTableRef = useRef(null);
    const filterRef = useRef(null);
    const filterInstance = useRef(null);

    const [data, setData] = useState([]);
    const [search, setSearch] = useState({ value: '', checked: true });
    const [message, setMessage] = useState({ message: '', type: '', show: false });

    const url = ['api', 'v1', 'ap', 'receipts'];

    const columns = [
        { title: 'Id', data: 'id', name: 'id' },
        { title: '# Recepcion', data: 'receiptNumber', name: 'receiptNumber',
            render: (val) => val || '-' },
        { title: 'Orden Compra', data: 'purchaseOrderId', name: 'purchaseOrderId',
            render: (val) => val || '-' },
        { title: 'Fecha', data: 'receiptDate', name: 'receiptDate' },
        {
            title: 'Estado',
            data: 'status',
            name: 'status',
            render: (val) => {
                const badge = STATUS_BADGE[val] || 'bg-label-secondary';
                const label = STATUS_LABEL[val] || val || '-';
                return `<span class="badge ${badge}">${label}</span>`;
            },
        },
        { title: 'Factura asociada', data: 'invoiceId', name: 'invoiceId',
            render: (val) => val || '-' },
        {
            title: 'Acciones',
            data: 'id',
            searchable: false,
            render: (id, _type, row) => {
                // Solo recepciones RECEIVED sin factura pueden devolverse
                const canReturn = row?.status === 'RECEIVED' && !row?.invoiceId;
                const isRejected = row?.status === 'REJECTED' || row?.status === 'RETURNED';
                return `
                <div class="d-flex gap-1">
                    <button class="btn btn-sm btn-label-info action-btn"
                        data-action="view" data-id="${id}" title="Ver">
                        <i class="ri-eye-line"></i>
                    </button>
                    <button class="btn btn-sm btn-label-warning action-btn"
                        data-action="return" data-id="${id}"
                        title="${canReturn ? 'Registrar devolucion' : isRejected ? 'Ya devuelto' : 'No devolvible (vinculada a factura)'}"
                        ${!canReturn ? 'disabled' : ''}>
                        <i class="ri-arrow-go-back-line"></i>
                    </button>
                </div>`;
            },
        },
    ];

    const buttons = [{
        text: '<i class="ri-filter-line ri-16px me-sm-2"></i> <span class="d-none d-sm-inline-block">Filtrar</span>',
        className: 'btn rounded-pill btn-secondary waves-effect mx-1 my-2',
        action: () => {
            if (!filterInstance.current) filterInstance.current = new window.bootstrap.Modal(filterRef.current);
            filterInstance.current.show();
        }
    }];

    const rows = useMemo(() => {
        if (Array.isArray(data)) return data;
        if (Array.isArray(data?.data)) return data.data;
        return [];
    }, [data]);

    useEffect(() => {
        const table = dataTableRef?.current;
        if (!table) return;

        const handler = function () {
            const action = $(this).data('action');
            const id = String($(this).data('id'));
            const selected = rows.find((item) => String(item.id) === id);
            if (!selected) return;

            if (action === 'view') {
                window.Swal.fire({
                    title: `Recepcion #${selected.receiptNumber || selected.id}`,
                    html: `
                        <div class="text-start">
                            <p><strong>Orden de Compra:</strong> ${selected.purchaseOrderId || '-'}</p>
                            <p><strong>Fecha:</strong> ${selected.receiptDate || '-'}</p>
                            <p><strong>Estado:</strong> ${STATUS_LABEL[selected.status] || selected.status}</p>
                            <p><strong>Factura asociada:</strong> ${selected.invoiceId || '-'}</p>
                            <p><strong>Notas:</strong> ${selected.notes || '-'}</p>
                            ${selected.rejectionReason ? `<hr/><p><strong>Motivo devolucion:</strong> ${selected.rejectionReason}</p>` : ''}
                        </div>`,
                    width: 500,
                    confirmButtonText: 'Cerrar',
                });
                return;
            }

            if (action === 'return') {
                window.Swal.fire({
                    title: 'Registrar devolucion',
                    text: 'Ingrese el motivo de la devolucion (minimo 20 caracteres).',
                    input: 'textarea',
                    inputAttributes: { maxlength: 500 },
                    inputValidator: (v) => {
                        if (!v || v.trim().length < 20)
                            return 'El motivo debe tener al menos 20 caracteres';
                    },
                    showCancelButton: true,
                    confirmButtonText: 'Devolver',
                    cancelButtonText: 'Cancelar',
                    confirmButtonColor: '#ff9f43',
                }).then(async ({ isConfirmed, value }) => {
                    if (!isConfirmed) return;
                    try {
                        await fetchHelper.post(
                            base_url(['api', 'v1', 'ap', 'receipts', selected.id, 'reject']),
                            { reason: value.trim() }, {}, 1000
                        );
                        setMessage({ type: 'success', show: true,
                            message: 'Devolucion registrada exitosamente.' });
                        dataTableRef?.current?.ajax.reload();
                    } catch (error) {
                        setMessage({ type: 'danger', show: true,
                            message: error?.msg || 'No se pudo registrar la devolucion.' });
                    }
                });
            }
        };

        table.on('click', '.action-btn', handler);
        return () => table.off('click', '.action-btn', handler);
    }, [rows]);

    return (
        <>
            <div className="card">
                <h5 className="card-header text-md-start text-center">
                    <i className="ri-arrow-go-back-line me-2" />Devoluciones de Mercancia
                </h5>
                <div className="card-body pt-0">
                    <p className="text-muted small mb-0">
                        Liste y gestione devoluciones de bienes recibidos.
                        Solo se pueden devolver recepciones <strong>recibidas que aun NO esten vinculadas a una factura</strong>.
                        El motivo es obligatorio y queda registrado en auditoria.
                    </p>
                </div>

                <AlertPage
                    type={message.type}
                    message={message.message}
                    show={message.show}
                    onChange={() => setMessage({ message: '', type: '', show: false })}
                />

                <div className="card-datatable text-nowrap">
                    <DataTableReference
                        url_api={url}
                        columns={columns}
                        tableRef={tableRef}
                        dataTableRef={dataTableRef}
                        method="POST"
                        buttons={buttons}
                        title="Devoluciones de Mercancia"
                        setData={setData}
                        search={search}
                        setSearch={setSearch}
                        filtered={true}
                        lengthMenu={[10, 25, 50, 100]}
                    />
                </div>
            </div>

            <GenericFilterModal
                filterRef={filterRef}
                filterInstance={filterInstance}
                dataTableRef={dataTableRef}
                title="Filtrar Devoluciones"
                columns={[
                    { column: 'receiptNumber:receiptNumber', label: '# Recepcion' },
                    { column: 'purchaseOrderId:purchaseOrderId', label: 'Orden Compra', type: 'number' },
                    { column: 'receiptDate:receiptDate', label: 'Fecha', type: 'date' },
                    { column: 'status:status', label: 'Estado', type: 'select', options: [
                        { id: 'RECEIVED', label: 'Recibido (devolvible)' },
                        { id: 'REJECTED', label: 'Devuelto' },
                        { id: 'RETURNED', label: 'Devuelto' },
                    ]},
                ]}
            />
        </>
    );
};

export default IndexGoodsReturns;
