import '../../../styles/vendor/animate-css/animate.css'
import { base_url, chunkArray } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';
import { useEffect, useState } from 'react';

import InputModal from "../../../components/molecules/InputModal";
import InputSelectModal from "../../../components/molecules/inputSelectModal";
import AlertPage from '../../../components/molecules/AlertPage';



// ============================================
// Componente principal
// ============================================
const CreateRole = ({ modalRef, modalInstance, role, setRole, dataTableRef, setMessageRole, modules }) => {

    const [errors, setErrors] = useState({});
    const [errorMessage, setErrorMessage] = useState('');
    const [allModulesPermissions, setAllModulesPermissions] = useState([]);

    // QA Bloque PA Bug 6 (HU-PA-04 E6, 2026-05-09): los permisos del modulo
    // "Plataforma" NO aplican a roles custom de empresa. Solo PLATFORM_ADMIN
    // puede crear/editar roles globales que los incluyan. Para el ADMIN_EMPRESA
    // se ocultan visualmente del modal.
    const userRaw = (() => {
        try { return JSON.parse(localStorage.getItem('user') || '{}'); }
        catch { return {}; }
    })();
    const isPlatformAdmin = !!(userRaw.platformRole === 'PLATFORM_ADMIN'
        || (userRaw.roles || []).includes('PLATFORM_ADMIN'));

    // Tambien filtramos permisos cuyo code contiene 'PLATFORM' o son del modulo Plataforma
    const filterApplicableModules = (mods) => {
        if (isPlatformAdmin) return mods;
        return (mods || []).filter(m => {
            const moduleName = (m.module?.name || '').toUpperCase();
            const moduleUrl = (m.module?.url || '').toLowerCase();
            // Excluir modulos PLATAFORMA / PLATFORM (son admin del sistema)
            return moduleName !== 'PLATAFORMA' && moduleName !== 'PLATFORM' && moduleUrl !== 'platform';
        }).map(m => ({
            ...m,
            // Ademas filtrar permisos individuales con prefijo PLATFORM_ o cuyo nombre
            // sugiera "no aplica" (ej. acciones no soportadas en el submodulo)
            permissions: (m.permissions || []).filter(p => {
                const code = (p.code || p.name || '').toUpperCase();
                return !code.startsWith('PLATFORM_') && !code.includes('PLATFORM_ADMIN');
            })
        })).filter(m => m.permissions && m.permissions.length > 0);
    };

    useEffect(() => {
        const filtered = filterApplicableModules(modules);
        setAllModulesPermissions(filtered.map(m => ({ ...m, checked: false })));
    }, [modules]);

    // QA Parametrización (2026-06-04) Bug 3: se ELIMINÓ el efecto que recalculaba
    // role.permissionIds desde los flags `module.checked`. Hacía que "Seleccionar
    // todos" de un módulo descartara los permisos individuales de los demás. La
    // única fuente de verdad es `role.permissionIds`; los checkboxes individuales y
    // el switch "Seleccionar todos" la modifican directamente tocando SOLO los ids
    // de su propio módulo.

    const handleCreateRole = async () => {
        console.log("Role to create", role);
        try {
            const url = base_url(['roles', 'createRole']);
            const response = await fetchHelper.post(url, role, {}, 1000);

            setRole({
                id: '',
                name: '',
                description: '',
                type: '',
                status: '',
                permissionIds: [],
            })

            dataTableRef?.current?.ajax.reload();
            modalInstance?.current?.hide();
            setMessageRole({
                message: 'Rol creado exitosamente',
                type: 'success',
                show: true,
            });
            setErrors({});
            setErrorMessage('');
        } catch (error) {
            console.error('Error al crear rol:', error);
            const errores = error?.errors;
            if (errores && errores.length > 0) {
                const fieldErrors = {};
                errores.forEach(err => { fieldErrors[err.field] = err.message; });
                setErrors(fieldErrors);
            } else if (error?.msg) {
                setErrorMessage(error.msg);
            }
        }
    };

    useEffect(() => {
        setErrors({});
        setErrorMessage('');
    }, [role]);

    return (
        <div className="modal fade" ref={modalRef} id="modalCenter" tabIndex={-1} aria-hidden="true">
            <div className="modal-dialog modal-lg modal-simple modal-dialog-centered modal-add-new-role">
                <div className="modal-content">
                    <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>

                    {/* Body */}
                    <div className="modal-body p-0">
                        <div className="text-center mb-6">
                            <h4 className="role-title mb-2 pb-0">Crear Rol</h4>
                            <p>Asigna permisos al rol</p>
                        </div>

                        {/* Error */}
                        <AlertPage message={errorMessage} type="danger" show={errorMessage !== ''} onChange={() => setErrorMessage('')} />

                        <div className="row">
                            <div className="col-md-6 mb-6 mt-2">
                                <InputModal
                                    id="name"
                                    label="Nombre del rol"
                                    value={role.name}
                                    onChange={(e) => setRole({ ...role, name: e.target.value })}
                                    error={errors.name}
                                    placeholder="Nombre del rol"
                                    required={true}
                                />
                            </div>
                            {/* QA Bloque PA Bug 2 (HU-PA-03 E1) - descripcion del rol */}
                            <div className="col-md-6 mb-6 mt-2">
                                <InputModal
                                    id="description"
                                    label="Descripción"
                                    value={role.description || ''}
                                    onChange={(e) => setRole({ ...role, description: e.target.value })}
                                    error={errors.description}
                                    placeholder="Breve descripción del rol (opcional)"
                                    required={false}
                                />
                            </div>
                        </div>

                        <div className="col-12">
                            <h5 className="mb-2">Permisos del rol</h5>
                            <div className="col-md mb-5">
                                <div className="accordion mt-4 accordion-header-primary" id="accordionStyle1">
                                    {allModulesPermissions.map((module) => {

                                        const permissionsModule = chunkArray(module.permissions, 2);

                                        // QA Parametrización (2026-06-04) Bug 3: "Seleccionar todos" SOLO
                                        // agrega/quita los permisos de ESTE módulo, sin tocar los demás.
                                        const moduleIds = module.permissions.map(p => p.id);
                                        const moduleAllChecked = moduleIds.length > 0
                                            && moduleIds.every(id => role.permissionIds.includes(id));

                                        return (
                                            <div className="accordion-item" key={`${module.module.id}-accordion`}>
                                                
                                                <h2 className="accordion-header">
                                                    <button
                                                    type="button"
                                                    className="accordion-button collapsed"
                                                    data-bs-toggle="collapse"
                                                    data-bs-target={`#${module.module.id}-accordion`}
                                                    aria-expanded="false">
                                                        {module.module.name}
                                                        {/* <input
                                                            type="checkbox"
                                                            checked={module.permissions.every(p => role.permissionIds.includes(p.id))}
                                                            onChange={(e) => setRole({
                                                                ...role,
                                                                permissionIds: module.permissions.map(p => p.id)
                                                            })}
                                                        />
                                                        <label className="form-check-label" htmlFor={`${module.module.id}-permissions-all`}>
                                                            Check all
                                                        </label> */}
                                                    </button>
                                                </h2>

                                                <div id={`${module.module.id}-accordion`} className="accordion-collapse collapse" data-bs-parent="#accordionStyle1">
                                                    <div className="accordion-body">
                                                        <label className="switch switch-primary">
                                                            <input
                                                                type="checkbox"
                                                                className="switch-input"
                                                                value={module.module.id}
                                                                checked={moduleAllChecked}
                                                                id={`${module.module.id}-permission`}
                                                                onChange={() => {
                                                                    const set = new Set(role.permissionIds);
                                                                    if (moduleAllChecked) moduleIds.forEach(id => set.delete(id));
                                                                    else moduleIds.forEach(id => set.add(id));
                                                                    setRole({ ...role, permissionIds: [...set] });
                                                                }}
                                                            />
                                                            <span className="switch-toggle-slider">
                                                                <span className="switch-on">
                                                                    <i className="ri-check-line"></i>
                                                                </span>
                                                                <span className="switch-off">
                                                                    <i className="ri-close-line"></i>
                                                                </span>
                                                            </span>
                                                            <span className="switch-label">Seleccionar todos</span>
                                                        </label>
                                                        <hr />
                                                        {permissionsModule.map((permission, index) => (
                                                            <div className="row" key={`${module.module.id}-permissions-row-${index}`}>
                                                                {permission.map((p, i) => (
                                                                    <div className="col-6" key={`${p.id}-permission-${i}`}>
                                                                        <div className="form-check form-switch mb-2">
                                                                            <input
                                                                                className="form-check-input"
                                                                                type="checkbox"
                                                                                value={p.id}
                                                                                checked={role.permissionIds.includes(p.id)}
                                                                                id={`${p.id}-permission-${i}`}
                                                                                onChange={(e) => {
                                                                                    setRole({
                                                                                        ...role,
                                                                                        permissionIds:
                                                                                            role.permissionIds.includes(p.id) ?
                                                                                                role.permissionIds.filter(id => id !== p.id)
                                                                                                : [...role.permissionIds, p.id]
                                                                                    })
                                                                                    console.log("Role", role, "Permission", p.id);
                                                                                }}
                                                                            />
                                                                            <label className="form-check-label" htmlFor={`${p.id}-permission-${i}`}>
                                                                                {p.name}
                                                                            </label>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* Footer */}
                    <div className="modal-footer justify-content-start">
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={handleCreateRole}
                        >
                            Guardar
                        </button>
                        <button type="button" className="btn btn-danger ms-auto" data-bs-dismiss="modal">
                            Cerrar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreateRole;