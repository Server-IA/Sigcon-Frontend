import Switch from '../atoms/Switch';

const PermissionHeader = ({ checked, onToggle }) => {
    return (
        <div className="row g-0 border-bottom">
            <div className="col-8 p-3">
                <h6 className="mb-0">Todos los permisos</h6>
            </div>
            <div className="col-4 p-3 text-end">
                <Switch checked={checked} onChange={onToggle} />
            </div>
        </div>
    );
};

export default PermissionHeader;
