import { useState, useEffect, useRef, useMemo } from 'react';

import DataTableReference from '../../../components/organism/DataTable';
import AlertPage from '../../../components/molecules/AlertPage';
import GenericFilterModal from '../../../components/organism/GenericFilterModal';

import { base_url } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';
import { usePermissions } from '../../../utils/hooks/usePermissions';
// QA (2026-05-26): helper compartido para traducir estados a espanol y evitar
// que se muestren valores crudos del enum/BD (ej. "COMPLETED" -> "Completado").
import { statusBadge } from '../../../utils/statusLabels';

import CreateApPayment from './create';

/**
 * Pagina principal de Pagos y Abonos (Cuentas por Pagar).
 * Muestra un listado paginado de pagos realizados a proveedores.
 */

/** Colores de badge por estado de pago. */
const STATUS_BADGE = {
    APPLIED: 'bg-label-success',
    PENDING: 'bg-label-warning',
    REVERSED: 'bg-label-danger',
};

const STATUS_LABEL = {
    APPLIED: 'Aplicado',
    PENDING: 'Pendiente',
    REVERSED: 'Reversado',
};

/** Formatea valores monetarios en formato colombiano. */
const formatCurrency = (val) => {
    if (val === null || val === undefined) return '-';
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 2,
    }).format(Number(val));
};

