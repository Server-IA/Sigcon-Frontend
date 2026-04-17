const Switch = ({
    checked = false,
    onChange,
    disabled = false
}) => {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            disabled={disabled}
            onClick={() => onChange && onChange(!checked)}
            className={`switch ${checked ? "checked" : ""}`}
        >
            <span className="switch-thumb" />
        </button>
    );
};

export default Switch;
