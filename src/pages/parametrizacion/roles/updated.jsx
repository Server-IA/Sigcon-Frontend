import '../../../styles/vendor/animate-css/animate.css'
import { base_url, chunkArray } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';
import { useEffect, useState } from 'react';
import { usePermissions } from '../../../utils/hooks/usePermissions';

import InputModal from "../../../components/molecules/InputModal";
import InputSelectModal from "../../../components/molecules/inputSelectModal";
import AlertPage from '../../../components/molecules/AlertPage';

const UpdatedRole = ({ modalRef, modalInstance, role, setRole, dataTableRef, setMessageRole, modules }) => {

    // QA Bloque BF (2026-05-17): refresca effectivePermissions del admin actual
    // tras guardar cambios al rol. Si el admin modifica un rol que tiene
    // asignado (caso comun: admin edita el rol BASE que comparte con otros),
    // los botones condicionales en la UI se re-renderizan inmediato sin
    // necesidad de logout/login.
    const { refresh: refreshPerms } = usePermissions();

    const [errors, setErrors] = useState({});
    const [errorMessage, setErrorMessage] = useState('');
    const [allModulesPermissions, setAllModulesPermissions] = useState([]);
    const [roleUpdated, setRoleUpdated] = useState({
        name: role.name,
        description: role.description || '',
        status: role.status,
        permissionIds: role.permissionIds.map(id => parseInt(id))
    });

    // QA Bloque PA Bug 6: misma logica que en create.jsx para filtrar
    // permisos del modulo Plataforma cuando NO es PLATFORM_ADMIN.
    const userRaw = (() => {
        try { return JSON.parse(localStorage.getItem('user') || '{}'); }
        catch { return {}; }
    })();
    const isPlatformAdmin = !!(userRaw.platformRole === 'PLATFORM_ADMIN'
        || (userRaw.roles || []).includes('PLATFORM_ADMIN'));

    const filterApplicableModules = (mods) => {
        if (isPlatformAdmin) return mods;
        return (mods || []).filter(m => {
            const moduleName = (m.module?.name || '').toUpperCase();
            const moduleUrl = (m.module?.url || '').toLowerCase();
            return moduleName !== 'PLATAFORMA' && moduleName !== 'PLATFORM' && moduleUrl !== 'platform';
        }).map(m => ({
            ...m,
            permissions: (m.permissions || []).filter(p => {
                const code = (p.code || p.name || '').toUpperCase();
                return !code.startsWith('PLATFORM_') && !code.includes('PLATFORM_ADMIN');
            })
        })).filter(m => m.permissions && m.permissions.length > 0);
    };

    useEffect(() => {
        const filtered = filterApplicableModules(modules);
        setAllModulesPermissions(filtered.map(m => ({
            ...m,
            checked: m.permissions.length == role.permissionIds.length && role.permissionIds.length > 0
        })));
    }, [modules]);

    // QA Bloque PA Bug 5 (HU-PA-05 E2): el nombre de un rol PREDEFINIDO no se
    // puede modificar. El backend lo valida pero la UI debe ponerlo en
    // readonly como senial visual.
    const isPredefined = (role.type || '').toUpperCase() === 'PREDEFINED';

    // QA Parametrización (2026-06-04) Bug 3: se ELIMINÓ el efecto que recalculaba
    // role.permissionIds a partir de los flags `module.checked`. Ese efecto hacía
    // que al activar "Seleccionar todos" de UN módulo se descartaran los permisos
    // individuales de los OTROS módulos (sobreescribía toda la lista con los
    // permisos de los módulos marcados). Ahora la única fuente de verdad de la
    // selección es `roleUpdated.permissionIds`: los checkboxes individuales y el
    // switch "Seleccionar todos" la modifican directamente, cada uno tocando SOLO
    // los ids de su propio módulo.

    useEffect(() => {
        setRoleUpdated({
            id: role.id,
            status: role.status,
            name: role.name,
            description: role.description || '',
            permissionIds: role.permissionIds,
        });
        setErrors({});
        setErrorMessage('');
    }, [role]);

    // QA Bloque PA Bug 8 (HU-PA-05 E3, 2026-05-09): antes de guardar, calcular
    // diff entre permisos originales (role.permissionIds) y nuevos
    // (roleUpdated.permissionIds) y mostrar resumen visual con SweetAlert2.
    // Tambien envia version para optimistic locking (Bug 9, HU-PA-05 E4).
    const buildPermissionMap = () => {
        const map = {};
        (modules || []).forEach(m => {
            (m.permissions || []).forEach(p => {
                map[p.id] = (m.module?.name ? m.module.name + ' / ' : '') + (p.name || '#' + p.id);
            });
        });
        return map;
    };

    const handleUpdatedRole = async () => {
        try {
            const original = new Set((role.permissionIds || []).map(Number));
            const updated  = new Set((roleUpdated.permissionIds || []).map(Number));
            const toAdd    = [...updated].filter(id => !original.has(id));
            const toRemove = [...original].filter(id => !updated.has(id));
            const nameChanged = role.name !== roleUpdated.name;
            const descChanged = (role.description || '') !== (roleUpdated.description || '');
            const statusChanged = role.status !== roleUpdated.status;
            const hasChanges = toAdd.length || toRemove.length || nameChanged || descChanged || statusChanged;

            // Confirmacion con diff: solo si hubo cambios. Si no, ir directo.
            if (hasChanges) {
                const permMap = buildPermissionMap();
                const fmt = ids => ids.length === 0 ? '<li class="text-muted">— ninguno —</li>'
                    : ids.slice(0, 10).map(id => `<li>${permMap[id] || '#' + id}</li>`).join('')
                      + (ids.length > 10 ? `<li class="text-muted">… y ${ids.length - 10} más</li>` : '');
                const usuariosAfectados = role.assignedUsersCount || 0;
                const html = `
                    <div class="text-start" style="max-height: 50vh; overflow-y: auto;">
                        ${nameChanged ? `<p><strong>Nombre:</strong> <span class="text-danger">${role.name}</span> → <span class="text-success">${roleUpdated.name}</span></p>` : ''}
                        ${descChanged ? `<p><strong>Descripción:</strong> "${role.description || ''}" → "${roleUpdated.description || ''}"</p>` : ''}
                        ${statusChanged ? `<p><strong>Estado:</strong> ${role.status} → ${roleUpdated.status}</p>` : ''}
                        <p class="mb-1"><strong class="text-success">Permisos a agregar (${toAdd.length}):</strong></p>
                        <ul style="font-size: 0.9em;">${fmt(toAdd)}</ul>
                        <p class="mb-1"><strong class="text-danger">Permisos a remover (${toRemove.length}):</strong></p>
                        <ul style="font-size: 0.9em;">${fmt(toRemove)}</ul>
                        <hr/>
                        <p class="mb-0"><strong>Usuarios afectados:</strong> ${usuariosAfectados}</p>
                        ${usuariosAfectados > 0 ? '<p class="text-muted small mb-0">Estos usuarios verán los nuevos permisos en su próxima petición sin necesidad de re-loguearse.</p>' : ''}
                    </div>
                `;
                const confirmed = await window.Swal.fire({
                    title: 'Confirmar cambios al rol',
                    html,
                    icon: 'question',
                    showCancelButton: true,
                    confirmButtonText: 'Sí, guardar cambios',
                    cancelButtonText: 'Cancelar',
                    width: '600px'
                });
                if (!confirmed.isConfirmed) return;
            }

            const url = base_url(['roles', 'updateRole', role.id]);
            // HU-PA-05 E4: enviar version para optimistic lock
            const payload = { ...roleUpdated, version: role.version };
            await fetchHelper.put(url, payload, {}, 1000);

            setRole({
                id: '', name: '', description: '', type: '', status: '', permissionIds: [],
            });
            setRoleUpdated({
                id: '', name: '', description: '', status: '', permissionIds: [],
            });
            dataTableRef?.current?.ajax.reload();
            modalInstance?.current?.hide();
            setMessageRole({
                message: 'Rol actualizado exitosamente',
                type: 'success',
                show: true,
            });
            setErrors({});
            setErrorMessage('');
            // QA Bloque BF (2026-05-17): si el admin edito un rol que el comparte,
            // refrescar sus propios effectivePermissions para que los botones
            // condicionales se re-rendericen inmediato. El refresh es defensivo
            // (no rompe si falla porque el rol no era suyo).
            try { await refreshPerms(); } catch (_) { /* ignore */ }
        } catch (error) {
            console.error('Error al actualizar rol:', error);
            // HU-PA-05 E4: 409 conflict
            if (error?.status === 409) {
                setErrorMessage(error.msg || 'Este rol fue modificado por otro usuario. Recarga los datos y vuelve a intentarlo.');
                return;
            }
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
        console.log("Modulos", modules);
    }, [modules]);

    return (
        <div className="modal fade" ref={modalRef} id="modalCenter" tabIndex={-1} aria-hidden="true">
            <div className="modal-dialog modal-lg modal-simple modal-dialog-centered modal-add-new-role">
                <div className="modal-content">
                    <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>

                    {/* Body */}
                    <div className="modal-body">
                        <div className="text-center mb-6">
                            <h4 className="role-title mb-2 pb-0">Editar Rol</h4>
                            <p>Asigna permisos al rol</p>
                        </div>

                        {/* Error */}
                        <AlertPage message={errorMessage} type="danger" show={errorMessage !== ''} onChange={() => setErrorMessage('')} />

                        <div className="row">
                            <div className="col-lg-6 col-md-12 col-sm-12 mb-6 mt-2">
                                <InputModal
                                    id="name_update"
                                    label={isPredefined ? "Nombre del rol (predefinido, no editable)" : "Nombre del rol"}
                                    value={roleUpdated.name}
                                    onChange={(e) => {
                                        if (isPredefined) return;
                                        setRoleUpdated({ ...roleUpdated, name: e.target.value });
                                    }}
                                    error={errors.name}
                                    placeholder="Nombre del rol"
                                    required={true}
                                    readOnly={isPredefined}
                                    disabled={isPredefined}
                                />
                            </div>
                            <div className="col-lg-6 col-md-12 col-sm-12 mb-6 mt-2">
                                <InputSelectModal
                                    id="status_update"
                                    label="Estado del rol"
                                    value={roleUpdated.status}
                                    onChange={(value) => setRoleUpdated({ ...roleUpdated, status: value })}
                                    error={errors.status}
                                    placeholder="Estado del rol"
                                    allowClear={false}
                                    options={[{ label: 'Activo', id: 'ACTIVE' }, { label: 'Inactivo', id: 'INACTIVE' }]}
                                />
                            </div>
                            {/* QA Bloque PA Bug 2: campo descripcion en edicion.
                                QA Bloque PA Bug 76 (HU-PA-05 E2, 2026-05-11):
                                la descripcion de roles predefinidos tambien es
                                readonly (igual que el nombre). Solo se puede
                                editar status + permisos. */}
                            <div className="col-12 mb-6 mt-2">
                                <InputModal
                                    id="description_update"
                                    label={isPredefined
                                        ? "Descripción (predefinido, no editable)"
                                        : "Descripción"}
                                    value={roleUpdated.description || ''}
                                    onChange={(e) => {
                                        if (isPredefined) return;
                                        setRoleUpdated({ ...roleUpdated, description: e.target.value });
                                    }}
                                    error={errors.description}
                                    placeholder="Breve descripción del rol (opcional)"
                                    required={false}
                                    readOnly={isPredefined}
                                    disabled={isPredefined}
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
                                            && moduleIds.every(id => roleUpdated.permissionIds.includes(id));

                                        return (
                                            <div className="accordion-item" key={`${module.module.id}-accordion-update`}>
                                                <h2 className="accordion-header">
                                                    <button
                                                    type="button"
                                                    className="accordion-button collapsed"
                                                    data-bs-toggle="collapse"
                                                    data-bs-target={`#${module.module.id}-accordion-update`}
                                                    aria-expanded="false">
                                                        {module.module.name}
                                                    </button>
                                                </h2>

                                                <div id={`${module.module.id}-accordion-update`} className="accordion-collapse collapse" data-bs-parent="#accordionStyle1">
                                                    <div className="accordion-body">
                                                        <label className="switch switch-primary">
                                                            <input
                                                                type="checkbox"
                                                                className="switch-input"
                                                                checked={moduleAllChecked}
                                                                id={`${module.module.id}-permission-update`}
                                                                onChange={() => setRoleUpdated(prev => {
                                                                    const set = new Set(prev.permissionIds);
                                                                    if (moduleAllChecked) moduleIds.forEach(id => set.delete(id));
                                                                    else moduleIds.forEach(id => set.add(id));
                                                                    return { ...prev, permissionIds: [...set] };
                                                                })}
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
                                                            <div className="row" key={`${module.module.id}-permissions-row-update-${index}`}>


                                                                {permission.map((p) => (
                                                                    <div className="col-6" key={`${p.id}-permission-update`}>
                                                                        <div className="form-check form-switch mb-2">
                                                                            <input
                                                                                className="form-check-input"
                                                                                type="checkbox"
                                                                                value={p.id}
                                                                                checked={roleUpdated.permissionIds.includes(p.id)}
                                                                                id={`${p.id}-permission-update`}
                                                                                onChange={(e) => setRoleUpdated({
                                                                                    ...roleUpdated,
                                                                                    permissionIds:
                                                                                        roleUpdated.permissionIds.includes(p.id) ?
                                                                                            roleUpdated.permissionIds.filter(id => id !== p.id)
                                                                                            : [...roleUpdated.permissionIds, p.id] })}
                                                                            />
                                                                            <label className="form-check-label" htmlFor={`${p.id}-permission-update`}>
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
                            onClick={handleUpdatedRole}
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

export default UpdatedRole;