const IndexApPayments = () => {
    const tableRef = useRef(null);
    const dataTableRef = useRef(null);
    const modalCreateRef = useRef(null);
    const modalCreateInstance = useRef(null);
    const filterRef = useRef(null);
    const filterInstance = useRef(null);

    const [data, setData] = useState([]);
    const [search, setSearch] = useState({ value: '', checked: true });
    const [message, setMessage] = useState({ message: '', type: '', show: false });

    /** Endpoint de busqueda paginada de pagos. */
    const url = ['api', 'v1', 'ap', 'payments'];

    /** Columnas del DataTable. */
    const columns = [
        { title: 'Id', data: 'id', name: 'id' },
        {
            title: 'Factura',
            data: 'invoiceId',
            name: 'invoiceId',
            render: (val) => val || '-',
        },
        {
            title: 'Monto',
            data: 'amount',
            name: 'amount',
            render: (val) => formatCurrency(val),
        },
        { title: 'Fecha Pago', data: 'paymentDate', name: 'paymentDate' },
        {
            title: 'Referencia',
            data: 'paymentReference',
            name: 'paymentReference',
            render: (val) => val || '-',
        },
        {
            title: 'Metodo',
            data: 'paymentMethod',
            name: 'paymentMethod',
            render: (val) => val || '-',
        },
        {
            title: 'Estado',
            data: 'status',
            name: 'status',
            // QA (2026-05-26): usa el helper compartido (cubre COMPLETED, APPLIED,
            // PENDING, REVERSED, etc. + fallback title-case). Antes el mapa local
            // no incluia COMPLETED y se mostraba el enum crudo.
            render: (val) => statusBadge(val),
        },
        {
            title: 'Acciones',
            data: 'id',
            searchable: false,
            render: (id, _type, row) => {
                // RF-34 (Notas Tecnicas CXP): reversar pago. Habilitado solo si el
                // pago NO esta ya reversado y el rol tiene el permiso. El backend
                // valida ademas que la factura no este liquidada y el periodo abierto.
                const reversible = row?.status !== 'REVERSED';
                const btns = [`<button class="btn btn-sm btn-label-info action-btn" data-action="view" data-id="${id}" title="Ver"><i class="ri-eye-line"></i></button>`];
                if (canReverse) {
                    btns.push(`<button class="btn btn-sm btn-label-warning action-btn" data-action="reverse" data-id="${id}" title="${reversible ? 'Reversar pago (RF-34)' : 'El pago ya esta reversado'}" ${!reversible ? 'disabled' : ''}><i class="ri-arrow-go-back-line"></i></button>`);
                }
                return `<div class="d-flex gap-1">${btns.join('')}</div>`;
            },
        },
    ];

    /** Abre modal de registro de pago. */
    const openModalCreate = () => {
        if (!modalCreateInstance.current) {
            modalCreateInstance.current = new window.bootstrap.Modal(modalCreateRef.current);
        }
        modalCreateInstance.current.show();
    };

    /** Botones de cabecera. */
    // QA CXP item 5 (2026-06-02): gating de permisos (el backend ya bloquea via
    // @PreAuthorize; ocultamos el boton de crear si el rol no tiene el permiso).
    const { has } = usePermissions();
    const canCreate = has('AP.PAGOS.CREAR');
    // RF-34 (Notas Tecnicas CXP): permiso para reversar pagos.
    const canReverse = has('AP.PAGOS.REVERSAR');

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
            text: '<i class="ri-add-line ri-16px me-sm-2"></i><span class="d-none d-sm-inline-block">Registrar Pago</span>',
            className: 'btn rounded-pill btn-primary waves-effect mx-2 my-2',
            action: () => openModalCreate(),
        }] : []),
    ];

    /** Rows normalizadas. */
    const rows = useMemo(() => {
        if (Array.isArray(data)) return data;
        if (Array.isArray(data?.data)) return data.data;
        return [];
    }, [data]);

    /** Listener de acciones por fila. */
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
                    title: `Pago #${selected.id}`,
                    html: `
                        <div class="text-start">
                            <p><strong>Factura:</strong> ${selected.invoiceId || '-'}</p>
                            <p><strong>Monto:</strong> ${formatCurrency(selected.amount)}</p>
                            <p><strong>Fecha:</strong> ${selected.paymentDate || '-'}</p>
                            <p><strong>Referencia:</strong> ${selected.paymentReference || '-'}</p>
                            <p><strong>Metodo:</strong> ${selected.paymentMethod || '-'}</p>
                            <p><strong>Notas:</strong> ${selected.notes || '-'}</p>
                        </div>`,
                    width: 500,
                    confirmButtonText: 'Cerrar',
                });
            }

            if (action === 'reverse') {
                // RF-34 (Notas Tecnicas CXP): reversar pago con motivo obligatorio
                // (minimo 10 caracteres). El backend deshace el asiento, compensa el
                // movimiento BNK y restaura el saldo de la factura.
                if (selected.status === 'REVERSED') {
                    setMessage({ type: 'warning', show: true, message: 'Este pago ya fue reversado.' });
                    return;
                }
                window.Swal.fire({
                    title: `Reversar pago #${selected.id}`,
                    html: `
                        <div class="text-start">
                            <p class="mb-2">Se reversara el pago de <strong>${formatCurrency(selected.amount)}</strong>
                            sobre la factura <strong>${selected.invoiceId || '-'}</strong>. El saldo de la
                            factura se restaura y el asiento contable se deshace.</p>
                            <label class="form-label small fw-semibold">Motivo (minimo 10 caracteres)</label>
                            <textarea id="rev_reason" class="form-control" rows="3" maxlength="500"></textarea>
                        </div>`,
                    width: 560,
                    showCancelButton: true,
                    confirmButtonText: 'Reversar',
                    cancelButtonText: 'Cancelar',
                    confirmButtonColor: '#ff9f43',
                    focusConfirm: false,
                    preConfirm: () => {
                        const reason = (document.getElementById('rev_reason')?.value || '').trim();
                        if (reason.length < 10) {
                            window.Swal.showValidationMessage('El motivo debe tener al menos 10 caracteres');
                            return false;
                        }
                        return { reason };
                    },
                }).then(async ({ isConfirmed, value }) => {
                    if (!isConfirmed) return;
                    try {
                        const resp = await fetchHelper.post(
                            base_url(['api', 'v1', 'ap', 'payments', selected.id, 'reverse']),
                            { reason: value.reason }, {}, 1000
                        );
                        setMessage({ type: 'success', show: true,
                            message: resp?.message || 'Pago revertido correctamente.' });
                        dataTableRef?.current?.ajax.reload();
                    } catch (error) {
                        setMessage({ type: 'danger', show: true,
                            message: error?.msg || error?.message || 'No se pudo reversar el pago.' });
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
                <h5 className="card-header text-md-start text-center">Pagos y Abonos</h5>

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
                        title="Pagos y Abonos"
                        setData={setData}
                        search={search}
                        setSearch={setSearch}
                        filtered={true}
                        lengthMenu={[10, 25, 50, 100]}
                    />
                </div>
            </div>

            <CreateApPayment
                modalRef={modalCreateRef}
                modalInstance={modalCreateInstance}
                dataTableRef={dataTableRef}
                setMessage={setMessage}
            />

            <GenericFilterModal
                filterRef={filterRef}
                filterInstance={filterInstance}
                dataTableRef={dataTableRef}
                title="Filtrar Pagos y Abonos"
                columns={[
                    { column: 'invoiceId:name', label: 'Factura', type: 'number' },
                    { column: 'amount:name', label: 'Monto', type: 'number' },
                    { column: 'paymentDate:name', label: 'Fecha Pago', type: 'date' },
                    { column: 'paymentReference:name', label: 'Referencia' },
                    { column: 'status:name', label: 'Estado', type: 'select', options: [
                        { id: 'APPLIED', label: 'Aplicado' },
                        { id: 'PENDING', label: 'Pendiente' },
                        { id: 'REVERSED', label: 'Reversado' },
                    ]},
                ]}
            />
        </>
    );
};

export default IndexApPayments;
