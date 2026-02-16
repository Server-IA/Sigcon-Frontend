import { Link, useLocation } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";

import { buildFullPath } from "../../utils/map_menu";

const ItemMenu = ({ item, parentPath = "" }) => {
    const location = useLocation();
    const hasChildren = item.childrens?.length > 0;

    const [isOpen, setIsOpen] = useState(false);
    const [isActive, setIsActive] = useState(false);

    const rawPath = item?.path ?? item?.url ?? "";

    const itemPath = useMemo(
        () => buildFullPath(parentPath, rawPath).replace(/^\//, ""),
        [parentPath, rawPath]
    );

    const cleanLocation = location.pathname.replace(/^\//, "");
    const cleanItemPath = itemPath.replace(/^\//, "");

    useEffect(() => {
        setIsActive(cleanLocation === cleanItemPath);
        setIsOpen(hasChildren && isPathActive(item, parentPath, cleanLocation));
    }, [cleanLocation, cleanItemPath, hasChildren, item, parentPath]);

    // const isActive = cleanLocation === cleanItemPath;
    // const isOpen =
    //     hasChildren &&
    //     isPathActive(item, parentPath, cleanLocation);

    return (

        <>
            {item.id == 0 ? (
                
                <li className={`menu-item ${isActive ? "active" : ""}`}>
                    <Link
                        to={itemPath}
                        className={`menu-link `}
                    >
                        <i className={`menu-icon tf-icons ${item.icon || "ri-arrow-drop-right-line"}`}></i>
                        <div>{item?.name || item.label}</div>
                    </Link>
                </li>
            ) : (
                <li className={`menu-item ${isOpen ? "open" : ""} ${isActive ? "active" : ""}`}>
                    <Link
                        to={itemPath}
                        className={`menu-link ${hasChildren ? "menu-toggle" : ""}`}
                    >
                        <i className={`menu-icon tf-icons ${item.icon || "ri-arrow-drop-right-line"}`}></i>
                        <div>{item?.name || item.label}</div>
                    </Link>

                    {hasChildren && (
                        <ul className="menu-sub">
                            {item.childrens.map(child => (
                                <ItemMenu
                                    key={child.id}
                                    item={child}
                                    parentPath={cleanItemPath}
                                />
                            ))}
                        </ul>
                    )}
                </li>
            )}
        </>

    );
};

const isPathActive = (item, parentPath, currentPath) => {
    const rawPath = item.path ?? item.url ?? "";
    const fullPath = buildFullPath(parentPath, rawPath).replace(/^\//, "");

    if (fullPath === currentPath) return true;

    if (!item.childrens?.length) return false;

    return item.childrens.some(child =>
        isPathActive(child, fullPath, currentPath)
    );
};

export const hasActiveChild = (item, parentPath) => {
    if (!item.childrens?.length) return false;
    const location = useLocation();

    return item.childrens.some(child => {
        const childPath = buildFullPath(parentPath, child.path ?? child.url);
        return (
            location.pathname === childPath ||
            hasActiveChild(child, childPath.replace(/^\//, ""), item)
        );
    });
};


export default ItemMenu;
