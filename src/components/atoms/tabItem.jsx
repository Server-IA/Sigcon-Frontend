const TabItem = ({
    label,
    active = false,
    onClick,
    disabled = false
}) => {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={`tab-item ${active ? "active" : ""}`}
        >
            {label}
        </button>
    );
};

export default TabItem;
