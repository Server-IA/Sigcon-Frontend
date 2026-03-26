import { useEffect, useRef, useState } from "react";
import AlertPage from "../../../components/molecules/AlertPage";
import InputModal from "../../../components/molecules/InputModal";
import InputSelectModal from "../../../components/molecules/inputSelectModal";
import { base_url } from "../../../utils/functions";
import InputDropFile from "../../../components/molecules/InputDropFile";
import { fetchHelper } from "../../../utils/fetch";
import DataTableReference from "../../../components/organism/DataTable";
import { useSelector } from "react-redux";

const EditCompany = ({
    modalRef,
    modalInstance,
    company,
    setCompany,
    dataTableRef,
    setMessage,
    typesRegimes,
    typesOrganizations,
    withholdings,
    countries
}) => {

    const userPermissions = useSelector(state => state.user.user)?.permissions?.filter(p => { return p.code.includes('COMPANY') }) || []; // Permisos del usuario
    const isAdmin = useSelector(state => state.user.user)?.isAdmin || false; // Verificar si el usuario es admin

    const tableLocationsRef = useRef(null);
    const datatableLocationsRef = useRef(null);

    const [errorMessage, setErrorMessage] = useState({
        message: '',
        type: '',
        show: false
    });

    const [errorMessageLocation, setErrorMessageLocation] = useState({
        message: '',
        type: '',
        show: false
    });

    const saveLocation = async () => {
        try{

            let response = null;

            if(location.id){
                let url = base_url(['api/v1/companies/locations', location.id]);
                response = await fetchHelper.put(url, location, {}, 5000, false);
            }else{
                let url = base_url(['api/v1/companies', company.id, 'locations/store']);
                response = await fetchHelper.post(url, location, {}, 5000, false);
            }

            setCompany(response.data);
            setLocation(locationBase);
            setErrors({});
            setErrorMessageLocation({
                message: response.message,
                type: 'success',
                show: true
            });
            dataTableRef?.current?.ajax.reload();
        } catch (error) {
            console.error(error);
            const errores = error?.errors;
            if (errores && errores.length > 0) {
                const fieldErrors = {};
                errores.forEach(err => {
                    fieldErrors[err.field] = err.message;
                });
                setErrors(fieldErrors);
            }else{
                setErrorMessageLocation({
                    message: error.msg,
                    type: 'danger',
                    show: true,
                });
            }
        }
    }

    const [locations, setLocations] = useState([]);
    const locationBase = {
        id: null,
        name: null,
        address: null,
        status: 'ACTIVE',
        isMain: 'false',
        municipalityId: null
    }
    const [location, setLocation] = useState(locationBase);
    const [errors, setErrors] = useState({});

    const [actions, setActions] = useState([
        ...(userPermissions.some(p => p.code === 'UPDATE_COMPANY' && p.type === 'UPDATE') || isAdmin ? [{ key: 'edit', icon: 'ri-edit-line', class: 'btn-label-primary', title: 'Editar' }] : []),
        ...(userPermissions.some(p => p.code === 'DELETE_COMPANY' && p.type === 'DELETE') || isAdmin ? [{ key: 'delete', icon: 'ri-delete-bin-5-line', class: 'btn-label-danger', title: 'Eliminar' }] : []),
    ]);

    const [columns, setColumns] = useState([
        {
            data: 'municipality', title: 'Municipio',
            render: (data, type, row, meta) => {
                return `${row.country.code} - ${row.municipality.name}`;
            }
        },
        { data: 'name', title: 'Nombre' },
        { data: 'address', title: 'Dirección' },
        { data: 'status', title: 'Estado' },
        { data: 'isMain', title: 'Es principal',
            render: (data) => {
                return data ?
                `<span class="badge badge-center rounded-pill bg-label-success">Si</span>`
                : `<span class="badge badge-center rounded-pill bg-label-warning">No</span>`;
            }
        },
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
        if(company){
            if(company.locations instanceof Array){
                setLocations(company.locations);
            }else{
                setLocations([]);
            }
        }
    }, [company]);

    useEffect(() => {
        if(locations.length > 0){
            datatableLocationsRef?.current?.clear();
            datatableLocationsRef?.current?.rows.add(locations.slice().sort((a, b) => {
                if (a.isMain === b.isMain) return 0;
                return a.isMain === 'false' ? 1 : -1;
            }));
            setTimeout(() => {
                datatableLocationsRef?.current?.draw(false);

                const handler = function () {
                    const action = $(this).data("action");
                    const id = Number($(this).data("id"));
                    const locationData = locations.find(l => l.id === id);
                    if (!locationData) {
                        console.warn("Ubicación no encontrada", id);
                        return;
                    }
        
                    switch (action) {
                        case 'edit':
                            // setTimeout(() => {
                                setLocation({
                                    id: locationData.id,
                                    name: locationData.name,
                                    address: locationData.address,
                                    status: locationData.status,
                                    isMain: String(locationData.isMain),
                                    municipalityId: locationData.municipalityId
                                });
                            // }, 100);
                            break;
                        case 'delete':
                            window.Swal.fire({
                                title: '¿Estás seguro de querer eliminar esta ubicación?',
                                text: 'Esta acción no se puede deshacer',
                                icon: 'warning',
                                showCancelButton: true,
                                confirmButtonText: 'Eliminar',
                                cancelButtonText: 'Cancelar'
                            }).then(async (result) => {
                                if (result.isConfirmed) {
                                    try {
                                        let url = base_url(['api/v1/companies/locations', locationData.id]);
                                        const response = await fetchHelper.delete(url, {}, {}, 5000, false);
                                        // setCompany(prev => ({
                                        //     ...prev,
                                        //     locations: prev.locations.filter(l => l.id !== locationData.id)
                                        // }));
                                        
                                        datatableLocationsRef?.current?.ajax.reload();
                                        setLocation(locationBase);
                                        setErrorMessageLocation({
                                            message: response.message,
                                            type: 'success',
                                            show: true
                                        });
                                    } catch (error) {
                                        console.error(error);
                                        setErrorMessageLocation({
                                            message: error.msg,
                                            type: 'danger',
                                            show: true
                                        });
                                    }
                                }
                            });
                            break;
                    }
                }
        
                datatableLocationsRef?.current?.on('click', '.action-btn', handler);
                return () => datatableLocationsRef?.current?.off('click', '.action-btn', handler);

            }, 1000);
        }
    }, [locations]);

    const handleSubmit = async () => {
        try{
            const url = base_url(['api/v1/companies', company.id]);
            await fetchHelper.put(url, company, {}, 5000, false);

            dataTableRef?.current?.ajax.reload();
            modalInstance?.current?.hide();
            setErrors({});
            setErrorMessage({
                message: '',
                type: '',
                show: true
            });
            setMessage({
                message: 'Empresa actualizada correctamente',
                type: 'success',
                show: true
            });
        } catch (error) {
            console.error(error);
            const errores = error?.errors;
            if (errores && errores.length > 0) {
                const fieldErrors = {};
                errores.forEach(err => {
                    fieldErrors[err.field] = err.message;
                });
                setErrors(fieldErrors);
            }else if (error?.msg) {
                setErrorMessage({
                    message: error.msg,
                    type: 'danger',
                    show: true,
                });
            }
        }
    }
    
    return (
        <>
            <div className="modal fade" ref={modalRef} id="modalCenter" tabIndex={-1} aria-hidden="true">
                <div className="modal-dialog modal-xl modal-dialog-centered" role="document">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h4 className="modal-title" id="modalCenterTitle">Editar Empresa</h4>
                            <button
                                type="button"
                                className="btn-close"
                                data-bs-dismiss="modal"
                                aria-label="Close"></button>
                        </div>
                        <div className="modal-body">

                            <div className="row">
                                <div className="col-12">
                                    <div className="nav-align-top mb-6">
                                        <ul className="nav nav-pills mb-4" role="tablist">
                                            <li className="nav-item">
                                                <button
                                                type="button"
                                                className="nav-link active"
                                                role="tab"
                                                data-bs-toggle="tab"
                                                data-bs-target="#data-company"
                                                aria-controls="data-company"
                                                aria-selected="true">
                                                Datos de la empresa
                                                </button>
                                            </li>
                                            <li className="nav-item">
                                                <button
                                                    type="button"
                                                    className="nav-link"
                                                    role="tab"
                                                    data-bs-toggle="tab"
                                                    data-bs-target="#locations-company"
                                                    aria-controls="locations-company"
                                                    aria-selected="false"
                                                    onClick={() => {
                                                        datatableLocationsRef?.current?.columns.adjust().draw();
                                                    }}>
                                                    Ubicaciones
                                                </button>
                                            </li>
                                        </ul>
                                        <div className="tab-content box-shadow-none">
                                            <div className="tab-pane fade show active" id="data-company" role="tabpanel">

                                                <AlertPage
                                                    message={errorMessage.message}
                                                    type={errorMessage.type}
                                                    show={errorMessage.show}
                                                    onChange={() => {
                                                        setErrorMessage({
                                                            message: '',
                                                            type: '',
                                                            show: false
                                                        });
                                                    }}
                                                />

                                                <div className="row">
                                                    <div className="col-lg-5 col-md-12 col-sm-12 my-1">
                                                        <InputModal
                                                            id="name-company-edit"
                                                            label="Nombre de la empresa"
                                                            name="name"
                                                            type="text"
                                                            value={company.name}
                                                            onChange={(e) => {
                                                                setCompany({ ...company, name: e.target.value })
                                                                setErrors({ ...errors, name: '' })
                                                            }}
                                                            placeholder="Ingrese el nombre de la empresa"
                                                            required
                                                            error={errors.name}
                                                        />
                                                    </div>

                                                    <div className="col-lg-5 col-md-8 col-sm-12 my-1">
                                                        <InputModal
                                                            id="nit-company-edit"
                                                            label="NIT de la empresa"
                                                            name="nit"
                                                            type="text"
                                                            value={company.nit}
                                                            onChange={(e) => {
                                                                setCompany({ ...company, nit: e.target.value.replace(/\D/g, '') })
                                                                setErrors({ ...errors, nit: '' })
                                                            }}
                                                            placeholder="Ingrese el NIT de la empresa"
                                                            required
                                                            error={errors.nit}
                                                        />
                                                    </div>

                                                    <div className="col-lg-2 col-md-4 col-sm-12 my-1">
                                                        <InputModal
                                                            id="dv-company-edit"
                                                            label="DV"
                                                            name="dv"
                                                            type="text"
                                                            value={company.dv}
                                                            onChange={(e) => {
                                                                setCompany({ ...company, dv: e.target.value.replace(/\D/g, '') })
                                                                setErrors({ ...errors, dv: '' })
                                                            }}
                                                            placeholder="Ingrese el DV"
                                                            required
                                                            error={errors.dv}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="row">
                                                    <div className="col-lg-4 col-md-12 col-sm-12 my-1">
                                                        <InputSelectModal
                                                            id="type-regime-id-company-edit"
                                                            label="Tipo de Regimen"
                                                            name="typeRegimeId"
                                                            options={typesRegimes.map(type => ({
                                                                id: type.id,
                                                                label: type.name
                                                            }))}
                                                            value={company.typeRegimeId}
                                                            onChange={(value) => {
                                                                setCompany({ ...company, typeRegimeId: value })
                                                                setErrors({ ...errors, typeRegimeId: '' })
                                                            }}
                                                            required
                                                            error={errors.typeRegimeId}
                                                        />
                                                    </div>

                                                    <div className="col-lg-4 col-md-12 col-sm-12 my-1">
                                                        <InputSelectModal
                                                            id="type-organization-id-company-edit"
                                                            label="Tipo de Organización"
                                                            name="typeOrganizationId"
                                                            options={typesOrganizations.map(type => ({
                                                                id: type.id,
                                                                label: type.name
                                                            }))}
                                                            value={company.typeOrganizationId}
                                                            onChange={(value) => {
                                                                setCompany({ ...company, typeOrganizationId: value })
                                                                setErrors({ ...errors, typeOrganizationId: '' })
                                                            }}
                                                            required
                                                            error={errors.typeOrganizationId}
                                                        />
                                                    </div>

                                                    <div className="col-lg-4 col-md-12 col-sm-12 my-1">
                                                        <InputSelectModal
                                                            id="withholdings-company-edit"
                                                            label="Tipo de Retenciones"
                                                            name="withholdings"
                                                            options={withholdings.map(withholding => ({
                                                                id: withholding.id,
                                                                label: withholding.name
                                                            }))}
                                                            value={company.withholdings || []}
                                                            onChange={(value) => {
                                                                setCompany({ ...company, withholdings: value || null })
                                                                setErrors({ ...errors, withholdings: '' })
                                                            }}
                                                            required
                                                            error={errors.withholdings}
                                                            multiple={true}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="row">
                                                    <div className="col-lg-4 col-md-12 col-sm-12 my-1">
                                                        <InputModal
                                                            id="legal-representative-company-edit"
                                                            label="Representante Legal"
                                                            name="legalRepresentative"
                                                            type="text"
                                                            value={company.legalRepresentative}
                                                            onChange={(e) => {
                                                                setCompany({ ...company, legalRepresentative: e.target.value })
                                                                setErrors({ ...errors, legalRepresentative: '' })
                                                            }}
                                                            required
                                                            error={errors.legalRepresentative}
                                                            placeholder="Ingrese el representante legal"
                                                        />
                                                    </div>

                                                    <div className="col-lg-4 col-md-12 col-sm-12 my-1">
                                                        <InputModal
                                                            id="email-company-edit"
                                                            label="Email"
                                                            name="email"
                                                            type="email"
                                                            value={company.email}
                                                            onChange={(e) => {
                                                                setCompany({ ...company, email: e.target.value })
                                                                setErrors({ ...errors, email: '' })
                                                            }}
                                                            required
                                                            error={errors.email}
                                                            placeholder="Ingrese el email"
                                                        />
                                                    </div>

                                                    <div className="col-lg-4 col-md-12 col-sm-12 my-1">
                                                        <InputModal
                                                            id="phone-company-edit"
                                                            label="Teléfono"
                                                            name="phone"
                                                            type="text"
                                                            value={company.phone}
                                                            onChange={(e) => {
                                                                setCompany({ ...company, phone: e.target.value.replace(/\D/g, '') })
                                                                setErrors({ ...errors, phone: '' })
                                                            }}
                                                            required
                                                            error={errors.phone}
                                                            placeholder="Ingrese el teléfono"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="row">
                                                    <div className="col my-1">
                                                        <InputDropFile
                                                            id="dropzone-logo-company-edit"
                                                            acceptedFiles={['image/*']}
                                                            label="Logo"
                                                            name="logo"
                                                            value={company.logo}
                                                            onChange={(file) => {
                                                                setCompany(prev => ({
                                                                    ...prev,
                                                                    logo: {
                                                                        name: file?.name || null,
                                                                        base64: file?.base64 || null
                                                                    }
                                                                }));
                                                                setErrors({ ...errors, logo: '' })
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="row">
                                                    <div className="col-12 my-2 d-flex justify-content-end">
                                                        <button type="button" className="btn btn-primary" onClick={handleSubmit}>Guardar</button>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="tab-pane fade" id="locations-company" role="tabpanel">

                                                <AlertPage
                                                    message={errorMessageLocation.message}
                                                    type={errorMessageLocation.type}
                                                    show={errorMessageLocation.show}
                                                    onChange={() => {
                                                        setErrorMessageLocation({
                                                            message: '',
                                                            type: '',
                                                            show: false
                                                        });
                                                    }}
                                                />

                                                <div className="row">
                                                    <div className="col-lg-4 col-md-12 col-sm-12 my-1">
                                                        <InputSelectModal
                                                            id="location-municipality-id-edit"
                                                            label="Estado"
                                                            name="municipalityId"
                                                            options={countries.map(country => {
                                                                return country.municipalities.map(municipality => ({
                                                                    id: municipality.id,
                                                                    label: `${country.code} - ${municipality.name}`
                                                                }))
                                                            }).flat()}
                                                            value={location.municipalityId}
                                                            onChange={(value) => {
                                                                setLocation((prev) => ({ ...prev, municipalityId: value }))
                                                                setErrors({ ...errors, municipalityId: '' })
                                                            }}
                                                            required
                                                            error={errors.municipalityId}
                                                        />
                                                    </div>

                                                    <div className="col-lg-4 col-md-12 col-sm-12 my-1">
                                                        <InputModal
                                                            id="location-address-edit"
                                                            label="Dirección"
                                                            name="address"
                                                            type="text"
                                                            value={location.address}
                                                            onChange={(e) => {
                                                                setLocation((prev) => ({ ...prev, address: e.target.value }))
                                                                setErrors({ ...errors, address: '' })
                                                            }}
                                                            required
                                                            error={errors.address}
                                                            placeholder="Ingrese la dirección"
                                                        />
                                                    </div>

                                                    <div className="col-lg-4 col-md-12 col-sm-12 my-1">
                                                        <InputModal
                                                            id="location-name-edit"
                                                            label="Nombre"
                                                            name="name"
                                                            type="text"
                                                            value={location.name}
                                                            onChange={(e) => {
                                                                setLocation((prev) => ({ ...prev, name: e.target.value }))
                                                                setErrors({ ...errors, name: '' })
                                                            }}
                                                            required
                                                            error={errors.name}
                                                            placeholder="Ingrese el nombre"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="row">
                                                    <div className="col-lg-4 col-md-12 col-sm-12 my-1">
                                                        <InputSelectModal
                                                            id="location-status-edit"
                                                            label="Estado"
                                                            name="status"
                                                            options={[{ id: 'ACTIVE', label: 'Activo' }, { id: 'INACTIVE', label: 'Inactivo' }]}
                                                            value={location.status}
                                                            onChange={(value) => {
                                                                setLocation((prev) => ({ ...prev, status: value }))
                                                            }}
                                                            required
                                                            error={errors.status}
                                                        />
                                                    </div>
                                                    <div className="col-lg-4 col-md-12 col-sm-12 my-1">
                                                        <InputSelectModal
                                                            id="location-is-main-edit" 
                                                            label="Es principal"
                                                            name="isMain"
                                                            options={[{ id: 'true', label: 'Si' }, { id: 'false', label: 'No' }]}
                                                            value={location.isMain}
                                                            onChange={(value) => {
                                                                setLocation((prev) => ({ ...prev, isMain: value }))
                                                            }}
                                                            required
                                                            error={errors.isMain}
                                                        />
                                                    </div>

                                                    <div className="col-lg-4 col-md-12 col-sm-12 my-1">
                                                        <button className="btn btn-primary" onClick={saveLocation}>
                                                            {location.id ? 'Actualizar' : 'Agregar'} ubicación
                                                        </button>
                                                    </div>
                                                </div>

                                                <hr />

                                                <div className="card-datatable text-nowrap">
                                                    <DataTableReference
                                                        url_api={null}
                                                        tableRef={tableLocationsRef}
                                                        dataTableRef={datatableLocationsRef}
                                                        columns={columns}
                                                        setData={setLocations}
                                                        buttons={[]}
                                                        data={locations}
                                                        // search={search}
                                                        // setSearch={setSearch}
                                                        // filtered={true}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>                               

                        </div>
                        <div className="modal-footer d-flex justify-content-start">
                            <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default EditCompany;