import Switch from '../atoms/Switch';

const ModuleRow = ({
    title,
    expanded,
    enabled,
    onToggleExpand,
    onToggleModule,
    children
}) => {
    return (
        <div className="border-bottom">
            <div className="row g-0">
                <div className="col-8 p-3">
                    <i
                        className={`ri-arrow-${expanded ? "down" : "right"}-s-line me-2`}
                        style={{ cursor: "pointer" }}
                        onClick={onToggleExpand}
                    />
                    <span>{title}</span>
                </div>
                <div className="col-4 p-3 text-end">
                    <Switch checked={enabled} onChange={onToggleModule} />
                </div>
            </div>

            {expanded && <div className="ps-5 pb-3">{children}</div>}
        </div>
    );
};

export default ModuleRow;
