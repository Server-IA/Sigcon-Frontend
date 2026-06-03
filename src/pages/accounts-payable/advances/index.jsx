import { useState, useEffect, useRef, useMemo } from 'react';

import DataTableReference from '../../../components/organism/DataTable';
import AlertPage from '../../../components/molecules/AlertPage';
import GenericFilterModal from '../../../components/organism/GenericFilterModal';

import { base_url } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';
import { usePermissions } from '../../../utils/hooks/usePermissions';

import CreateApAdvance from './create';
import ApplyApAdvance from './apply';

import { statusBadge, traducir } from '../../../utils/statusLabels';
/**
 * Pagina principal de Anticipos a Proveedores (Cuentas por Pagar).
 * Muestra un listado paginado y permite registrar y aplicar anticipos.
 *
 * QA-BLOQUE-AO (2026-04-29): refactor del flujo "Aplicar a Factura":
 *  - Antes: el filter de status pedia AVAILABLE/PARTIALLY_APPLIED, pero el
 *    backend usa PENDING/APPLIED. Resultado: boton apply siempre deshabilitado.
 *  - El handler abria un Swal con input numerico de ID factura (no usable).
 *  - Ahora: status mapeado a PENDING/APPLIED + modal con dropdown de facturas
 *    de compra pendientes del proveedor (similar a AR cobros/anticipos).
 */

const STATUS_BADGE = {
    PENDING: 'bg-label-success',
    APPLIED: 'bg-label-info',
    REVERSED: 'bg-label-danger',
};

const STATUS_LABEL = {
    PENDING: 'Pendiente',
    APPLIED: 'Aplicado',
    REVERSED: 'Reversado',
};

const formatCurrency = (val) => {
    if (val === null || val === undefined) return '-';
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 2,
    }).format(Number(val));
};

