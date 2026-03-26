import { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import DataTableReference from "../../../components/organism/DataTable";
import AlertPage from "../../../components/molecules/AlertPage";

import { base_url } from "../../../utils/functions";
import { fetchHelper } from "../../../utils/fetch";

import CreateCompany from "./create";
import EditCompany from "./edit";

const CompaniesIndex = () => {

    const userPermissions = useSelector(state => state.user.user)?.permissions?.filter(p => { return p.code.includes('COMPANY') }) || []; // Permisos del usuario
    const isAdmin = useSelector(state => state.user.user)?.isAdmin || false; // Verificar si el usuario es admin

    const [data, setData] = useState([]);
    const [message, setMessage] = useState({
        type: '',
        message: '',
        show: false,
    });

    // Modales
    const modalRef = useRef(null);
    const modalInstance = useRef(null);
    const modalEditRef = useRef(null);
    const modalEditInstance = useRef(null);

    // Company
    const companyBase = {
        "name": null,
        "nit": null,
        "dv": null,
        "legalRepresentative": null,
        "email": null,
        "size": null,
        "phone": null,
        "logo": {
            "name": null,
            "base64": null,
        },
        "status": null,
        "typeRegimeId": null,
        "typeOrganizationId": null,
        "withholdings": null,
        "locations": {
            "name": null,
            "description": null,
            "address": null,
            "status": null,
            "isMain": true,
            "municipalityId": null
        }
        
    }
    const [company, setCompany] = useState({});

    const openModalCreate = () => {
        if (!modalInstance.current) {
            modalInstance.current = new window.bootstrap.Modal(
                modalRef.current,
            );
        }
        modalInstance.current.show();
    }

    const openModalEdit = () => {
        if (!modalEditInstance.current) {
            modalEditInstance.current = new window.bootstrap.Modal(
                modalEditRef.current,
            );
        }
        modalEditInstance.current.show();
    }

    // Basic Data
    const [typesRegimes, setTypesRegimes] = useState([]);
    const [typesOrganizations, setTypesOrganizations] = useState([]);
    const [withholdings, setWithholdings] = useState([]);
    const [countries, setCountries] = useState([]);

    const loadBasicData = async () => {
        try{

            const urlApis = [
                ['api/v1/resources/types-regimes'],
                ['api/v1/resources/types-organizations'],
                ['api/v1/resources/withholdings'],
                ['api/v1/resources/countries']
            ];

            const [typesRegimesResponse, typesOrganizationsResponse, withholdingsResponse, countriesResponse] = await Promise.all([
                fetchHelper.post(base_url(urlApis[0]), {length: -1}, {}, 0, false),
                fetchHelper.post(base_url(urlApis[1]), {length: -1}, {}, 0, false),
                fetchHelper.post(base_url(urlApis[2]), {length: -1}, {}, 0, false),
                fetchHelper.post(base_url(urlApis[3]), {length: -1}, {}, 0, false),
            ]);

            setTypesRegimes(typesRegimesResponse.data);
            setTypesOrganizations(typesOrganizationsResponse.data);   
            setWithholdings(withholdingsResponse.data);
            setCountries(countriesResponse.data);

        } catch (error) {
            console.error(error);
            setMessage({
                type: 'error',
                message: error.msg || 'Error al cargar los datos básicos',
                show: true,
            });
        }
    }

    // DATATABLE
    const tableRef = useRef(null);
    const dataTable = useRef(null);

    const [actions, setActions] = useState([
        ...(userPermissions.some(p => p.code === 'UPDATE_COMPANY' && p.type === 'UPDATE') || isAdmin ? [{ key: 'edit', icon: 'ri-edit-line', class: 'btn-label-primary', title: 'Editar' }] : []),
        ...(userPermissions.some(p => p.code === 'DELETE_COMPANY' && p.type === 'DELETE') || isAdmin ? [{ key: 'delete', icon: 'ri-delete-bin-5-line', class: 'btn-label-danger', title: 'Eliminar' }] : []),
    ]);

    const [buttons, setButtons] = useState([
        ...(userPermissions.some(p => p.code === 'CREATE_COMPANY' && p.type === 'CREATE') || isAdmin
      ? [{
        text: '<i class="ri-add-line ri-16px me-sm-2"></i> <span class="d-none d-sm-inline-block">Crear Empresa</span>',
        className: "btn rounded-pill btn-primary waves-effect mx-2 my-2 ",
        action: async function (e, dt, button, config) {
            
            setCompany(companyBase);
            setTimeout(() => {
                openModalCreate();
            }, 100);
        },
      }] : []),
    ]);

    const [columns, setColumns] = useState([
        {title: 'Razon Social', data: 'name'},
        {title: 'NIT', data: 'nit', width: '100px'},
        {title: 'DV', data: 'dv', width: '30px'},
        {title: 'Tipo de Regimen', data: 'typeRegimen.name'},
        {title: 'Tipo de Organización', data: 'typeOrganization.name'},
        {title: 'Representante Legal', data: 'legalRepresentative'},
        {title: 'Sede Principal', data: 'locations', render: (locations) => locations.find(l => l.isMain)?.name || 'Sin sede principal'},
        {title: 'Acciones', data: 'id', width: '100px', render: (id) => `
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
        `}
    ]);

    useEffect(() => {
        const table = dataTable?.current;
        if (!table) return;
        const handler = function () {
            const action = $(this).data("action");
            const id = Number($(this).data("id"));
            const companyData = data.find(c => c.id === id);
            if (!companyData) {
                console.warn("Empresa no encontrada", id);
                return;
            }

            setCompany({
                ...companyData,
                logo: {
                    name: companyData.logo,
                    base64: null
                },
                withholdings: companyData.withholdings.map(w => w.id)
            });

            switch (action) {
                case 'edit':
                    // setTimeout(() => {
                        openModalEdit();
                    // }, 100);
                    break;
                case 'delete':
                    window.Swal.fire({
                        title: '¿Estás seguro de querer eliminar esta empresa?',
                        text: 'Esta acción no se puede deshacer',
                        icon: 'warning',
                        showCancelButton: true,
                        confirmButtonText: 'Eliminar',
                        cancelButtonText: 'Cancelar'
                    }).then(async (result) => {
                        if (result.isConfirmed) {
                            try {
                                let url = base_url(['api/v1/companies', companyData.id]);
                                const response = await fetchHelper.delete(url, {}, {}, 5000, false);
                                setMessage({
                                    type: 'success',
                                    message: response.message,
                                    show: true
                                });
                                dataTable?.current?.ajax.reload();
                            } catch (error) {
                                console.error(error);
                                setMessage({
                                    type: 'danger',
                                    message: error.msg,
                                    show: true
                                });
                            }
                        }
                    });
                    break;
            }
        }

        table.on('click', '.action-btn', handler);
        return () => table.off('click', '.action-btn', handler);
    }, [data]);

    useEffect(() => {
        loadBasicData();
    }, []);

    return (
        <>
            <div className="card">
                <h5 className="card-header text-md-start text-center">Empresas del sistema</h5>
                <AlertPage type={message.type} message={message.message} show={message.show} onChange={() => setMessage({ message: '', type: '', show: false })} />
                <div className="card-datatable text-nowrap">
                    <DataTableReference
                        url_api={['api/v1/companies/search']}
                        tableRef={tableRef}
                        dataTableRef={dataTable}
                        columns={columns}
                        setData={setData}
                        buttons={buttons}
                        // search={search}
                        // setSearch={setSearch}
                        // filtered={true}
                    />
                </div>
            </div>

            <CreateCompany
                modalRef={modalRef}
                modalInstance={modalInstance}
                company={company}
                setCompany={setCompany}
                dataTableRef={dataTable}
                setMessage={setMessage}
                typesRegimes={typesRegimes}
                typesOrganizations={typesOrganizations}
                withholdings={withholdings}
                countries={countries}
            />
            <EditCompany
                modalRef={modalEditRef}
                modalInstance={modalEditInstance}
                company={company}
                setCompany={setCompany}
                dataTableRef={dataTable}
                setMessage={setMessage}
                typesRegimes={typesRegimes}
                typesOrganizations={typesOrganizations}
                withholdings={withholdings}
                countries={countries}
            />
        </>
    )
}

export default CompaniesIndex;