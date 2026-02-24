import Switch from "../atoms/Switch";

const SubPermissionRow = ({
    title,
    permissions,
    onToggle
}) => {
    return (
        <div className="row g-0 mb-3">
            <div className="col-4">
                <span className="text-muted">{title}</span>
            </div>

            <div className="col-8">
                <div className="row g-0">
                    {["ver", "crear", "editar", "eliminar"].map((action) => (
                        <div key={action} className="col-3 text-center">
                            <label className="me-2 text-muted">
                                {action.charAt(0).toUpperCase() + action.slice(1)}
                            </label>
                            <Switch
                                checked={permissions[action]}
                                onChange={() => onToggle(action)}
                            />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default SubPermissionRow;