const IndexApAdvances = () => {
    const tableRef = useRef(null);
    const dataTableRef = useRef(null);
    const modalCreateRef = useRef(null);
    const modalCreateInstance = useRef(null);
    const modalApplyRef = useRef(null);
    const modalApplyInstance = useRef(null);
    const filterRef = useRef(null);
    const filterInstance = useRef(null);

    const [data, setData] = useState([]);
    const [search, setSearch] = useState({ value: '', checked: true });
    const [message, setMessage] = useState({ message: '', type: '', show: false });
    const [selectedAdvance, setSelectedAdvance] = useState(null);

    const url = ['api', 'v1', 'ap', 'advances'];

    // QA CXP item 5 (2026-06-02): gating de permisos (backend ya bloquea via
    // @PreAuthorize). Crear y aplicar anticipo requieren AP.ANTICIPOS.CREAR.
    const { has } = usePermissions();
    const canCreate = has('AP.ANTICIPOS.CREAR');

    const columns = [
        { title: 'Id', data: 'id', name: 'id' },
        {
            title: 'Proveedor',
            data: 'thirdPartyName',
            // QA-BLOQUE-AO (2026-04-29): path JPA real para filter modal.
            name: 'thirdParty.businessName',
            render: (val) => val || '-',
        },
        {
            title: 'Monto',
            data: 'amount',
            name: 'amount',
            render: (val) => formatCurrency(val),
        },
        { title: 'Fecha', data: 'advanceDate', name: 'advanceDate' },
        {
            title: 'Estado',
            data: 'status',
            name: 'status',
            render: (val) => {
                return statusBadge(val);
            },
        },
        {
            title: 'Factura Aplicada',
            data: 'appliedInvoiceId',
            name: 'appliedInvoiceId',
            render: (val) => val || '-',
        },
        {
            title: 'Acciones',
            data: 'id',
            searchable: false,
            render: (id, _type, row) => {
                // QA-BLOQUE-AO (2026-04-29): status real del backend es PENDING (no AVAILABLE).
                const canApply = row?.status === 'PENDING';
                // QA CXP item 5: "Aplicar a Factura" solo si el rol puede crear anticipos.
                const btns = [`<button class="btn btn-sm btn-label-info action-btn" data-action="view" data-id="${id}" title="Ver"><i class="ri-eye-line"></i></button>`];
                if (canCreate) btns.push(`<button class="btn btn-sm btn-label-success action-btn" data-action="apply" data-id="${id}" title="Aplicar a Factura" ${!canApply ? 'disabled' : ''}><i class="ri-links-line"></i></button>`);
                return `<div class="d-flex gap-1">${btns.join('')}</div>`;
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
        ...(canCreate ? [{
            text: '<i class="ri-add-line ri-16px me-sm-2"></i><span class="d-none d-sm-inline-block">Registrar Anticipo</span>',
            className: 'btn rounded-pill btn-primary waves-effect mx-2 my-2',
            action: () => openModalCreate(),
        }] : []),
    ];

    const rows = useMemo(() => {
        if (Array.isArray(data)) return data;
        if (Array.isArray(data?.data)) return data.data;
        return [];
    }, [data]);

    /**
     * QA-BLOQUE-AO (2026-04-29): abre el modal dedicado con dropdown de
     * facturas de compra pendientes en lugar de un Swal con input numerico.
     */
    const openModalApply = (advance) => {
        setSelectedAdvance(advance);
        if (!modalApplyInstance.current) {
            modalApplyInstance.current = new window.bootstrap.Modal(modalApplyRef.current);
        }
        modalApplyInstance.current.show();
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
                    title: `Anticipo #${selected.id}`,
                    html: `
                        <div class="text-start">
                            <p><strong>Proveedor:</strong> ${selected.thirdPartyName || '-'}</p>
                            <p><strong>Monto:</strong> ${formatCurrency(selected.amount)}</p>
                            <p><strong>Fecha:</strong> ${selected.advanceDate || '-'}</p>
                            <p><strong>Estado:</strong> ${traducir(selected.status)}</p>
                            <p><strong>Notas:</strong> ${selected.notes || '-'}</p>
                        </div>`,
                    width: 500,
                    confirmButtonText: 'Cerrar',
                });
                return;
            }

            if (action === 'apply') {
                openModalApply(selected);
            }
        };

        table.on('click', '.action-btn', handler);
        return () => table.off('click', '.action-btn', handler);
    }, [rows]);

    return (
        <>
            <div className="card">
                <h5 className="card-header text-md-start text-center">Anticipos a Proveedores</h5>

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
                        title="Anticipos a Proveedores"
                        setData={setData}
                        search={search}
                        setSearch={setSearch}
                        filtered={true}
                        lengthMenu={[10, 25, 50, 100]}
                    />
                </div>
            </div>

            <CreateApAdvance
                modalRef={modalCreateRef}
                modalInstance={modalCreateInstance}
                dataTableRef={dataTableRef}
                setMessage={setMessage}
            />

            <ApplyApAdvance
                modalRef={modalApplyRef}
                modalInstance={modalApplyInstance}
                dataTableRef={dataTableRef}
                advance={selectedAdvance}
                setMessage={setMessage}
            />

            <GenericFilterModal
                filterRef={filterRef}
                filterInstance={filterInstance}
                dataTableRef={dataTableRef}
                title="Filtrar Anticipos a Proveedores"
                columns={[
                    { column: 'thirdPartyName:name', label: 'Proveedor' },
                    { column: 'amount:name', label: 'Monto', type: 'number' },
                    { column: 'advanceDate:name', label: 'Fecha', type: 'date' },
                    { column: 'status:name', label: 'Estado', type: 'select', options: [
                        { id: 'AVAILABLE', label: 'Disponible' },
                        { id: 'APPLIED', label: 'Aplicado' },
                        { id: 'PARTIALLY_APPLIED', label: 'Parcialmente Aplicado' },
                        { id: 'REVERSED', label: 'Reversado' },
                    ]},
                ]}
            />
        </>
    );
};

export default IndexApAdvances;
