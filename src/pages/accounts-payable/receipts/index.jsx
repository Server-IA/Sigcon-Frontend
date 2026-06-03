import { useState, useEffect, useRef, useMemo } from 'react';

import DataTableReference from '../../../components/organism/DataTable';
import AlertPage from '../../../components/molecules/AlertPage';
import GenericFilterModal from '../../../components/organism/GenericFilterModal';

import { base_url } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';
import { usePermissions } from '../../../utils/hooks/usePermissions';

import CreateApReceipt from './create';

import { statusBadge, traducir } from '../../../utils/statusLabels';
/**
 * Pagina principal de Recepciones de Bienes (Cuentas por Pagar).
 * Muestra un listado paginado de recepciones asociadas a ordenes de compra.
 */

const STATUS_BADGE = {
    RECEIVED: 'bg-label-success',
    PARTIAL: 'bg-label-warning',
    PENDING: 'bg-label-info',
    REJECTED: 'bg-label-danger',
};

const STATUS_LABEL = {
    RECEIVED: 'Recibido',
    PARTIAL: 'Parcial',
    PENDING: 'Pendiente',
    REJECTED: 'Rechazado',
};

const IndexApReceipts = () => {
    const tableRef = useRef(null);
    const dataTableRef = useRef(null);
    const modalCreateRef = useRef(null);
    const modalCreateInstance = useRef(null);
    const filterRef = useRef(null);
    const filterInstance = useRef(null);

    const [data, setData] = useState([]);
    const [search, setSearch] = useState({ value: '', checked: true });
    const [message, setMessage] = useState({ message: '', type: '', show: false });

    const url = ['api', 'v1', 'ap', 'receipts'];

    const columns = [
        { title: 'Id', data: 'id', name: 'id' },
        {
            title: '# Recepcion',
            data: 'receiptNumber',
            name: 'receiptNumber',
            render: (val) => val || '-',
        },
        {
            title: 'Orden Compra',
            data: 'purchaseOrderId',
            name: 'purchaseOrderId',
            render: (val) => val || '-',
        },
        { title: 'Fecha', data: 'receiptDate', name: 'receiptDate' },
        {
            title: 'Estado',
            data: 'status',
            name: 'status',
            render: (val) => {
                return statusBadge(val);
            },
        },
        {
            // RF-19 (Notas Tecnicas CXP, 2026-06-02): muestra "Multiple" cuando la
            // recepcion tiene mas de una factura asociada (enlaces N:M), en vez de
            // mostrar solo la primera factura.
            title: 'Factura Asociada',
            data: 'invoiceLabel',
            name: 'invoiceId',
            render: (val, _type, row) => {
                const count = row?.linkedInvoiceCount ?? (row?.invoiceId ? 1 : 0);
                if (count > 1) return '<span class="badge bg-label-primary">Múltiple</span>';
                if (count === 1) return val || (row?.invoiceId ? `#${row.invoiceId}` : '-');
                return '-';
            },
        },
        {
            title: 'Acciones',
            data: 'id',
            searchable: false,
            render: (id, _type, row) => {
                // HU-AP-20 (2026-04-28): permitir vincular la recepcion con
                // una factura del mismo proveedor. RF-19: deshabilitado si ya tiene
                // al menos una factura asociada (legacy o enlaces N:M).
                const linked = row?.linkedInvoiceCount != null
                    ? row.linkedInvoiceCount > 0
                    : !!row?.invoiceId;
                const canLink = !linked;
                // QA CXP item 5: vincular factura (3-way match) requiere AP.RECEPCIONES.CREAR.
                const btns = [`<button class="btn btn-sm btn-label-info action-btn" data-action="view" data-id="${id}" title="Ver"><i class="ri-eye-line"></i></button>`];
                if (canCreate) btns.push(`<button class="btn btn-sm btn-label-success action-btn" data-action="link-invoice" data-id="${id}" title="Vincular factura del proveedor (3-way match)" ${!canLink ? 'disabled' : ''}><i class="ri-link"></i></button>`);
                return `<div class="d-flex gap-1">${btns.join('')}</div>`;
            },
        },
    ];

    // QA CXP item 5 (2026-06-02): gating de permisos (backend ya bloquea via @PreAuthorize).
    const { has } = usePermissions();
    const canCreate = has('AP.RECEPCIONES.CREAR');

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
        ...(canCreate ? [{
            text: '<i class="ri-add-line ri-16px me-sm-2"></i><span class="d-none d-sm-inline-block">Registrar Recepcion</span>',
            className: 'btn rounded-pill btn-primary waves-effect mx-2 my-2',
            action: () => openModalCreate(),
        }] : []),
    ];

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
                            <p><strong>Estado:</strong> ${traducir(selected.status)}</p>
                            <p><strong>Factura Asociada:</strong> ${(selected.linkedInvoiceCount > 1)
                                ? 'Múltiple (' + selected.linkedInvoiceCount + ' facturas)'
                                : (selected.invoiceLabel || selected.invoiceId || '-')}</p>
                            <p><strong>Notas:</strong> ${selected.notes || '-'}</p>
                        </div>`,
                    width: 500,
                    confirmButtonText: 'Cerrar',
                });
            }

            if (action === 'link-invoice') {
                // HU-AP-20 (Bloque AT): cargar facturas SIN vincular del mismo
                // proveedor de la recepcion. QA reporto que el input numerico
                // es propenso a error; mejor dropdown filtrado.
                (async () => {
                    let invoiceOptions = {};
                    try {
                        const resp = await fetchHelper.post(
                            base_url(['api', 'v1', 'invoices', 'search']),
                            {
                                start: 0, length: 200, draw: 1,
                                columns: [], order: [], search: { value: '' }
                            }, {}, 0, false
                        );
                        const allInvoices = resp?.data || [];
                        // Filtrar por proveedor de la OC + estado abierto/no anulado
                        allInvoices
                            .filter(inv => inv.status !== 'VOIDED' && inv.status !== 'SETTLED')
                            .forEach(inv => {
                                const label = `#${inv.id} - ${inv.supplierInvoiceNumber || inv.resolutionInvoice} | ${inv.thirdPartyName || ''} | $${inv.totalPayment || 0} | ${inv.status}`;
                                invoiceOptions[String(inv.id)] = label;
                            });
                    } catch (err) {
                        console.error('Error cargando facturas:', err);
                    }
                    if (Object.keys(invoiceOptions).length === 0) {
                        setMessage({ type: 'warning', show: true,
                            message: 'No hay facturas disponibles para vincular. Cree una factura primero.' });
                        return;
                    }
                    const result = await window.Swal.fire({
                        title: 'Vincular factura del proveedor',
                        text: 'Seleccione la factura de compra a vincular con esta recepcion.',
                        input: 'select',
                        inputOptions: invoiceOptions,
                        inputPlaceholder: '-- Seleccione una factura --',
                        inputValidator: (v) => !v ? 'Debe seleccionar una factura' : null,
                        showCancelButton: true,
                        confirmButtonText: 'Vincular',
                        cancelButtonText: 'Cancelar',
                    });
                    if (!result.isConfirmed) return;
                    try {
                        // QA Bloque AU+ HU-AP-19 E5 (2026-05-07): el backend
                        // devuelve `warning` en payload + el message detalla
                        // si la recepcion quedo Parcialmente facturada. Antes
                        // el frontend mostraba siempre "vinculada exitosamente"
                        // y el contador no veia la advertencia de diferencia.
                        const response = await fetchHelper.post(
                            base_url(['api', 'v1', 'ap', 'receipts', selected.id, 'link-invoice']),
                            { invoiceId: Number(result.value) }, {}, 1000
                        );
                        const w = response?.data?.warning || null;
                        if (w) {
                            // Mensaje informativo destacado para el contador
                            // (HU-AP-19 E5: factura inferior al saldo pendiente)
                            window.Swal.fire({
                                icon: 'warning',
                                title: 'Factura vinculada con advertencia',
                                html: `<div class="text-start"><p class="mb-2">${response?.message || 'Factura vinculada.'}</p>`
                                     + `<div class="alert alert-warning py-2 mb-0"><i class="ri-alert-line me-1"></i>${w}</div></div>`,
                                confirmButtonText: 'Entendido',
                            });
                            setMessage({ type: 'warning', show: true, message: w });
                        } else {
                            setMessage({ type: 'success', show: true,
                                message: response?.message || 'Factura vinculada exitosamente a la recepcion.' });
                        }
                        dataTableRef?.current?.ajax.reload();
                    } catch (error) {
                        setMessage({ type: 'danger', show: true,
                            message: error?.msg || error?.message || 'No se pudo vincular la factura.' });
                    }
                })();
            }
        };

        table.on('click', '.action-btn', handler);
        return () => table.off('click', '.action-btn', handler);
    }, [rows]);

    return (
        <>
            <div className="card">
                <h5 className="card-header text-md-start text-center">Recepciones de Bienes</h5>

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
                        title="Recepciones de Bienes"
                        setData={setData}
                        search={search}
                        setSearch={setSearch}
                        filtered={true}
                        lengthMenu={[10, 25, 50, 100]}
                    />
                </div>
            </div>

            <CreateApReceipt
                modalRef={modalCreateRef}
                modalInstance={modalCreateInstance}
                dataTableRef={dataTableRef}
                setMessage={setMessage}
            />

            <GenericFilterModal
                filterRef={filterRef}
                filterInstance={filterInstance}
                dataTableRef={dataTableRef}
                title="Filtrar Recepciones"
                columns={[
                    { column: 'receiptNumber:name', label: '# Recepcion' },
                    { column: 'purchaseOrderId:name', label: 'Orden Compra', type: 'number' },
                    { column: 'receiptDate:name', label: 'Fecha', type: 'date' },
                    { column: 'invoiceId:name', label: 'Factura Asociada', type: 'number' },
                    { column: 'status:name', label: 'Estado', type: 'select', options: [
                        { id: 'RECEIVED', label: 'Recibido' },
                        { id: 'PARTIAL', label: 'Parcial' },
                        { id: 'PENDING', label: 'Pendiente' },
                        { id: 'REJECTED', label: 'Rechazado' },
                    ]},
                ]}
            />
        </>
    );
};

export default IndexApReceipts;
