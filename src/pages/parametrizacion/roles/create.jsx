import '../../../styles/vendor/animate-css/animate.css'
import { base_url } from '../../../utils/functions';
import { fetchHelper } from '../../../utils/fetch';
import { useEffect, useState } from 'react';

import InputModal from "../../../components/molecules/InputModal";
import InputSelectModal from "../../../components/molecules/inputSelectModal";

// ============================================
// Configuración de módulos con IDs de permisos
// ============================================
const MODULE_CONFIG = {
    'listas-contables': {
        label: 'Listas contables',
        submodules: {
            'listas-contables': {
                label: 'Listas contables',
                permissionIds: { ver: 1, crear: 2, editar: 3, eliminar: 4 }
            }
        }
    },
    'terceros': {
        label: 'Terceros',
        submodules: {
            'terceros': {
                label: 'Terceros',
                permissionIds: { ver: 5, crear: 6, editar: 7, eliminar: 8 }
            }
        }
    },
    'bancos-cajas': {
        label: 'Bancos y cajas',
        submodules: {
            'cuentas-bancarias': {
                label: 'Cuentas bancarias',
                permissionIds: { ver: 9, crear: 10, editar: 11, eliminar: 12 }
            },
            'cajas': {
                label: 'Cajas',
                permissionIds: { ver: 13, crear: 14, editar: 15, eliminar: 16 }
            }
        }
    },
    'cuentas-por-cobrar': {
        label: 'Cuentas por cobrar',
        submodules: {
            'cuentas-por-cobrar': {
                label: 'Cuentas por cobrar',
                permissionIds: { ver: 17, crear: 18, editar: 19, eliminar: 20 }
            }
        }
    },
    'cuentas-por-pagar': {
        label: 'Cuentas por pagar',
        submodules: {
            'cuentas-por-pagar': {
                label: 'Cuentas por pagar',
                permissionIds: { ver: 21, crear: 22, editar: 23, eliminar: 24 }
            }
        }
    },
    'activos': {
        label: 'Activos',
        submodules: {
            'activos': {
                label: 'Activos',
                permissionIds: { ver: 25, crear: 26, editar: 27, eliminar: 28 }
            }
        }
    }
};

const PERMISSION_TYPES = ['ver', 'crear', 'editar', 'eliminar'];

// ============================================
// Helpers
// ============================================
const buildInitialPermissions = () => {
    const modules = {};
    Object.keys(MODULE_CONFIG).forEach(key => {
        const submodules = {};
        Object.keys(MODULE_CONFIG[key].submodules).forEach(subKey => {
            submodules[subKey] = { ver: false, crear: false, editar: false, eliminar: false };
        });
        modules[key] = { enabled: false, expanded: false, submodules };
    });
    return { all: false, modules };
};

const getPermissionIdsFromState = (permissions) => {
    const ids = [];
    Object.keys(permissions.modules).forEach(moduleKey => {
        const mod = permissions.modules[moduleKey];
        Object.keys(mod.submodules).forEach(subKey => {
            const sub = mod.submodules[subKey];
            const config = MODULE_CONFIG[moduleKey].submodules[subKey];
            if (config?.permissionIds) {
                PERMISSION_TYPES.forEach(perm => {
                    if (sub[perm] && config.permissionIds[perm]) {
                        ids.push(config.permissionIds[perm]);
                    }
                });
            }
        });
    });
    return ids;
};

