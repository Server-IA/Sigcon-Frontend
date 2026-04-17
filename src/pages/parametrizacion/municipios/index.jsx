import { useState, useEffect, useRef } from 'react';
import DataTableReference from '../../../components/organism/DataTable';
import { fetchHelper } from '../../../utils/fetch';
import { base_url } from '../../../utils/functions';
import AlertPage from '../../../components/molecules/AlertPage';
import InputModal from '../../../components/molecules/InputModal';
import InputSelectModal from '../../../components/molecules/inputSelectModal';

/**
 * CRUD de municipios según HU-PA-RF-54 a RF-57.
 * Con selector de país asociado.
 */
const IndexMunicipios = () => {
    const tableRef = useRef(null);
    const dataTableRef = useRef(null);
    const modalRef = useRef(null);
    const modalInstance = useRef(null);

    const [search, setSearch] = useState({ value: '', checked: true });
    const [data, setData] = useState([]);
    const [paises, setPaises] = useState([]);
    const [alertSuccess, setAlertSuccess] = useState(false);
    const [alertError, setAlertError] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [isEdit, setIsEdit] = useState(false);
    const [form, setForm] = useState({ id: '', name: '', code: '', country: { id: '' } });
    const [formError, setFormError] = useState('');

    const url = ['api/v1/resources/municipalities'];

    useEffect(() => {
        const loadPaises = async () => {
            try {
                const response = await fetchHelper.post(base_url(['api', 'v1', 'resources', 'countries']), { start: 0, length: -1, draw: 1 }, {}, 0);
                if (response?.data) setPaises(response.data.map(p => ({ id: p.id, name: `${p.name} (${p.code})` })));
            } catch (err) { console.error('Error cargando países:', err); }
        };
        loadPaises();
    }, []);

    const actions = [
        { key: 'edit', icon: 'ri-edit-line', class: 'btn-label-primary', title: 'Editar' },
        { key: 'delete', icon: 'ri-delete-bin-5-line', class: 'btn-label-danger', title: 'Eliminar' },
    ];

    const [columns] = useState([
        { title: 'ID', data: 'id' },
        { title: 'Nombre', data: 'name', name: 'name' },
        { title: 'Código', data: 'code', name: 'code' },
        { title: 'País', data: 'country', render: (c) => c?.name || '-' },
        {
            title: 'Acciones', data: 'id', searchable: false,
            render: (id) => `<div class="d-flex gap-1">${actions.map(a =>
                `<button class="btn btn-sm ${a.class} action-btn" data-action="${a.key}" data-id="${id}" title="${a.title}">
                    <i class="fas ${a.icon}"></i></button>`).join('')}</div>`
        },
    ]);

    const openModal = (edit = false, record = null) => {
        if (!modalInstance.current) modalInstance.current = new window.bootstrap.Modal(modalRef.current);
        setIsEdit(edit);
        setForm(edit && record ? { id: record.id, name: record.name || '', code: record.code || '', country: { id: record.country?.id || '' } }
            : { id: '', name: '', code: '', country: { id: '' } });
        setFormError('');
        modalInstance.current.show();
    };

    const buttons = [
        {
            text: '<i class="ri-add-line ri-16px me-sm-2"></i> <span class="d-none d-sm-inline-block">Crear Municipio</span>',
            className: 'btn rounded-pill btn-primary waves-effect mx-2 my-2',
            action: () => openModal(false)
        }
    ];

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.name?.trim() || !form.code?.trim()) { setFormError('Nombre y código son obligatorios'); return; }
        if (!form.country?.id) { setFormError('Debe seleccionar un país'); return; }
        try {
            if (isEdit) {
                await fetchHelper.put(base_url(['api', 'v1', 'resources', 'municipalities', form.id]), form, {}, 500, false);
                setSuccessMsg('Municipio actualizado exitosamente');
            } else {
                await fetchHelper.post(base_url(['api', 'v1', 'resources', 'municipalities', 'store']), form, {}, 1000);
                setSuccessMsg('Municipio creado exitosamente');
            }
            dataTableRef?.current?.ajax.reload();
            modalInstance?.current?.hide();
            setAlertSuccess(true);
        } catch (error) { setFormError(error?.msg || error?.message || 'Error al procesar'); }
    };

    useEffect(() => {
        const table = dataTableRef?.current;
        if (!table) return;
        const handler = function () {
            const action = $(this).data('action');
            const id = Number($(this).data('id'));
            if (action === 'edit') { const r = data.find(m => m.id === id); if (r) openModal(true, r); }
            if (action === 'delete') {
                window.Swal.fire({ title: '¿Eliminar municipio?', icon: 'warning', showCancelButton: true, confirmButtonText: 'Eliminar', cancelButtonText: 'Cancelar' })
                    .then(async (result) => {
                        if (result.isConfirmed) {
                            try {
                                await fetchHelper.delete(base_url(['api', 'v1', 'resources', 'municipalities', id]), {}, {}, 500, false);
                                dataTableRef?.current?.ajax.reload();
                                setSuccessMsg('Municipio eliminado'); setAlertSuccess(true);
                            } catch (error) { setErrorMsg(error?.msg || 'Error al eliminar'); setAlertError(true); }
                        }
                    });
            }
        };
        table.on('click', '.action-btn', handler);
        return () => { table.off('click', '.action-btn', handler); };
    }, [data]);

    return <>
        <div className="card">
            <h5 className="card-header"><i className="ri-map-2-line me-2"></i>Municipios</h5>
            <AlertPage type="success" message={successMsg} show={alertSuccess} onChange={() => setAlertSuccess(false)} />
            <AlertPage type="danger" message={errorMsg} show={alertError} onChange={() => setAlertError(false)} />
            <div className="card-datatable text-nowrap">
                <DataTableReference url_api={url} columns={columns} tableRef={tableRef} dataTableRef={dataTableRef}
                    method='POST' buttons={buttons} title='Municipios' setData={setData} search={search} setSearch={setSearch} filtered={true} />
            </div>
        </div>
        <div className="modal fade" ref={modalRef} tabIndex={-1}>
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content">
                    <div className="modal-header">
                        <h4 className="modal-title">{isEdit ? 'Editar' : 'Crear'} Municipio</h4>
                        <button type="button" className="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div className="modal-body">
                        {formError && <div className="alert alert-danger">{formError}</div>}
                        <div className="row">
                            <div className="col-md-7 mb-3">
                                <InputModal type="text" id="m_name" label="Nombre" value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej: Bogotá" required={true} />
                            </div>
                            <div className="col-md-5 mb-3">
                                <InputModal type="text" id="m_code" label="Código DANE" value={form.code}
                                    onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="Ej: 11001" required={true} />
                            </div>
                        </div>
                        <div className="row">
                            <div className="col mb-3">
                                <InputSelectModal id="m_country" label="País" options={paises}
                                    value={form.country?.id || ''}
                                    onChange={(value) => setForm({ ...form, country: { id: value } })} />
                            </div>
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-outline-secondary" data-bs-dismiss="modal">Cerrar</button>
                        <button type="button" className="btn btn-primary" onClick={handleSubmit}>Guardar</button>
                    </div>
                </div>
            </div>
        </div>
    </>;
}

export default IndexMunicipios;
