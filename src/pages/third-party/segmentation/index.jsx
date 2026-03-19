import { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';

import DataTableReference from '../../../components/organism/DataTable';
import AlertPage from '../../../components/molecules/AlertPage';


import FilterSegmentation from './filter';
import CreateSegmentation from './create';
import UpdatedSegmentation from './updated';
import AdjustSegmentation from './adjusted';

const SEGMENTS = [
    { id: 'LOW', name: 'Bajo' },
    { id: 'MEDIUM', name: 'Medio' },
    { id: 'HIGH', name: 'Alto' },
    { id: 'PENDING', name: 'Pendiente clasificar' },
];

const ADJUSTMENT_TYPES = [
    { id: 'AUTOMATIC', name: 'Automático' },
    { id: 'MANUAL', name: 'Manual' },
];


const renderSegmentBadge = (segment) => {
    const map = {
        LOW: 'bg-label-success',
        MEDIUM: 'bg-label-warning',
        HIGH: 'bg-label-danger',
        PENDING: 'bg-label-secondary',
    };
    const label = SEGMENTS.find(s => s.id === segment)?.name ?? segment ?? '-';
    const cls = map[segment] ?? 'bg-label-secondary';
    return `<span class="badge ${cls}">${label}</span>`;
};

const IndexSegmentation = () => {

    const userPermissions = useSelector(state => state.user.user)
        ?.permissions?.filter(p => p.code.includes('SEGMENTATION')) || [];
    const isAdmin = useSelector(state => state.user.user)?.isAdmin || false;

    const tableRef = useRef(null);
    const dataTableRef = useRef(null);

    const filterRef = useRef(null);
    const filterInstance = useRef(null);

    const modalCreateRef = useRef(null);
    const modalCreateInstance = useRef(null);

    const modalUpdateRef = useRef(null);
    const modalUpdateInstance = useRef(null);

    const modalAdjustRef = useRef(null);
    const modalAdjustInstance = useRef(null);

    const [data, setData] = useState([]);
    const [clickAdjust, setClickAdjust] = useState(false);
    const [message, setMessage] = useState({ message: '', type: '', show: false });

    const [search, setSearch] = useState({ value: '', checked: true });

    const emptyRecord = {
        id:                 '',
        clientId:           '',
        clientName:         '',
        autoSegment:        '',
        finalSegment:       '',
        segmentationSource: 'AUTOMATIC',
        calculationDate:    '',
    };

    const [selectedRecord, setSelectedRecord] = useState(emptyRecord);

    const url = ['api', 'v1', 'ecl-segmentation', 'search'];

    const actions = [
        ...(userPermissions.some(p => p.code === 'UPDATE_SEGMENTATION' && p.type === 'UPDATE') || isAdmin
            ? [{ key: 'adjust', icon: 'ri-equalizer-line', class: 'btn-label-warning', title: 'Ajuste manual' }] : []),
    ];

    const columns = [
        {
            title: 'ID Cliente', data: 'clientId', name: '',
            searchable: false, orderable: false,
            render: (val) => val ?? '-'
        },
        {
            title: 'Cliente', data: 'thirdParty', name: '',
            searchable: false, orderable: false,
            render: (val) => val?.businessName ?? '-'
        },
        {
            title: 'Segmentación', data: 'finalSegment', name: 'finalSegment',
            render: (val) => renderSegmentBadge(val)
        },
        {
            title: 'Tipo ajuste', data: 'segmentationSource', name: 'segmentationSource',
            render: (val) => val === 'MANUAL'
                ? `<span class="badge bg-label-info">Manual</span>`
                : `<span class="badge bg-label-secondary">Automático</span>`
        },
        {
            title: 'Fecha cálculo', data: 'calculationDate', name: 'calculationDate',
            render: (val) => val ? val.split('T')[0] : '-'
        },
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

    const openModalCreate = () => {
        if (!modalCreateInstance.current) {
            modalCreateInstance.current = new window.bootstrap.Modal(modalCreateRef.current);
        }
        setSelectedRecord(emptyRecord);
        modalCreateInstance.current.show();
    };

    const openModalUpdate = () => {
        if (!modalUpdateInstance.current) {
            modalUpdateInstance.current = new window.bootstrap.Modal(modalUpdateRef.current);
        }
        modalUpdateInstance.current.show();
    };

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
        ...(userPermissions.some(p => p.code === 'CREATE_SEGMENTATION' && p.type === 'CREATE') || isAdmin ? [{
            text: '<i class="ri-add-line ri-16px me-sm-2"></i> <span class="d-none d-sm-inline-block">Crear Segmentación</span>',
            className: 'btn rounded-pill btn-primary waves-effect mx-1 my-2',
            action: function () { openModalCreate(); }
        }] : []),
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
            const action = $(this).data('action');
            const id = Number($(this).data('id'));
            const row = data.find(m => m.id === id);

            if (!row) {
                console.warn('Registro no encontrado', id);
                return;
            }

            const mapped = {
                id:                row.id ?? '',
                clientId:          row.clientId ?? '',
                clientName:        row.thirdParty?.businessName ?? '',
                autoSegment:       row.autoSegment ?? '',
                finalSegment:      row.finalSegment ?? '',
                segmentationSource: row.segmentationSource ?? 'AUTOMATIC',
                calculationDate:   row.calculationDate ?? '',
            };

            if (action === 'adjust') {
                setSelectedRecord(mapped);
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
            </div>

            <FilterSegmentation
                filterRef={filterRef}
                filterInstance={filterInstance}
                dataTableRef={dataTableRef}
                segments={SEGMENTS}
                adjustmentTypes={ADJUSTMENT_TYPES}
            />

            <CreateSegmentation
                modalRef={modalCreateRef}
                modalInstance={modalCreateInstance}
                record={selectedRecord}
                setRecord={setSelectedRecord}
                dataTableRef={dataTableRef}
                setMessage={setMessage}
                segments={SEGMENTS}
            />

            <UpdatedSegmentation
                modalRef={modalUpdateRef}
                modalInstance={modalUpdateInstance}
                record={selectedRecord}
                setRecord={setSelectedRecord}
                dataTableRef={dataTableRef}
                setMessage={setMessage}
                segments={SEGMENTS}
            />

            <AdjustSegmentation
                modalRef={modalAdjustRef}
                modalInstance={modalAdjustInstance}
                client={selectedRecord}
                dataTableRef={dataTableRef}
                setMessage={setMessage}
                segments={SEGMENTS}
            />
        </>
    );
};

export default IndexSegmentation;