// ============================================
// Componente principal
// ============================================
const CreateRole = ({ modalRef, modalInstance, role, setRole, dataTableRef, setRoleCreate }) => {

    const [errors, setErrors] = useState({});
    const [errorMessage, setErrorMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [activeTab, setActiveTab] = useState('crear');
    const [permissions, setPermissions] = useState(buildInitialPermissions());

    const initialState = { id: '', name: '', status: '' };

    // --- Handlers de permisos ---
    const handleToggleAll = () => {
        const newValue = !permissions.all;
        const newPermissions = { all: newValue, modules: {} };
        Object.keys(permissions.modules).forEach(moduleKey => {
            const submodules = {};
            Object.keys(permissions.modules[moduleKey].submodules).forEach(subKey => {
                submodules[subKey] = { ver: newValue, crear: newValue, editar: newValue, eliminar: newValue };
            });
            newPermissions.modules[moduleKey] = {
                enabled: newValue,
                expanded: permissions.modules[moduleKey].expanded,
                submodules
            };
        });
        setPermissions(newPermissions);
    };

    const handleToggleModule = (moduleKey) => {
        const newValue = !permissions.modules[moduleKey].enabled;
        const newPermissions = { ...permissions, modules: { ...permissions.modules } };
        const submodules = {};
        Object.keys(permissions.modules[moduleKey].submodules).forEach(subKey => {
            submodules[subKey] = { ver: newValue, crear: newValue, editar: newValue, eliminar: newValue };
        });
        newPermissions.modules[moduleKey] = {
            enabled: newValue,
            expanded: permissions.modules[moduleKey].expanded,
            submodules
        };
        setPermissions(newPermissions);
    };

    const handleToggleExpand = (moduleKey) => {
        setPermissions(prev => ({
            ...prev,
            modules: {
                ...prev.modules,
                [moduleKey]: {
                    ...prev.modules[moduleKey],
                    expanded: !prev.modules[moduleKey].expanded
                }
            }
        }));
    };

    const handleToggleSubPermission = (moduleKey, submoduleKey, permType) => {
        const newPermissions = { ...permissions, modules: { ...permissions.modules } };
        const mod = { ...newPermissions.modules[moduleKey], submodules: { ...newPermissions.modules[moduleKey].submodules } };
        const sub = { ...mod.submodules[submoduleKey] };
        sub[permType] = !sub[permType];
        mod.submodules[submoduleKey] = sub;
        mod.enabled = Object.values(mod.submodules).some(s => s.ver || s.crear || s.editar || s.eliminar);
        newPermissions.modules[moduleKey] = mod;
        setPermissions(newPermissions);
    };

    // --- Submit ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setErrors({});
        setErrorMessage('');

        const permissionIds = getPermissionIdsFromState(permissions);
        const body = {
            name: role.name,
            permissionIds: permissionIds
        };

        try {
            const url = base_url(['roles', 'createRole']);
            await fetchHelper.post(url, body, {}, 1000);
            setRole(initialState);
            setPermissions(buildInitialPermissions());
            setActiveTab('crear');
            dataTableRef?.current?.ajax.reload();
            modalInstance?.current?.hide();
            setRoleCreate(true);
            setErrors({});
            setErrorMessage('');
        } catch (error) {
            console.error('Error al guardar rol:', error);
            const errores = error?.errors;
            if (errores && errores.length > 0) {
                const fieldErrors = {};
                errores.forEach(err => { fieldErrors[err.field] = err.message; });
                setErrors(fieldErrors);
            } else if (error?.msg) {
                setErrorMessage(error.msg);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClear = () => {
        setRole(initialState);
        setPermissions(buildInitialPermissions());
        setErrors({});
        setErrorMessage('');
        setActiveTab('crear');
    };

    useEffect(() => {
        setErrors({});
        setErrorMessage('');
    }, [role]);

    return (
        <div className="modal fade" ref={modalRef} id="modalCenter" tabIndex={-1} aria-hidden="true">
            <div className="modal-dialog modal-dialog-centered modal-lg" role="document">
                <div className="modal-content">

                    {/* Header */}
                    <div className="modal-header">
                        <h4 className="modal-title fw-bold">Crear Rol</h4>
                        <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>

                    {/* Body */}
                    <div className="modal-body">
                        {/* Error */}
                        <div className={`alert alert-danger alert-dismissible ${errorMessage === '' ? 'd-none' : ''}`} role="alert">
                            <button type="button" className="btn-close" onClick={() => setErrorMessage('')} aria-label="Close"></button>
                            <span>{errorMessage}</span>
                        </div>

                        {/* Tabs */}
                        <ul className="nav nav-tabs mb-3" role="tablist">
                            <li className="nav-item">
                                <button
                                    type="button"
                                    className={`nav-link ${activeTab === 'crear' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('crear')}
                                >
                                    Crear
                                </button>
                            </li>
                            <li className="nav-item">
                                <button
                                    type="button"
                                    className={`nav-link ${activeTab === 'permisos' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('permisos')}
                                >
                                    Permisos
                                </button>
                            </li>
                        </ul>

                        {/* Tab: Crear */}
                        <div className={`${activeTab === 'crear' ? '' : 'd-none'}`}>
                            <div className="row g-4">
                                <div className="col-12">
                                    <label htmlFor="name_create" className="form-label">
                                        Nombre <span className="text-danger">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        id="name_create"
                                        className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                                        placeholder="EJ: Contador, Tesorero"
                                        value={role.name}
                                        onChange={(e) => setRole({ ...role, name: e.target.value })}
                                    />
                                    {errors.name && <div className="invalid-feedback">{errors.name}</div>}
                                </div>

                                <div className="col-12">
                                    <label htmlFor="status_create" className="form-label">
                                        Estado <span className="text-danger">*</span>
                                    </label>
                                    <select
                                        id="status_create"
                                        className={`form-select ${errors.status ? 'is-invalid' : ''}`}
                                        value={role.status}
                                        onChange={(e) => setRole({ ...role, status: e.target.value })}
                                    >
                                        <option value="">Seleccione</option>
                                        <option value="ACTIVE">Activo</option>
                                        <option value="INACTIVE">Inactivo</option>
                                    </select>
                                    {errors.status && <div className="invalid-feedback">{errors.status}</div>}
                                </div>
                            </div>
                        </div>

                        {/* Tab: Permisos */}
                        <div className={`${activeTab === 'permisos' ? '' : 'd-none'}`}>
                            <div style={{ maxHeight: '450px', overflowY: 'auto' }}>

                                {/* Todos los permisos */}
                                <div className="d-flex align-items-center justify-content-between py-3 border-bottom">
                                    <span className="fw-bold">Todos los permisos</span>
                                    <div className="form-check form-switch mb-0">
                                        <input
                                            className="form-check-input"
                                            type="checkbox"
                                            checked={permissions.all}
                                            onChange={handleToggleAll}
                                            style={{ cursor: 'pointer' }}
                                        />
                                    </div>
                                </div>

                                {/* Módulos */}
                                {Object.keys(MODULE_CONFIG).map(moduleKey => {
                                    const config = MODULE_CONFIG[moduleKey];
                                    const mod = permissions.modules[moduleKey];
                                    const subKeys = Object.keys(config.submodules);
                                    const hasMultipleSubs = subKeys.length > 1;

                                    return (
                                        <div key={moduleKey} className="border-bottom">
                                            {/* Header del módulo */}
                                            <div className="d-flex align-items-center justify-content-between py-3">
                                                <div
                                                    className="d-flex align-items-center"
                                                    style={{ cursor: 'pointer' }}
                                                    onClick={() => handleToggleExpand(moduleKey)}
                                                >
                                                    <i className={`ri-arrow-${mod.expanded ? 'down' : 'right'}-s-line me-2`}
                                                        style={{ fontSize: '1.1rem', color: '#6c757d' }}
                                                    ></i>
                                                    <span className="fw-semibold">{config.label}</span>
                                                </div>
                                                <div className="form-check form-switch mb-0">
                                                    <input
                                                        className="form-check-input"
                                                        type="checkbox"
                                                        checked={mod.enabled}
                                                        onChange={() => handleToggleModule(moduleKey)}
                                                        style={{ cursor: 'pointer' }}
                                                    />
                                                </div>
                                            </div>

                                            {/* Submódulos expandidos */}
                                            {mod.expanded && (
                                                <div className="ps-4 pb-3">
                                                    {subKeys.map(subKey => {
                                                        const sub = mod.submodules[subKey];
                                                        const subConfig = config.submodules[subKey];

                                                        return (
                                                            <div key={subKey} className={`d-flex align-items-center ${hasMultipleSubs ? 'mb-2' : ''}`}>
                                                                {hasMultipleSubs && (
                                                                    <span className="text-muted me-auto" style={{ fontSize: '0.875rem', minWidth: '140px' }}>
                                                                        {subConfig.label}
                                                                    </span>
                                                                )}
                                                                <div className={`d-flex align-items-center ${!hasMultipleSubs ? 'ms-auto' : ''}`} style={{ gap: '1rem' }}>
                                                                    {PERMISSION_TYPES.map(perm => (
                                                                        <div key={perm} className="form-check form-switch mb-0 d-flex align-items-center" style={{ gap: '0.25rem' }}>
                                                                            <input
                                                                                className="form-check-input"
                                                                                type="checkbox"
                                                                                checked={sub[perm]}
                                                                                onChange={() => handleToggleSubPermission(moduleKey, subKey, perm)}
                                                                                style={{ cursor: 'pointer' }}
                                                                            />
                                                                            <label className="form-check-label text-muted" style={{ fontSize: '0.8125rem', cursor: 'pointer' }}>
                                                                                {perm.charAt(0).toUpperCase() + perm.slice(1)}
                                                                            </label>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="modal-footer justify-content-start">
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Guardando...' : 'Guardar'}
                        </button>
                        <button type="button" className="btn btn-outline-secondary" onClick={handleClear}>
                            Limpiar
                        </button>
                        <button type="button" className="btn btn-danger ms-auto" data-bs-dismiss="modal">
                            Volver
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreateRole;