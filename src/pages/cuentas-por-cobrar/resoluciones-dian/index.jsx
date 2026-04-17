import { useEffect, useMemo, useRef, useState } from 'react';

import DataTableReference from '../../../components/organism/DataTable';
import AlertPage from '../../../components/molecules/AlertPage';

import { base_url } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';

import CreateDianResolution from './create';
import UpdatedDianResolution from './updated';

/**
 * Pagina principal de Resoluciones DIAN.
 * Permite administrar las resoluciones de numeracion para facturacion electronica
 * y muestra un banner con alertas de resoluciones proximas a vencerse o con
 * menos del 5% de rango disponible.
 */

const STATUS_BADGE = {
    ACTIVE: 'bg-label-success',
    EXPIRED: 'bg-label-secondary',
    EXHAUSTED: 'bg-label-danger',
};

const STATUS_LABEL = {
    ACTIVE: 'Vigente',
    EXPIRED: 'Vencida',
    EXHAUSTED: 'Agotada',
};

const IndexDianResolutions = () => {
    const tableRef = useRef(null);
    const dataTableRef = useRef(null);
    const modalCreateRef = useRef(null);
    const modalCreateInstance = useRef(null);
    const modalUpdateRef = useRef(null);
    const modalUpdateInstance = useRef(null);

    const [data, setData] = useState([]);
    const [search, setSearch] = useState({ value: '', checked: true });
    const [message, setMessage] = useState({ message: '', type: '', show: false });
    const [selected, setSelected] = useState(null);
    const [alerts, setAlerts] = useState([]);

    const url = ['api', 'v1', 'ar', 'dian', 'resolutions', 'search'];

    const columns = [
        { title: 'Id', data: 'id', name: 'id' },
        { title: '# Resolucion', data: 'resolutionNumber', name: 'resolutionNumber' },
        { title: 'Prefijo', data: 'prefix', name: 'prefix' },
        { title: 'Rango', data: 'id', render: (_v, _t, r) => `${r.startNumber} - ${r.endNumber}` },
        { title: 'Actual', data: 'currentNumber' },
        { title: 'Uso', data: 'usagePercent', render: (v) => (v != null ? v.toFixed(1) + '%' : '-') },
        { title: 'Inicio', data: 'startDate' },
        { title: 'Fin', data: 'endDate' },
        {
            title: 'Estado',
            data: 'status',
            render: (v) => `<span class="badge ${STATUS_BADGE[v] || 'bg-label-secondary'}">${STATUS_LABEL[v] || v}</span>`,
        },
        {
            title: 'Acciones',
            data: 'id',
            searchable: false,
            render: (id) => `
                <div class="d-flex gap-1">
                    <button class="btn btn-sm btn-label-primary action-btn" data-action="edit" data-id="${id}" title="Editar">
                        <i class="ri-edit-line"></i>
                    </button>
                    <button class="btn btn-sm btn-label-danger action-btn" data-action="delete" data-id="${id}" title="Eliminar">
                        <i class="ri-delete-bin-5-line"></i>
                    </button>
                </div>`,
        },
    ];

    const rows = useMemo(() => (Array.isArray(data) ? data : data?.data || []), [data]);

    const openCreate = () => {
        if (!modalCreateInstance.current) {
            modalCreateInstance.current = new window.bootstrap.Modal(modalCreateRef.current);
        }
        modalCreateInstance.current.show();
    };

    const openUpdate = (record) => {
        setSelected(record);
        if (!modalUpdateInstance.current) {
            modalUpdateInstance.current = new window.bootstrap.Modal(modalUpdateRef.current);
        }
        modalUpdateInstance.current.show();
    };

    const handleDelete = async (record) => {
        const c = await window.Swal.fire({
            title: 'Eliminar resolucion DIAN?',
            text: `Resolucion ${record.resolutionNumber}`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Eliminar',
            cancelButtonText: 'Cancelar',
        });
        if (!c.isConfirmed) return;
        try {
            await fetchHelper.delete(
                base_url(['api', 'v1', 'ar', 'dian', 'resolutions', 'delete', record.id]),
                {},
                1000
            );
            setMessage({ type: 'success', show: true, message: 'Resolucion eliminada.' });
            dataTableRef?.current?.ajax.reload();
            loadAlerts();
        } catch (err) {
            setMessage({ type: 'danger', show: true, message: err?.msg || err?.message || 'Error al eliminar.' });
        }
    };

    const loadAlerts = async () => {
        try {
            const res = await fetchHelper.get(
                base_url(['api', 'v1', 'ar', 'dian', 'resolutions', 'alerts']),
                {},
                1000
            );
            setAlerts(res?.data || []);
        } catch (err) {
            setAlerts([]);
        }
    };

    useEffect(() => {
        loadAlerts();
    }, []);

    const buttons = [
        {
            text: '<i class="ri-add-line ri-16px me-sm-2"></i><span class="d-none d-sm-inline-block">Registrar Resolucion</span>',
            className: 'btn rounded-pill btn-primary waves-effect mx-2 my-2',
            action: () => openCreate(),
        },
    ];

    useEffect(() => {
        const table = dataTableRef?.current;
        if (!table) return;
        const handler = function () {
            const action = $(this).data('action');
            const id = String($(this).data('id'));
            const record = rows.find((r) => String(r.id) === id);
            if (!record) return;
            if (action === 'edit') openUpdate(record);
            if (action === 'delete') handleDelete(record);
        };
        table.on('click', '.action-btn', handler);
        return () => table.off('click', '.action-btn', handler);
    }, [rows]);

    return (
        <>
            {alerts.length > 0 && (
                <div className="alert alert-warning" role="alert">
                    <h6 className="alert-heading mb-2">
                        <i className="ri-alert-line me-1"></i>
                        Alertas de Resoluciones DIAN ({alerts.length})
                    </h6>
                    <ul className="mb-0">
                        {alerts.map((a) => (
                            <li key={a.id}>
                                <strong>{a.resolutionNumber}</strong> (prefijo {a.prefix}) -{' '}
                                {a.rangeAlert && `rango disponible bajo (${(100 - (a.usagePercent || 0)).toFixed(1)}%)`}{' '}
                                {a.expirationAlert && ` | vence en ${a.daysToExpire} dia(s)`}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <div className="card">
                <h5 className="card-header text-md-start text-center">Resoluciones DIAN</h5>
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
                        title="Resoluciones DIAN"
                        setData={setData}
                        search={search}
                        setSearch={setSearch}
                        filtered={true}
                        lengthMenu={[10, 25, 50, 100]}
                    />
                </div>
            </div>

            <CreateDianResolution
                modalRef={modalCreateRef}
                modalInstance={modalCreateInstance}
                dataTableRef={dataTableRef}
                setMessage={setMessage}
                reloadAlerts={loadAlerts}
            />
            <UpdatedDianResolution
                modalRef={modalUpdateRef}
                modalInstance={modalUpdateInstance}
                dataTableRef={dataTableRef}
                record={selected}
                setMessage={setMessage}
                reloadAlerts={loadAlerts}
            />
        </>
    );
};

export default IndexDianResolutions;
