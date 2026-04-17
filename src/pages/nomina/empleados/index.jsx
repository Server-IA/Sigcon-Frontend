import { useState, useEffect, useRef, useMemo } from 'react';
import DataTableReference from '../../../components/organism/DataTable';
import AlertPage from '../../../components/molecules/AlertPage';
import { base_url } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';
import EmpleadoForm from './form';

/**
 * HU-NOM-01: Listado de empleados con DataTable paginado + modal crear/editar
 * + historial salarial accesible por empleado.
 */
const formatCurrency = (val) => {
    if (val === null || val === undefined) return '-';
    return new Intl.NumberFormat('es-CO', {
        style: 'currency', currency: 'COP', maximumFractionDigits: 0,
    }).format(Number(val));
};

const IndexEmpleados = () => {
    const tableRef = useRef(null);
    const dataTableRef = useRef(null);
    const modalRef = useRef(null);
    const modalInstance = useRef(null);

    const [data, setData] = useState([]);
    const [search, setSearch] = useState({ value: '', checked: true });
    const [alert, setAlert] = useState({ message: '', type: '', show: false });
    const [selected, setSelected] = useState(null);

    const url = ['api', 'nomina', 'empleados', 'search'];

    const columns = [
        {
            title: 'Documento',
            data: 'documentNumber', name: 'documentNumber',
            render: (val, _t, row) => `${row.documentType || ''} ${val || ''}`.trim(),
        },
        { title: 'Nombre', data: 'fullName', name: 'fullName' },
        { title: 'Cargo', data: 'position', name: 'position', render: v => v || '-' },
        {
            title: 'Salario base', data: 'baseSalary', name: 'baseSalary',
            render: v => `<span class="d-block text-end">${formatCurrency(v)}</span>`,
        },
        { title: 'EPS', data: 'eps', name: 'eps', render: v => v || '<span class="text-muted">-</span>' },
        { title: 'Fondo pensión', data: 'pensionFund', name: 'pensionFund',
            render: v => v || '<span class="text-muted">-</span>' },
        {
            title: 'Estado', data: 'status', name: 'status',
            render: v => {
                const c = v === 'ACTIVE' ? 'bg-label-success'
                        : v === 'TERMINATED' ? 'bg-label-danger' : 'bg-label-secondary';
                return `<span class="badge ${c}">${v || '-'}</span>`;
            },
        },
        {
            title: 'Acciones', data: 'id', searchable: false,
            render: id => `
                <div class="d-flex gap-1">
                    <button class="btn btn-sm btn-label-info action-btn"
                            data-action="history" data-id="${id}" title="Ver historial salarial">
                        <i class="ri-history-line"></i>
                    </button>
                    <button class="btn btn-sm btn-label-primary action-btn"
                            data-action="edit" data-id="${id}" title="Editar">
                        <i class="ri-edit-line"></i>
                    </button>
                    <button class="btn btn-sm btn-label-danger action-btn"
                            data-action="delete" data-id="${id}" title="Eliminar">
                        <i class="ri-delete-bin-5-line"></i>
                    </button>
                </div>`,
        },
    ];

    const openCreate = () => {
        setSelected(null);
        if (!modalInstance.current)
            modalInstance.current = new window.bootstrap.Modal(modalRef.current);
        modalInstance.current.show();
    };

    const buttons = [
        {
            text: '<i class="ri-add-line ri-16px me-sm-2"></i><span class="d-none d-sm-inline-block">Crear empleado</span>',
            className: 'btn rounded-pill btn-primary waves-effect mx-2 my-2',
            action: () => openCreate(),
        },
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
            const item = rows.find(r => String(r.id) === id);
            if (!item) return;

            if (action === 'edit') {
                setSelected(item);
                if (!modalInstance.current)
                    modalInstance.current = new window.bootstrap.Modal(modalRef.current);
                modalInstance.current.show();
                return;
            }
            if (action === 'history') {
                showHistory(item);
                return;
            }
            if (action === 'delete') {
                window.Swal.fire({
                    title: '¿Eliminar empleado?',
                    text: `Se eliminará "${item.fullName}" (${item.documentNumber}).`,
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: 'Sí, eliminar',
                    cancelButtonText: 'Cancelar',
                    customClass: { confirmButton: 'btn btn-danger', cancelButton: 'btn btn-secondary' },
                }).then(async ok => {
                    if (!ok.isConfirmed) return;
                    try {
                        await fetchHelper.delete(
                                base_url(['api', 'nomina', 'empleados', item.id]), {}, {}, 0);
                        setAlert({ show: true, type: 'success', message: 'Empleado eliminado correctamente.' });
                        dataTableRef?.current?.ajax.reload(null, false);
                    } catch (err) {
                        setAlert({ show: true, type: 'danger', message: err?.msg || 'No se pudo eliminar el empleado.' });
                    }
                });
            }
        };
        table.on('click', '.action-btn', handler);
        return () => table.off('click', '.action-btn', handler);
    }, [rows]);

    const showHistory = async (emp) => {
        try {
            const history = await fetchHelper.get(
                    base_url(['api', 'nomina', 'empleados', emp.id, 'historial-salarial']), {}, 0);
            const list = Array.isArray(history) ? history : [];
            const htmlRows = list.length === 0
                ? '<tr><td colspan="5" class="text-center text-muted py-4">Sin cambios salariales registrados</td></tr>'
                : list.map(h => `
                    <tr>
                        <td>${h.effectiveDate || '-'}</td>
                        <td class="text-end">${formatCurrency(h.previousSalary)}</td>
                        <td class="text-end">${formatCurrency(h.newSalary)}</td>
                        <td>${h.changedBy || '-'}</td>
                        <td><small>${h.reason || ''}</small></td>
                    </tr>
                `).join('');
            window.Swal.fire({
                title: `Historial salarial - ${emp.fullName}`,
                html: `
                    <div class="table-responsive">
                        <table class="table table-sm table-striped">
                            <thead>
                                <tr>
                                    <th>Fecha</th>
                                    <th class="text-end">Anterior</th>
                                    <th class="text-end">Nuevo</th>
                                    <th>Modificado por</th>
                                    <th>Motivo</th>
                                </tr>
                            </thead>
                            <tbody>${htmlRows}</tbody>
                        </table>
                    </div>`,
                width: 900,
                confirmButtonText: 'Cerrar',
            });
        } catch (err) {
            setAlert({ show: true, type: 'danger', message: 'No se pudo cargar el historial.' });
        }
    };

    const onSaved = (msg) => {
        setAlert({ show: true, type: 'success', message: msg });
        modalInstance.current?.hide();
        dataTableRef?.current?.ajax.reload(null, false);
    };

    return (
        <>
            <div className="card">
                <h5 className="card-header text-md-start text-center">
                    <i className="ri-user-3-line me-2"></i>Empleados de nómina
                </h5>

                <AlertPage type={alert.type} message={alert.message} show={alert.show}
                        onChange={() => setAlert({ show: false, type: '', message: '' })} />

                <div className="card-datatable text-nowrap">
                    <DataTableReference
                            url_api={url} columns={columns} tableRef={tableRef} dataTableRef={dataTableRef}
                            method="POST" buttons={buttons} title="Empleados de nomina"
                            setData={setData} search={search} setSearch={setSearch}
                            filtered={true} lengthMenu={[10, 25, 50, 100]} />
                </div>
            </div>

            <EmpleadoForm modalRef={modalRef} modalInstance={modalInstance}
                    empleado={selected} onSaved={onSaved} />
        </>
    );
};

export default IndexEmpleados;
