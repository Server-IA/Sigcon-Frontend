import { useState, useEffect, useRef, useMemo } from 'react';

import DataTableReference from '../../../components/organism/DataTable';
import AlertPage from '../../../components/molecules/AlertPage';
import GenericFilterModal from '../../../components/organism/GenericFilterModal';

import { base_url } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';
import { usePermissions } from '../../../utils/hooks/usePermissions';

import CreateApNote from './create';

/**
 * Pagina principal de Notas Credito/Debito (Cuentas por Pagar).
 * Muestra un listado paginado de notas asociadas a facturas de compra.
 */

const TYPE_BADGE = {
    CREDIT: 'bg-label-success',
    DEBIT: 'bg-label-danger',
};

const TYPE_LABEL = {
    CREDIT: 'Nota Credito',
    DEBIT: 'Nota Debito',
};

const formatCurrency = (val) => {
    if (val === null || val === undefined) return '-';
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 2,
    }).format(Number(val));
};

const IndexApNotes = () => {
    const tableRef = useRef(null);
    const dataTableRef = useRef(null);
    const modalCreateRef = useRef(null);
    const modalCreateInstance = useRef(null);
    const filterRef = useRef(null);
    const filterInstance = useRef(null);

    const [data, setData] = useState([]);
    const [search, setSearch] = useState({ value: '', checked: true });
    const [message, setMessage] = useState({ message: '', type: '', show: false });

    const url = ['api', 'v1', 'ap', 'notes'];

    const columns = [
        { title: 'Id', data: 'id', name: 'id' },
        {
            title: 'Factura',
            data: 'invoiceId',
            name: 'invoiceId',
            render: (val) => val || '-',
        },
        {
            title: 'Tipo',
            data: 'noteType',
            name: 'noteType',
            render: (val) => {
                const badge = TYPE_BADGE[val] || 'bg-label-secondary';
                const label = TYPE_LABEL[val] || val || '-';
                return `<span class="badge ${badge}">${label}</span>`;
            },
        },
        {
            title: 'Numero Nota',
            data: 'noteNumber',
            name: 'noteNumber',
            render: (val) => val || '-',
        },
        {
            title: 'Monto',
            data: 'amount',
            name: 'amount',
            render: (val) => formatCurrency(val),
        },
        {
            title: 'Motivo',
            data: 'reason',
            name: 'reason',
            // RF-29 (Notas Tecnicas CXP): truncar el motivo a 50 chars con
            // tooltip que muestra el texto completo, para no romper la tabla.
            render: (val) => {
                if (!val) return '-';
                const safe = String(val).replace(/"/g, '&quot;');
                const short = val.length > 50 ? `${val.slice(0, 50)}...` : val;
                return `<span title="${safe}">${short}</span>`;
            },
        },
        {
            title: 'Acciones',
            data: 'id',
            searchable: false,
            render: (id) => `
                <div class="d-flex gap-1">
                    <button class="btn btn-sm btn-label-info action-btn"
                        data-action="view" data-id="${id}" title="Ver">
                        <i class="ri-eye-line"></i>
                    </button>
                </div>`,
        },
    ];

    const openModalCreate = () => {
        if (!modalCreateInstance.current) {
            modalCreateInstance.current = new window.bootstrap.Modal(modalCreateRef.current);
        }
        modalCreateInstance.current.show();
    };

    // QA CXP item 5 (2026-06-02): gating de permisos (backend ya bloquea via
    // @PreAuthorize; ocultamos el boton de crear si el rol no tiene el permiso).
    const { has } = usePermissions();
    const canCreate = has('AP.NOTAS.CREAR');

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
            text: '<i class="ri-add-line ri-16px me-sm-2"></i><span class="d-none d-sm-inline-block">Crear Nota</span>',
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
                    title: `Nota #${selected.noteNumber || selected.id}`,
                    html: `
                        <div class="text-start">
                            <p><strong>Factura:</strong> ${selected.invoiceId || '-'}</p>
                            <p><strong>Tipo:</strong> ${TYPE_LABEL[selected.noteType] || selected.noteType}</p>
                            <p><strong>Monto:</strong> ${formatCurrency(selected.amount)}</p>
                            <p><strong>Motivo:</strong> ${selected.reason || '-'}</p>
                        </div>`,
                    width: 500,
                    confirmButtonText: 'Cerrar',
                });
            }
        };

        table.on('click', '.action-btn', handler);
        return () => table.off('click', '.action-btn', handler);
    }, [rows]);

    return (
        <>
            <div className="card">
                <h5 className="card-header text-md-start text-center">Notas Credito/Debito</h5>

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
                        title="Notas Credito/Debito"
                        setData={setData}
                        search={search}
                        setSearch={setSearch}
                        filtered={true}
                        lengthMenu={[10, 25, 50, 100]}
                    />
                </div>
            </div>

            <CreateApNote
                modalRef={modalCreateRef}
                modalInstance={modalCreateInstance}
                dataTableRef={dataTableRef}
                setMessage={setMessage}
            />

            <GenericFilterModal
                filterRef={filterRef}
                filterInstance={filterInstance}
                dataTableRef={dataTableRef}
                title="Filtrar Notas Credito/Debito"
                columns={[
                    { column: 'invoiceId:name', label: 'Factura', type: 'number' },
                    { column: 'noteNumber:name', label: 'Numero Nota' },
                    { column: 'amount:name', label: 'Monto', type: 'number' },
                    { column: 'noteType:name', label: 'Tipo', type: 'select', options: [
                        { id: 'CREDIT', label: 'Nota Credito' },
                        { id: 'DEBIT', label: 'Nota Debito' },
                    ]},
                ]}
            />
        </>
    );
};

export default IndexApNotes;
