import { useState, useEffect, useRef, useMemo } from 'react';

import DataTableReference from '../../../components/organism/DataTable';
import AlertPage from '../../../components/molecules/AlertPage';

import { base_url } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';

import CreateApPurchaseOrder from './create';

/**
 * Pagina principal de Ordenes de Compra (Cuentas por Pagar).
 * Muestra un listado paginado y permite crear, aprobar y rechazar ordenes.
 */

const STATUS_BADGE = {
    DRAFT:     'bg-label-secondary',
    PENDING:   'bg-label-warning',
    APPROVED:  'bg-label-success',
    REJECTED:  'bg-label-danger',
    RECEIVED:  'bg-label-info',
    CANCELLED: 'bg-label-secondary',
};

const STATUS_LABEL = {
    DRAFT:     'Borrador',
    PENDING:   'Pendiente',
    APPROVED:  'Aprobada',
    REJECTED:  'Rechazada',
    RECEIVED:  'Recibida',
    CANCELLED: 'Cancelada',
};

const formatCurrency = (val) => {
    if (val === null || val === undefined) return '-';
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 2,
    }).format(Number(val));
};

const IndexApPurchaseOrders = () => {
    const tableRef = useRef(null);
    const dataTableRef = useRef(null);
    const modalCreateRef = useRef(null);
    const modalCreateInstance = useRef(null);

    const [data, setData] = useState([]);
    const [search, setSearch] = useState({ value: '', checked: true });
    const [message, setMessage] = useState({ message: '', type: '', show: false });

    const url = ['api', 'v1', 'ap', 'purchase-orders'];

    const columns = [
        { title: 'Id', data: 'id', name: 'id' },
        {
            title: '# Orden',
            data: 'orderNumber',
            name: 'orderNumber',
            render: (val) => val || '-',
        },
        {
            title: 'Proveedor',
            data: 'thirdPartyName',
            name: 'thirdPartyName',
            render: (val) => val || '-',
        },
        { title: 'Fecha', data: 'orderDate', name: 'orderDate' },
        {
            title: 'Total',
            data: 'totalAmount',
            name: 'totalAmount',
            render: (val) => formatCurrency(val),
        },
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
        {
            title: 'Acciones',
            data: 'id',
            searchable: false,
            render: (id, _type, row) => {
                const isDraft   = row?.status === 'DRAFT';
                const isPending = row?.status === 'PENDING';
                return `
                <div class="d-flex gap-1">
                    <button class="btn btn-sm btn-label-info action-btn"
                        data-action="view" data-id="${id}" title="Ver">
                        <i class="ri-eye-line"></i>
                    </button>
                    <button class="btn btn-sm btn-label-primary action-btn"
                        data-action="submit" data-id="${id}" title="Enviar a aprobacion"
                        ${!isDraft ? 'disabled' : ''}>
                        <i class="ri-send-plane-line"></i>
                    </button>
                    <button class="btn btn-sm btn-label-success action-btn"
                        data-action="approve" data-id="${id}" title="Aprobar"
                        ${!isPending ? 'disabled' : ''}>
                        <i class="ri-check-line"></i>
                    </button>
                    <button class="btn btn-sm btn-label-danger action-btn"
                        data-action="reject" data-id="${id}" title="Rechazar"
                        ${!isPending ? 'disabled' : ''}>
                        <i class="ri-close-line"></i>
                    </button>
                </div>`;
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
            text: '<i class="ri-add-line ri-16px me-sm-2"></i><span class="d-none d-sm-inline-block">Nueva Orden</span>',
            className: 'btn rounded-pill btn-primary waves-effect mx-2 my-2',
            action: () => openModalCreate(),
        },
    ];

    const rows = useMemo(() => {
        if (Array.isArray(data)) return data;
        if (Array.isArray(data?.data)) return data.data;
        return [];
    }, [data]);

    /** Envia una orden DRAFT a aprobacion (DRAFT -> PENDING). */
    const handleSubmit = async (selected) => {
        const confirm = await window.Swal.fire({
            title: 'Enviar a aprobacion?',
            text: `La orden #${selected.orderNumber || selected.id} pasara a estado Pendiente y quedara lista para ser aprobada o rechazada.`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Enviar',
            cancelButtonText: 'Cancelar',
        });
        if (!confirm.isConfirmed) return;

        try {
            await fetchHelper.post(
                base_url(['api', 'v1', 'ap', 'purchase-orders', selected.id, 'submit']),
                {}, {}, 1000
            );
            setMessage({ type: 'success', show: true, message: 'Orden enviada a aprobacion.' });
        } catch (error) {
            setMessage({
                type: 'danger',
                show: true,
                message: error?.msg || 'Error al enviar la orden a aprobacion.',
            });
        } finally {
            dataTableRef?.current?.ajax.reload();
        }
    };

    /** Aprueba una orden de compra con confirmacion. */
    const handleApprove = async (selected) => {
        const confirm = await window.Swal.fire({
            title: 'Aprobar Orden?',
            text: `Se aprobara la orden #${selected.orderNumber || selected.id}`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Aprobar',
            cancelButtonText: 'Cancelar',
        });
        if (!confirm.isConfirmed) return;

        try {
            await fetchHelper.post(
                base_url(['api', 'v1', 'ap', 'purchase-orders', selected.id, 'approve']),
                {},
                {},
                1000
            );
            setMessage({ type: 'success', show: true, message: 'Orden aprobada exitosamente.' });
        } catch (error) {
            setMessage({
                type: 'danger',
                show: true,
                message: error?.msg || 'Error al aprobar la orden.',
            });
        } finally {
            dataTableRef?.current?.ajax.reload();
        }
    };

    /** Rechaza una orden de compra con motivo. */
    const handleReject = async (selected) => {
        const result = await window.Swal.fire({
            title: 'Rechazar Orden?',
            input: 'text',
            inputLabel: 'Motivo del rechazo',
            inputPlaceholder: 'Ingrese el motivo',
            showCancelButton: true,
            confirmButtonText: 'Rechazar',
            cancelButtonText: 'Cancelar',
            inputValidator: (value) => {
                if (!value || !value.trim()) return 'El motivo es obligatorio';
            },
        });
        if (!result.isConfirmed) return;

        try {
            await fetchHelper.post(
                base_url(['api', 'v1', 'ap', 'purchase-orders', selected.id, 'reject']),
                { rejectionReason: result.value.trim() },
                {},
                1000
            );
            setMessage({ type: 'success', show: true, message: 'Orden rechazada.' });
        } catch (error) {
            setMessage({
                type: 'danger',
                show: true,
                message: error?.msg || 'Error al rechazar la orden.',
            });
        } finally {
            dataTableRef?.current?.ajax.reload();
        }
    };

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
                    title: `Orden #${selected.orderNumber || selected.id}`,
                    html: `
                        <div class="text-start">
                            <p><strong>Proveedor:</strong> ${selected.thirdPartyName || '-'}</p>
                            <p><strong>Fecha:</strong> ${selected.orderDate || '-'}</p>
                            <p><strong>Entrega:</strong> ${selected.deliveryDate || '-'}</p>
                            <p><strong>Total:</strong> ${formatCurrency(selected.totalAmount)}</p>
                            <p><strong>Estado:</strong> ${STATUS_LABEL[selected.status] || selected.status}</p>
                            <p><strong>Notas:</strong> ${selected.notes || '-'}</p>
                        </div>`,
                    width: 500,
                    confirmButtonText: 'Cerrar',
                });
                return;
            }

            if (action === 'submit') {
                if (selected.status !== 'DRAFT') return;
                handleSubmit(selected);
                return;
            }

            if (action === 'approve') {
                if (selected.status !== 'PENDING') return;
                handleApprove(selected);
                return;
            }

            if (action === 'reject') {
                if (selected.status !== 'PENDING') return;
                handleReject(selected);
            }
        };

        table.on('click', '.action-btn', handler);
        return () => table.off('click', '.action-btn', handler);
    }, [rows]);

    return (
        <>
            <div className="card">
                <h5 className="card-header text-md-start text-center">Ordenes de Compra</h5>

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
                        title="Ordenes de Compra"
                        setData={setData}
                        search={search}
                        setSearch={setSearch}
                        filtered={true}
                        lengthMenu={[10, 25, 50, 100]}
                    />
                </div>
            </div>

            <CreateApPurchaseOrder
                modalRef={modalCreateRef}
                modalInstance={modalCreateInstance}
                dataTableRef={dataTableRef}
                setMessage={setMessage}
            />
        </>
    );
};

export default IndexApPurchaseOrders;
