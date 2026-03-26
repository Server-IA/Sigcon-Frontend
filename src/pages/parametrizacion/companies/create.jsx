import { useEffect, useState } from "react";
import InputModal from "../../../components/molecules/InputModal";
import { base_url } from "../../../utils/functions";
import { fetchHelper } from "../../../utils/fetch";
import AlertPage from "../../../components/molecules/AlertPage";
import InputSelectModal from "../../../components/molecules/inputSelectModal";
import InputDropFile from "../../../components/molecules/InputDropFile";

const CreateCompany = ({
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

    const [errors, setErrors] = useState({});

    const [errorMessage, setErrorMessage] = useState({
        message: '',
        type: '',
        show: false
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if(!validateCompany()) return;

            const url = base_url(['api/v1/companies/store']);
            await fetchHelper.post(url, company, {}, 5000, false);

            dataTableRef?.current?.ajax.reload();
            modalInstance?.current?.hide();
            setErrors({});
            setErrorMessage({
                message: '',
                type: '',
                show: true
            });

            setMessage({
                message: 'Empresa creada correctamente',
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

    const validateCompany = () => {
        if(company.name && company.name.length < 3) {
            setErrors({ ...errors, name: 'El nombre debe tener al menos 3 caracteres' })
            return false;
        }else 
        if(company.name && company.name.length > 100) {
            setErrors({ ...errors, name: 'El nombre debe tener menos de 100 caracteres' })
            return false;
        }
        if(company.nit && !company.nit.match(/^\d{5,15}$/)) {
            setErrors({ ...errors, nit: 'El NIT debe tener entre 5 y 15 dígitos' })
            return false;
        }
        if(company.dv && !company.dv.match(/^\d{1}$/)) {
            setErrors({ ...errors, dv: 'El DV debe ser un dígito numérico' })
            return false;
        }   

        return true;
    }

    return (
        <div className="modal fade" ref={modalRef} id="modalCenter" tabIndex={-1} aria-hidden="true">
            <div className="modal-dialog modal-xl modal-dialog-centered" role="document">
                <div className="modal-content">
                    <div className="modal-header">
                        <h4 className="modal-title" id="modalCenterTitle">Agregar Empresa</h4>
                        <button
                            type="button"
                            className="btn-close"
                            data-bs-dismiss="modal"
                            aria-label="Close"></button>
                    </div>
                    <div className="modal-body">

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
                                    id="name-company-create"
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
                                    id="nit-company-create"
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
                                    id="dv-company-create"
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
                                    id="type-regime-id-company-create"
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
                                    id="type-organization-id-company-create"
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
                                    id="withholdings-company-create"
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
                                    id="legal-representative-company-create"
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
                                    id="email-company-create"
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
                                    id="phone-company-create"
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
                                    id="dropzone-logo-company-create"
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

                        <hr />

                        <div className="row">
                            <div className="col-lg-4 col-md-12 col-sm-12 my-1">
                                <InputSelectModal
                                    id="country-id-company-create"
                                    label="Ubicación"
                                    name="countryId"
                                    options={countries.map(country => {
                                        return country.municipalities.map(municipality => ({
                                            id: municipality.id,
                                            label: `${country.code} - ${municipality.name}`
                                        }))
                                    }).flat()}
                                    value={company.locations?.municipalityId}
                                    onChange={(value) => {
                                        setCompany({ ...company, locations: { ...company.locations, municipalityId: value } })
                                        setErrors({ ...errors, locations: { ...errors.locations, municipalityId: '' } })
                                    }}
                                    required
                                    error={errors.locations?.municipalityId}
                                />
                            </div>
                            <div className="col-lg-4 col-md-12 col-sm-12 my-1">
                                <InputModal
                                    id="address-company-create"
                                    label="Dirección"
                                    name="address"
                                    type="text"
                                    value={company?.locations?.address}
                                    onChange={(e) => {
                                        setCompany({ ...company, locations: { ...company.locations, address: e.target.value } })
                                        setErrors({ ...errors, locations: { ...errors.locations, address: '' } })
                                    }}
                                    required
                                    error={errors.locations?.address}
                                    placeholder="Ingrese la dirección"
                                />
                            </div>
                            <div className="col-lg-4 col-md-12 col-sm-12 my-1">
                                <InputModal
                                    id="name-company-create"
                                    label="Nombre de la sede"
                                    name="sede"
                                    type="text"
                                    value={company.locations?.name}
                                    onChange={(e) => {
                                        setCompany({ ...company, locations: { ...company.locations, name: e.target.value } })
                                        setErrors({ ...errors, locations: { ...errors.locations, name: '' } })
                                    }}
                                    required
                                    error={errors.locations?.name}
                                    placeholder="Ingrese la sede"
                                />
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
    );
};

export default CreateCompany;