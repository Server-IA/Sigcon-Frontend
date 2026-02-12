import { useState } from "react";

const DropdownButton = ({
    label = "Active",
    options = [],
    onSelect,
    variant = "primary",
    disabled = false
}) => {
    const [isOpen, setIsOpen] = useState(false);

    const handleToggle = () => {
        if (!disabled) {
            setIsOpen(!isOpen);
        }
    };

    const handleSelect = (option) => {
        onSelect && onSelect(option);
        setIsOpen(false);
    };

    return (
        <div className="dropdown">
            <button
                type="button"
                className={`btn btn-${variant}`}
                onClick={handleToggle}
                disabled={disabled}
            >
                {label} <span className="arrow">{isOpen ? "▲" : "▼"}</span>
            </button>

            {isOpen && (
                <div className="dropdown-menu">
                    {options.map((option, index) => (
                        <div
                            key={index}
                            className="dropdown-item"
                            onClick={() => handleSelect(option)}
                        >
                            {option}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default DropdownButton;
