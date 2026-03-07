import { useState, useEffect, useRef } from 'react';

import DataTableReference from '../../../components/organism/DataTable';
import AlertPage from '../../../components/molecules/AlertPage';

import { fetchHelper } from '../../../utils/fetch';
import { base_url } from '../../../utils/functions';

import FilterSegmentation from './filter';
import AdjustSegmentation from './adjusted';

const SEGMENTS = [
    { id: 'LOW',     name: 'Bajo' },
    { id: 'MEDIUM',  name: 'Medio' },
    { id: 'HIGH',    name: 'Alto' },
    { id: 'PENDING', name: 'Pendiente clasificar' },
];

const ADJUSTMENT_TYPES = [
    { id: 'AUTOMATIC', name: 'Automático' },
    { id: 'MANUAL',    name: 'Manual' },
];

const renderSegmentBadge = (segment) => {
    const map = {
        LOW:     'bg-label-success',
        MEDIUM:  'bg-label-warning',
        HIGH:    'bg-label-danger',
        PENDING: 'bg-label-secondary',
    };
    const label = SEGMENTS.find(s => s.id === segment)?.name ?? segment ?? '-';
    const cls   = map[segment] ?? 'bg-label-secondary';
    return `<span class="badge ${cls}">${label}</span>`;
};

const IndexSegmentation = () => {

    const tableRef    = useRef(null);
    const dataTableRef = useRef(null);

    const filterRef      = useRef(null);
    const filterInstance = useRef(null);

    const modalAdjustRef      = useRef(null);
    const modalAdjustInstance = useRef(null);

    const [data, setData]           = useState([]);
    const [clickAdjust, setClickAdjust] = useState(false);
    const [message, setMessage]     = useState({ message: '', type: '', show: false });

    const [search, setSearch] = useState({
        value:   '',
        checked: true,
    });

    const [selectedClient, setSelectedClient] = useState({
        id:             '',
        clientId:       '',
        clientName:     '',
        autoSegment:    '',
        finalSegment:   '',
        daysPastDue:    0,
        overdueAmount:  0,
        adjustmentType: 'AUTOMATIC',
    });

    const url = ['api', 'v1', 'ecl', 'segmentation', 'search'];

    const actions = [
        { key: 'adjust', icon: 'ri-edit-2-line', class: 'btn-label-warning', title: 'Ajuste Manual' },
    ];

    const columns = [
        { title: 'Cliente',           data: 'clientName',     name: 'clientName' },
        { title: 'Segmento Auto.',    data: 'autoSegment',    name: 'autoSegment',
            render: (val) => renderSegmentBadge(val) },
        { title: 'Segmento Final',    data: 'finalSegment',   name: 'finalSegment',
            render: (val) => renderSegmentBadge(val) },
        { title: 'Días mora',         data: 'daysPastDue',    name: 'daysPastDue',
            render: (val) => val ?? '-' },
        { title: 'Monto vencido',     data: 'overdueAmount',  name: 'overdueAmount',
            render: (val) => val != null
                ? `$${Number(val).toLocaleString('es-CO', { minimumFractionDigits: 2 })}`
                : '-' },
        {
            title: 'Tipo ajuste', data: 'adjustmentType', name: 'adjustmentType',
            render: (val) => val === 'MANUAL'
                ? `<span class="badge bg-label-info">Manual</span>`
                : `<span class="badge bg-label-secondary">Automático</span>`
        },
        { title: 'Fecha cálculo', data: 'calculationDate', name: 'calculationDate',
            render: (val) => val ?? '-' },
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

    const openModalAdjust = () => {
        if (!modalAdjustInstance.current) {
            modalAdjustInstance.current = new window.bootstrap.Modal(modalAdjustRef.current);
        }
        modalAdjustInstance.current.show();
    };

    const buttons = [
        {
            text: '<i class="ri-filter-line ri-16px me-sm-2"></i> <span class="d-none d-sm-inline-block">Filtrar</span>',
            className: 'btn rounded-pill btn-secondary waves-effect mx-1 my-2',
            action: function () {
                if (!filterInstance.current) {
                    filterInstance.current = new window.bootstrap.Modal(filterRef.current);
                }
                filterInstance.current.show();
            }
        },
    ];

    useEffect(() => {
        if (!clickAdjust) return;
        openModalAdjust();
        setClickAdjust(false);
    }, [clickAdjust]);

    useEffect(() => {
        const table = dataTableRef?.current;
        if (!table) return;

        const handler = function () {
            const action  = $(this).data('action');
            const id      = Number($(this).data('id'));
            const row     = data.find(m => m.id === id);

            if (!row) {
                console.warn('Registro no encontrado', id);
                return;
            }

            if (action === 'adjust') {
                setSelectedClient({
                    id:             row.id             ?? '',
                    clientId:       row.clientId       ?? '',
                    clientName:     row.clientName     ?? '',
                    autoSegment:    row.autoSegment    ?? '',
                    finalSegment:   row.finalSegment   ?? '',
                    daysPastDue:    row.daysPastDue    ?? 0,
                    overdueAmount:  row.overdueAmount  ?? 0,
                    adjustmentType: row.adjustmentType ?? 'AUTOMATIC',
                });
                setClickAdjust(true);
            }
        };

        table.on('click', '.action-btn', handler);
        return () => { table.off('click', '.action-btn', handler); };
    }, [data]);

    return (
        <>
            <div className="card">
                <h5 className="card-header text-md-start text-center">Segmentación ECL — Riesgo de Clientes</h5>

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
                        method='POST'
                        buttons={buttons}
                        title='Segmentación ECL'
                        setData={setData}
                        search={search}
                        setSearch={setSearch}
                        filtered={true}
                    />
                </div>

                <FilterSegmentation
                    filterRef={filterRef}
                    filterInstance={filterInstance}
                    dataTableRef={dataTableRef}
                    segments={SEGMENTS}
                    adjustmentTypes={ADJUSTMENT_TYPES}
                />
            </div>

            <AdjustSegmentation
                modalRef={modalAdjustRef}
                modalInstance={modalAdjustInstance}
                client={selectedClient}
                setClient={setSelectedClient}
                dataTableRef={dataTableRef}
                setMessage={setMessage}
                segments={SEGMENTS}
            />
        </>
    );
};

export default IndexSegmentation;
