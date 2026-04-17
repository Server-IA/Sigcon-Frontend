import PermissionHeader from "../molecules/PermissionHeader";
import ModuleRow from "../molecules/ModuleRow";
import SubPermissionRow from "../molecules/SubPermissionRow";

const PermissionsPanel = ({
    permissions,
    onToggleAll,
    onToggleModule,
    onToggleExpand,
    onToggleSubPermission
}) => {
    return (
        <div className="permissions-container" style={{ maxHeight: "500px", overflowY: "auto" }}>
            <PermissionHeader
                checked={permissions.all}
                onToggle={onToggleAll}
            />

            {Object.entries(permissions.modules).map(([key, module]) => (
                <ModuleRow
                    key={key}
                    title={module.label}
                    expanded={module.expanded}
                    enabled={module.enabled}
                    onToggleExpand={() => onToggleExpand(key)}
                    onToggleModule={() => onToggleModule(key)}
                >
                    {Object.entries(module.submodules).map(([subKey, subModule]) => (
                        <SubPermissionRow
                            key={subKey}
                            title={subModule.label}
                            permissions={subModule}
                            onToggle={(action) =>
                                onToggleSubPermission(key, subKey, action)
                            }
                        />
                    ))}
                </ModuleRow>
            ))}
        </div>
    );
};

export default PermissionsPanel;
